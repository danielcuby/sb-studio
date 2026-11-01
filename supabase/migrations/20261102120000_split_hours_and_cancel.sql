-- Several working blocks per day (e.g. 10:00–12:00, 15:00–16:00, 20:00–00:00), one-off hours for
-- specific dates, 3 hours' notice for online bookings, and customers cancelling their own booking
-- (until 24 hours before) with the private link they get when they book.

-- "HH:mm" → minutes since midnight. "24:00" = 1440 (midnight as a closing time).
create or replace function public.hhmm_minutes(t text)
returns int
language sql
immutable
set search_path = ''
as $$
  select split_part(t, ':', 1)::int * 60 + split_part(t, ':', 2)::int;
$$;

-- A valid list of working blocks: [{"open":"10:00","close":"12:00"}, ...]. Each closes after it opens,
-- blocks don't overlap, at most 8 a day. An empty list means closed.
create or replace function public.valid_ranges(r jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_prev int := -1;
  v_item jsonb;
begin
  if jsonb_typeof(r) <> 'array' or jsonb_array_length(r) > 8 then
    return false;
  end if;
  for v_item in select value from jsonb_array_elements(r) order by value ->> 'open' loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'open', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
      or coalesce(v_item ->> 'close', '') !~ '^(([01]\d|2[0-3]):[0-5]\d|24:00)$'
      or public.hhmm_minutes(v_item ->> 'close') <= public.hhmm_minutes(v_item ->> 'open')
      or public.hhmm_minutes(v_item ->> 'open') < v_prev then
      return false;
    end if;
    v_prev := public.hhmm_minutes(v_item ->> 'close');
  end loop;
  return true;
end;
$$;

-- Weekly hours: one list of blocks per weekday instead of a single open/close time.
alter table public.opening_hours add column ranges jsonb not null default '[]'::jsonb;
update public.opening_hours
set ranges = case
  when open_time is null then '[]'::jsonb
  else jsonb_build_array(jsonb_build_object('open', to_char(open_time, 'HH24:MI'), 'close', to_char(close_time, 'HH24:MI')))
end;
alter table public.opening_hours drop column open_time, drop column close_time;
alter table public.opening_hours add constraint opening_hours_ranges_valid check (public.valid_ranges(ranges));

-- Hours for one specific date, replacing that weekday's usual hours. An empty list = closed that day.
create table public.date_hours (
  date date primary key,
  ranges jsonb not null default '[]'::jsonb check (public.valid_ranges(ranges)),
  updated_at timestamptz not null default now()
);

alter table public.date_hours enable row level security;
create policy "anyone reads date hours" on public.date_hours for select to anon, authenticated using (true);
create policy "admins add date hours" on public.date_hours for insert to authenticated with check ((select public.is_admin()));
create policy "admins change date hours" on public.date_hours for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete date hours" on public.date_hours for delete to authenticated using ((select public.is_admin()));
grant select on public.date_hours to anon, authenticated;
grant insert, update, delete on public.date_hours to authenticated;

-- Working blocks on a date: its own hours if set, otherwise the weekday's.
create or replace function public.ranges_on(p_date date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select d.ranges from public.date_hours d where d.date = p_date),
    (select h.ranges from public.opening_hours h where h.weekday = extract(dow from p_date)::smallint),
    '[]'::jsonb
  );
$$;

-- Private cancel link per booking, and whether the customer cancelled it themselves.
alter table public.bookings
  add column cancel_token uuid not null default gen_random_uuid(),
  add column cancelled_by_customer boolean not null default false;
create unique index bookings_cancel_token_idx on public.bookings (cancel_token);

-- create_booking: checks the slot fits inside one block of that day's hours and is at least 3 hours away,
-- and now also returns the booking's cancel token.
drop function public.create_booking(text, text, numeric, int, timestamptz, text, text, text, text);
create function public.create_booking(
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
returns table (id uuid, cancel_token uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_end timestamptz := p_starts_at + make_interval(mins => p_duration_minutes);
  v_local timestamp := p_starts_at at time zone 'Europe/Gibraltar';
  v_start_min int := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  v_id uuid;
  v_token uuid;
begin
  -- The website offers times from 3 hours ahead; a few minutes' slack for the request in flight.
  if p_starts_at < now() + interval '170 minutes' then
    raise exception 'Slot is too soon' using errcode = '22023';
  end if;
  if p_starts_at > now() + interval '90 days' then
    raise exception 'Slot is too far ahead' using errcode = '22023';
  end if;
  if extract(minute from p_starts_at)::int % 5 <> 0 or extract(second from p_starts_at) <> 0 then
    raise exception 'Invalid start time' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(public.ranges_on(v_local::date)) as r
    where public.hhmm_minutes(r.value ->> 'open') <= v_start_min
      and v_start_min + p_duration_minutes <= public.hhmm_minutes(r.value ->> 'close')
  ) then
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
  returning bookings.id, bookings.cancel_token into v_id, v_token;

  return query select v_id, v_token;
end;
$$;

-- Public, with the private link: what is this booking? (For the cancel page.)
create or replace function public.get_booking_for_cancel(p_token uuid)
returns table (service_name text, starts_at timestamptz, duration_minutes int, price_gbp numeric, customer_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.service_name, b.starts_at, b.duration_minutes, b.price_gbp, b.customer_name, b.status
  from public.bookings b
  where b.cancel_token = p_token;
$$;

-- Public, with the private link: cancel the booking, if it's still at least 24 hours away.
create or replace function public.cancel_booking(p_token uuid)
returns table (customer_name text, service_name text, starts_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings b where b.cancel_token = p_token for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v.status <> 'confirmed' then
    raise exception 'Booking is not active' using errcode = '55000';
  end if;
  if v.starts_at < now() + interval '24 hours' then
    raise exception 'Too late to cancel online' using errcode = '22023';
  end if;
  update public.bookings b set status = 'cancelled', cancelled_by_customer = true where b.id = v.id;
  return query select v.customer_name, v.service_name, v.starts_at;
end;
$$;

revoke execute on function public.ranges_on(date) from public, anon, authenticated;
revoke execute on function public.create_booking(text, text, numeric, int, timestamptz, text, text, text, text) from public;
revoke execute on function public.get_booking_for_cancel(uuid) from public;
revoke execute on function public.cancel_booking(uuid) from public;
grant execute on function public.create_booking(text, text, numeric, int, timestamptz, text, text, text, text) to anon, authenticated;
grant execute on function public.get_booking_for_cancel(uuid) to anon, authenticated;
grant execute on function public.cancel_booking(uuid) to anon, authenticated;
