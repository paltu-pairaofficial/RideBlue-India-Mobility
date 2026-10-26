-- IMPORTANT: LEGACY API SCHEMA ONLY.
-- Do NOT run this file for the active root RideBlue app (server.ts + src/).
-- This file defines the incompatible bookings/driver_profiles model. The active app
-- uses profiles.user_id + drivers + rides and its numbered migrations under
-- src/supabase/migrations/. For an existing active Supabase project, use the guarded
-- forward reconciliation file at sql/reconciliation/rideblue_reconciliation_forward_03_07.sql
-- only after backing up and reviewing its preflight.

-- RideBlue Supabase PostgreSQL schema
-- Run this in the Supabase SQL Editor. Auth identities live in auth.users.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null,
  role text not null default 'rider' check (role in ('rider','driver','admin')),
  phone text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  phone text not null,
  licence_number text not null,
  vehicle_category text not null check (vehicle_category in ('economy','sedan','suv','xl','airport_transfer')),
  vehicle_make_model text not null,
  registration_number text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected','correction_required')),
  available boolean not null default false,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id),
  driver_id uuid references public.profiles(id),
  pickup text not null check (char_length(pickup) between 2 and 180),
  destination text not null check (char_length(destination) between 2 and 180),
  vehicle_category text not null check (vehicle_category in ('economy','sedan','suv','xl','airport_transfer')),
  requested_at timestamptz,
  passenger_count smallint not null default 1 check (passenger_count between 1 and 8),
  indicative_fare numeric(10,2),
  fare_currency text not null default 'INR',
  status text not null default 'requested' check (status in ('requested','accepted','driver_assigned','in_progress','completed','cancelled','rejected')),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lower(pickup) <> lower(destination))
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  category text not null default 'other' check (category in ('booking','account','driver','payment','other')),
  subject text not null check (char_length(subject) between 3 and 120),
  description text not null check (char_length(description) between 10 and 3000),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_admin uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists passenger_count smallint not null default 1 check (passenger_count between 1 and 8);

-- Keep category and verification values aligned with the approved product specification.
-- Drop/re-add named constraints so rerunning this schema also upgrades older starter schemas.
alter table public.driver_profiles drop constraint if exists driver_profiles_vehicle_category_check;
alter table public.driver_profiles drop constraint if exists driver_profiles_verification_status_check;
alter table public.bookings drop constraint if exists bookings_vehicle_category_check;
update public.driver_profiles set vehicle_category = 'economy' where vehicle_category = 'mini';
update public.bookings set vehicle_category = 'economy' where vehicle_category = 'mini';
alter table public.driver_profiles add constraint driver_profiles_vehicle_category_check
  check (vehicle_category in ('economy','sedan','suv','xl','airport_transfer'));
alter table public.driver_profiles add constraint driver_profiles_verification_status_check
  check (verification_status in ('pending','approved','rejected','correction_required'));
alter table public.bookings add constraint bookings_vehicle_category_check
  check (vehicle_category in ('economy','sedan','suv','xl','airport_transfer'));

create index if not exists bookings_rider_created_idx on public.bookings(rider_id, created_at desc);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists driver_profiles_verification_idx on public.driver_profiles(verification_status);
create index if not exists support_tickets_owner_created_idx on public.support_tickets(owner_id, created_at desc);

-- Create a profile automatically for a newly created Supabase Auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''), split_part(new.email,'@',1)),
    coalesce(new.email,''),
    'rider'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists driver_profiles_updated_at on public.driver_profiles;
create trigger driver_profiles_updated_at before update on public.driver_profiles for each row execute procedure public.set_updated_at();
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings for each row execute procedure public.set_updated_at();
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute procedure public.set_updated_at();

-- RLS is mandatory for user-owned data.
alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.support_tickets enable row level security;

-- Profiles: users may read their own profile; role/status must only be changed by a trusted operator.
drop policy if exists "profile select own" on public.profiles;
create policy "profile select own" on public.profiles for select to authenticated using (id = (select auth.uid()));
-- Profile role/status are intentionally not client-updatable. Use a trusted server/operator process.

-- Driver profile owner can read/insert/update their own onboarding record.
drop policy if exists "driver profile own select" on public.driver_profiles;
create policy "driver profile own select" on public.driver_profiles for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "driver profile own insert" on public.driver_profiles;
create policy "driver profile own insert" on public.driver_profiles for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'driver')
  and verification_status = 'pending'
  and available = false
);
drop policy if exists "driver profile own update" on public.driver_profiles;
create policy "driver profile own update" on public.driver_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'driver')
  and verification_status = 'pending'
  and available = false
);

-- Rider sees only own bookings. Insert requires the authenticated user as rider and requested status.
drop policy if exists "rider own bookings select" on public.bookings;
create policy "rider own bookings select" on public.bookings for select to authenticated
using (rider_id = (select auth.uid()) or driver_id = (select auth.uid()));
drop policy if exists "rider create own booking" on public.bookings;
create policy "rider create own booking" on public.bookings for insert to authenticated
with check (rider_id = (select auth.uid()) and driver_id is null and status = 'requested');

-- Do not grant broad row updates to riders. Cancellation is performed through a
-- narrow RPC so callers cannot edit pickup, destination, driver, or fare fields.
drop policy if exists "rider cancel own booking" on public.bookings;
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default '')
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_booking public.bookings;
begin
  update public.bookings b
  set status = 'cancelled',
      cancellation_reason = left(coalesce(p_reason, ''), 500)
  where b.id = p_booking_id
    and b.rider_id = auth.uid()
    and b.status in ('requested', 'accepted')
  returning b.* into cancelled_booking;
  return cancelled_booking;
end;
$$;
revoke all on function public.cancel_booking(uuid, text) from public;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

drop policy if exists "ticket owner select" on public.support_tickets;
create policy "ticket owner select" on public.support_tickets for select to authenticated
using (owner_id = (select auth.uid()));
drop policy if exists "ticket owner create" on public.support_tickets;
create policy "ticket owner create" on public.support_tickets for insert to authenticated
with check (owner_id = (select auth.uid()) and status = 'open');

-- Do not add a public admin policy. Admin actions are performed through server-side
-- role-checked routes, with service-role credentials kept only on the server if needed.
