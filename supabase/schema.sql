-- ClearParcel — real backend schema (Supabase / Postgres).
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query → paste → Run). Safe to re-run: every statement is guarded so a
-- second run is a no-op instead of an error.
--
-- After running this, sign up through the live site once with the email
-- you want as your master account, then run the snippet at the bottom of
-- this file to flip that account to admin.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles — one row per real account (consumer or builder), keyed to
-- Supabase Auth's own auth.users table.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('consumer','builder')),
  is_admin boolean not null default false,
  name text not null,
  email text not null,
  state text,
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- lot_checks — a consumer's saved Lot Check reports.
-- ---------------------------------------------------------------------
create table if not exists public.lot_checks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  report_id text not null,
  report_params text not null,
  report jsonb not null,
  budget_fit jsonb,
  submitted_at timestamptz not null default now(),
  unique (account_id, report_id)
);

-- ---------------------------------------------------------------------
-- renovation_checks — a consumer's saved Renovation Check runs.
-- ---------------------------------------------------------------------
create table if not exists public.renovation_checks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  state text not null,
  home_age text not null,
  budget numeric not null,
  scope jsonb not null,
  estimate jsonb not null,
  submitted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- renovation_listings — open renovation jobs posted for contractor bids.
-- ---------------------------------------------------------------------
create table if not exists public.renovation_listings (
  id uuid primary key default gen_random_uuid(),
  consumer_account_id uuid not null references public.profiles(id) on delete cascade,
  consumer_name text not null,
  consumer_email text not null,
  consumer_phone text not null,
  state text not null,
  home_age text not null,
  budget numeric not null,
  scope jsonb not null,
  estimate jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- connection_leads — a buyer explicitly connecting with a member builder
-- from a Lot Check report (Report.tsx → ConnectWithBuilders).
-- ---------------------------------------------------------------------
create table if not exists public.connection_leads (
  id uuid primary key default gen_random_uuid(),
  builder_account_id uuid not null references public.profiles(id) on delete cascade,
  buyer_account_id uuid not null references public.profiles(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  status text not null default 'new' check (status in ('new','contacted','bid_sent','won','lost')),
  report_id text not null,
  report jsonb not null,
  budget_fit jsonb,
  builder_estimate jsonb,
  created_at timestamptz not null default now(),
  unique (builder_account_id, report_id)
);

-- ---------------------------------------------------------------------
-- bids — contractor bids on either a lot-check report or a renovation
-- listing.
-- ---------------------------------------------------------------------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('lot-check','renovation')),
  target_id text not null,
  builder_account_id uuid not null references public.profiles(id) on delete cascade,
  builder_name text not null,
  price_low numeric not null,
  price_high numeric not null,
  estimated_weeks int not null,
  message text not null default '',
  submitted_at timestamptz not null default now(),
  accepted boolean not null default false,
  unique (target_type, target_id, builder_account_id)
);

