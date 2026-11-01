-- Weekly opening hours that Shlomo edits in /admin, and phone push notifications for new bookings.

-- One row per weekday (0 = Sunday). No open/close time = closed that day.
create table public.opening_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  open_time time,
  close_time time,
  updated_at timestamptz not null default now(),
  check ((open_time is null) = (close_time is null)),
  check (open_time is null or close_time > open_time)
);

-- Defaults match src/config/site.ts: Mon–Sat 10:00–19:00, closed Sunday.
insert into public.opening_hours (weekday, open_time, close_time) values
  (0, null, null),
  (1, '10:00', '19:00'),
  (2, '10:00', '19:00'),
  (3, '10:00', '19:00'),
  (4, '10:00', '19:00'),
  (5, '10:00', '19:00'),
  (6, '10:00', '19:00');

alter table public.opening_hours enable row level security;
-- Opening hours are public information.
create policy "anyone reads hours" on public.opening_hours for select to anon, authenticated using (true);
create policy "admins change hours" on public.opening_hours for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.opening_hours to anon, authenticated;
grant update on public.opening_hours to authenticated;

-- Browser push subscriptions of admins' devices.
create table public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy "admins manage own devices" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()))
  with check (user_id = (select auth.uid()) and (select public.is_admin()));
grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;

-- The website server reads subscriptions to send a notification. Instead of the full secret key,
-- it proves itself with a single-purpose secret stored here (set with `npm run push:setup`).
create table public.app_secrets (
  name text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

create or replace function public.get_push_subscriptions(p_secret text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.app_secrets s where s.name = 'push' and s.value = p_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query select p.endpoint, p.p256dh, p.auth from public.push_subscriptions p;
end;
$$;

-- Lets the server drop a device whose subscription has expired.
create or replace function public.remove_push_subscription(p_secret text, p_endpoint text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.app_secrets s where s.name = 'push' and s.value = p_secret) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.get_push_subscriptions(text) from public;
revoke execute on function public.remove_push_subscription(text, text) from public;
grant execute on function public.get_push_subscriptions(text) to anon, authenticated;
grant execute on function public.remove_push_subscription(text, text) to anon, authenticated;

-- create_booking now also checks the slot is within opening hours (Gibraltar time).
create or replace function public.create_booking(
  p_service_id text,
  p_service_name text,
  p_price_gbp numeric,
  p_duration_minutes int,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_end timestamptz := p_starts_at + make_interval(mins => p_duration_minutes);
  v_local timestamp := p_starts_at at time zone 'Europe/Gibraltar';
  v_hours public.opening_hours;
  v_id uuid;
begin
  if p_starts_at < now() then
    raise exception 'Slot is in the past' using errcode = '22023';
  end if;
  if p_starts_at > now() + interval '90 days' then
    raise exception 'Slot is too far ahead' using errcode = '22023';
  end if;
  if extract(minute from p_starts_at)::int % 5 <> 0 or extract(second from p_starts_at) <> 0 then
    raise exception 'Invalid start time' using errcode = '22023';
  end if;

  select * into v_hours from public.opening_hours where weekday = extract(dow from v_local)::smallint;
  if v_hours.open_time is null
    or v_local::time < v_hours.open_time
    or (v_local + make_interval(mins => p_duration_minutes))::time > v_hours.close_time
    or (v_local + make_interval(mins => p_duration_minutes))::date <> v_local::date then
    raise exception 'Outside opening hours' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.blocked_times t where t.starts_at < v_end and t.ends_at > p_starts_at
  ) then
    raise exception 'Slot is not available' using errcode = '23P01';
  end if;

  insert into public.bookings (
    service_id, service_name, price_gbp, duration_minutes, starts_at, ends_at,
    customer_name, customer_phone, customer_email, notes, source
  ) values (
    p_service_id, p_service_name, p_price_gbp, p_duration_minutes, p_starts_at, v_end,
    btrim(p_name), btrim(p_phone), nullif(btrim(p_email), ''), nullif(btrim(p_notes), ''), 'online'
  )
  returning id into v_id;

  return v_id;
end;
$$;
