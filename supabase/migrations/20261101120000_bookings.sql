-- SB Studio booking system.
-- One chair: the database itself refuses two active bookings that overlap in time.

create extension if not exists btree_gist with schema extensions;

-- Admins: Supabase Auth users who may see and manage bookings. Add one with `npm run admin:add`.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  service_name text not null,
  price_gbp numeric(6, 2) not null check (price_gbp >= 0),
  duration_minutes int not null check (duration_minutes between 5 and 240),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (char_length(customer_phone) between 6 and 30),
  customer_email text check (customer_email is null or char_length(customer_email) <= 200),
  notes text check (notes is null or char_length(notes) <= 500),
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'no_show', 'cancelled')),
  source text not null default 'online' check (source in ('online', 'admin')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('confirmed', 'completed'))
);

create index bookings_starts_at_idx on public.bookings (starts_at);

-- Time Shlomo isn't taking bookings (holidays, breaks, appointments elsewhere).
create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index blocked_times_range_idx on public.blocked_times using gist (tstzrange(starts_at, ends_at, '[)'));

-- Helper for RLS. security definer so it can read admins without recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

alter table public.admins enable row level security;
alter table public.bookings enable row level security;
alter table public.blocked_times enable row level security;

create policy "admins read admins" on public.admins for select to authenticated using ((select public.is_admin()));

create policy "admins read bookings" on public.bookings for select to authenticated using ((select public.is_admin()));
create policy "admins add bookings" on public.bookings for insert to authenticated with check ((select public.is_admin()));
create policy "admins change bookings" on public.bookings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete bookings" on public.bookings for delete to authenticated using ((select public.is_admin()));

create policy "admins read blocked" on public.blocked_times for select to authenticated using ((select public.is_admin()));
create policy "admins add blocked" on public.blocked_times for insert to authenticated with check ((select public.is_admin()));
create policy "admins change blocked" on public.blocked_times for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete blocked" on public.blocked_times for delete to authenticated using ((select public.is_admin()));

-- Public: when is the chair busy? Returns only times, never who booked.
create or replace function public.get_busy_ranges(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.starts_at, b.ends_at
  from public.bookings b
  where b.status in ('confirmed', 'completed')
    and b.starts_at < p_to and b.ends_at > p_from
    and p_to - p_from <= interval '2 days'
  union all
  select t.starts_at, t.ends_at
  from public.blocked_times t
  where t.starts_at < p_to and t.ends_at > p_from
    and p_to - p_from <= interval '2 days';
$$;

-- Public: create a booking. The website checks opening hours and the service list first;
-- this function repeats the checks that matter for safety. Overlaps fail with error code 23P01.
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

-- Functions are executable by everyone by default; lock that down, then grant what's needed.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.get_busy_ranges(timestamptz, timestamptz) from public;
revoke execute on function public.create_booking(text, text, numeric, int, timestamptz, text, text, text, text) from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_busy_ranges(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.create_booking(text, text, numeric, int, timestamptz, text, text, text, text) to anon, authenticated;

-- The public can't touch the tables directly.
revoke all on public.bookings, public.blocked_times, public.admins from anon;
grant select, insert, update, delete on public.bookings, public.blocked_times to authenticated;
grant select on public.admins to authenticated;