-- ---------------------------------------------------------------------
-- direct_quotes — a builder sending a specific dollar quote straight to a
-- consumer by email, with no existing lead/listing required (a lead that
-- came from outside the app — a phone call, a referral). Matched by email
-- at read time, so it still reaches them once they have a ClearParcel account
-- with that email, even if they didn't have one yet when it was sent.
-- ---------------------------------------------------------------------
create table if not exists public.direct_quotes (
  id uuid primary key default gen_random_uuid(),
  builder_account_id uuid not null references public.profiles(id) on delete cascade,
  builder_name text not null,
  consumer_email text not null,
  consumer_name text not null,
  amount numeric not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Auto-create a profiles row the instant someone signs up, straight off
-- auth.users — this runs server-side (security definer) inside the same
-- transaction as the signup, so it works whether or not "Confirm email"
-- is turned on and never races the client. Role/name/state/trial dates
-- are passed in as auth signUp() metadata (see src/lib/profile.ts).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email, state, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'consumer'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'state',
    nullif(new.raw_user_meta_data->>'trial_ends_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.lot_checks enable row level security;
alter table public.renovation_checks enable row level security;
alter table public.renovation_listings enable row level security;
alter table public.connection_leads enable row level security;
alter table public.bids enable row level security;
alter table public.direct_quotes enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- profiles: everyone can see their own row; admins see every row; builder
-- rows are also visible to any signed-in user (the public builder
-- directory used on the Report and Renovation Check pages).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin()
    or (role = 'builder' and auth.uid() is not null)
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- lot_checks: owner + admin only.
drop policy if exists lot_checks_select on public.lot_checks;
create policy lot_checks_select on public.lot_checks
  for select using (account_id = auth.uid() or public.is_admin());

drop policy if exists lot_checks_insert on public.lot_checks;
create policy lot_checks_insert on public.lot_checks
  for insert with check (account_id = auth.uid());

drop policy if exists lot_checks_update on public.lot_checks;
create policy lot_checks_update on public.lot_checks
  for update using (account_id = auth.uid());

-- renovation_checks: owner + admin only.
drop policy if exists renovation_checks_select on public.renovation_checks;
create policy renovation_checks_select on public.renovation_checks
  for select using (account_id = auth.uid() or public.is_admin());

drop policy if exists renovation_checks_insert on public.renovation_checks;
create policy renovation_checks_insert on public.renovation_checks
  for insert with check (account_id = auth.uid());

-- renovation_listings: owner, admin, or any builder serving that state
-- (the contractor jobs board).
drop policy if exists renovation_listings_select on public.renovation_listings;
create policy renovation_listings_select on public.renovation_listings
  for select using (
    consumer_account_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'builder' and p.state = renovation_listings.state
    )
  );

drop policy if exists renovation_listings_insert on public.renovation_listings;
create policy renovation_listings_insert on public.renovation_listings
  for insert with check (consumer_account_id = auth.uid());

-- connection_leads: the builder who received it, the buyer who sent it,
-- or admin.
drop policy if exists connection_leads_select on public.connection_leads;
create policy connection_leads_select on public.connection_leads
  for select using (
    builder_account_id = auth.uid() or buyer_account_id = auth.uid() or public.is_admin()
  );

drop policy if exists connection_leads_insert on public.connection_leads;
create policy connection_leads_insert on public.connection_leads
  for insert with check (buyer_account_id = auth.uid());

drop policy if exists connection_leads_update on public.connection_leads;
create policy connection_leads_update on public.connection_leads
  for update using (builder_account_id = auth.uid() or public.is_admin());

-- bids: the bidding builder, the target's owner (buyer/homeowner), any
-- builder who can already see the target (has a connection lead on that
-- lot check, or serves the state a renovation listing is in), or admin.
drop policy if exists bids_select on public.bids;
create policy bids_select on public.bids
  for select using (
    builder_account_id = auth.uid()
    or public.is_admin()
    or (
      target_type = 'lot-check' and exists (
        select 1 from public.lot_checks lc
        where lc.report_id = bids.target_id and lc.account_id = auth.uid()
      )
    )
    or (
      target_type = 'lot-check' and exists (
        select 1 from public.connection_leads cl
        where cl.report_id = bids.target_id and cl.builder_account_id = auth.uid()
      )
    )
    or (
      target_type = 'renovation' and exists (
        select 1 from public.renovation_listings rl
        where rl.id::text = bids.target_id
          and (
            rl.consumer_account_id = auth.uid()
            or exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.role = 'builder' and p.state = rl.state
            )
          )
      )
    )
  );

drop policy if exists bids_insert on public.bids;
create policy bids_insert on public.bids
  for insert with check (builder_account_id = auth.uid());

drop policy if exists bids_update on public.bids;
create policy bids_update on public.bids
  for update using (
    builder_account_id = auth.uid()
    or public.is_admin()
    or (
      target_type = 'lot-check' and exists (
        select 1 from public.lot_checks lc
        where lc.report_id = bids.target_id and lc.account_id = auth.uid()
      )
    )
    or (
      target_type = 'renovation' and exists (
        select 1 from public.renovation_listings rl
        where rl.id::text = bids.target_id and rl.consumer_account_id = auth.uid()
      )
    )
  );

-- direct_quotes: the builder who sent it, or the consumer it was sent to
-- (matched by their own profile email), or admin.
drop policy if exists direct_quotes_select on public.direct_quotes;
create policy direct_quotes_select on public.direct_quotes
  for select using (
    builder_account_id = auth.uid()
    or public.is_admin()
    or consumer_email = (select p.email from public.profiles p where p.id = auth.uid())
  );

drop policy if exists direct_quotes_insert on public.direct_quotes;
create policy direct_quotes_insert on public.direct_quotes
  for insert with check (builder_account_id = auth.uid());

-- ---------------------------------------------------------------------
-- One-time: promote your own account to admin. Sign up on the live site
-- first (as either a consumer or a builder — either works), THEN run
-- this with your real email:
-- ---------------------------------------------------------------------
-- update public.profiles set is_admin = true where email = 'you@example.com';
