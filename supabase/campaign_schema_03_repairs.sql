-- Alpha Vault — Campaign & Rewards: production repair
-- ======================================================
-- Run this ONCE in Supabase → SQL Editor, after confirming what your
-- `profiles` table actually looks like (see the diagnostic query below).
-- Safe to re-run: every step checks whether it's already been applied
-- before doing anything.
--
-- WHAT WENT WRONG, IN PLAIN TERMS:
-- The client-shared reference repo ("SubsGigs") uses different column names
-- for the same concepts our code uses: `x_username` instead of `x_handle`,
-- a boolean `is_admin` instead of a text `role`, and `verification_status`
-- instead of `status`. At some point that repo's own schema was applied to
-- this Supabase project directly, creating a `profiles` table shaped like
-- theirs. Alpha Vault's own campaign_schema.sql (Phase 1) uses
-- `create table if not exists` — which, when a table by that name ALREADY
-- exists (even with completely different columns), does nothing at all. So
-- Phase 1's real column definitions were silently skipped, while the SECOND
-- migration's `alter table ... add column if not exists` calls succeeded
-- fine (those don't check other columns), bolting banned_until/
-- total_earnings/etc. onto the mismatched table. Net result: a profiles
-- table with some Alpha Vault columns and some SubsGigs columns mixed
-- together, and none of our code's queries (which ask for x_handle/role/
-- status) match what's actually there.
--
-- THIS FILE FIXES THAT WITHOUT DESTROYING ANY REAL DATA:
-- Existing values are converted, not discarded — an existing `is_admin =
-- true` becomes `role = 'admin'`, an existing `verification_status =
-- 'verified'` becomes `status = 'approved'` (our equivalent word for the
-- same state), etc. Every step is written to be a no-op if it's already
-- been applied, so running this twice by accident causes no harm.

-- ---------------------------------------------------------------------------
-- STEP 0 — Run this first, on its own, to see exactly what you're starting
-- from. Compare the output against the "if renamed" logic below.
-- ---------------------------------------------------------------------------
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
-- order by ordinal_position;

-- ---------------------------------------------------------------------------
-- STEP 1 — x_username -> x_handle
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'x_username'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'x_handle'
  ) then
    alter table public.profiles rename column x_username to x_handle;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STEP 2 — is_admin (boolean) -> role (text: 'creator' | 'admin')
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles add column role text;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin'
    ) then
      update public.profiles set role = case when is_admin then 'admin' else 'creator' end;
    else
      update public.profiles set role = 'creator';
    end if;

    alter table public.profiles alter column role set default 'creator';
    alter table public.profiles alter column role set not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STEP 3 — verification_status -> status (text: 'pending' | 'approved' |
--          'rejected'). Note the VALUE mapping, not just the column rename:
--          SubsGigs calls the approved state "verified"; we call it
--          "approved". Same meaning, different word — converted here so
--          every RPC and page that checks status = 'approved' keeps working.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    alter table public.profiles add column status text;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'verification_status'
    ) then
      -- Cast to ::text before comparing. verification_status is a native
      -- Postgres ENUM type in the real database (not plain text, as first
      -- assumed) — its defined members are 'pending' / 'verified' /
      -- 'rejected' only. Comparing it directly against the string literal
      -- 'approved' makes Postgres try to interpret 'approved' AS that enum
      -- type first, which fails outright ("invalid input value for enum")
      -- since 'approved' was never one of its members. Casting the COLUMN
      -- to text instead means every comparison happens as plain text, so no
      -- enum coercion is ever attempted.
      update public.profiles set status = case
        when verification_status::text = 'verified' then 'approved'
        when verification_status::text in ('pending', 'rejected') then verification_status::text
        else 'pending'
      end;
    else
      update public.profiles set status = 'pending';
    end if;

    alter table public.profiles alter column status set default 'pending';
    alter table public.profiles alter column status set not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STEP 4 — drop the old columns, now that their data lives in the new ones.
-- Guarded so this only runs once both the new column exists AND the old one
-- still does — running this file again after the first successful pass is a
-- safe no-op.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_admin')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role')
  then
    alter table public.profiles drop column is_admin;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='verification_status')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='status')
  then
    alter table public.profiles drop column verification_status;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STEP 4b — ensure `email` exists. This was a genuine gap in the first
-- version of this repair file, not a re-check: the signup trigger
-- (handle_new_campaign_user, below) inserts an `email` value into profiles,
-- but nothing before this step ever confirmed that column actually exists on
-- the real table. It didn't — which is exactly what caused signups to keep
-- failing even after the x_handle/role/status reconciliation succeeded.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;

-- Backfill any existing rows (there shouldn't be any yet, since every
-- signup attempt has been failing and rolling back completely — but this is
-- safe and correct regardless) from auth.users, which always has it.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

alter table public.profiles alter column email set not null;

-- ---------------------------------------------------------------------------
-- STEP 5 — the constraints Phase 1 expected but never actually got applied
-- (since the original CREATE TABLE was skipped — see the file header).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_x_handle_key') then
    alter table public.profiles add constraint profiles_x_handle_key unique (x_handle);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('creator', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STEP 5b — (re)create is_admin(). IMPORTANT: this almost certainly never
-- successfully existed in your database at all. Unlike the plpgsql RPCs
-- elsewhere in this system (which Postgres doesn't validate against real
-- column names until they're actually CALLED), is_admin() is written in
-- plain SQL — and Postgres DOES validate a SQL-language function's column
-- references immediately, at CREATE time. With no `role` column to find
-- before Step 2 above ran, `CREATE FUNCTION is_admin()` would have failed
-- outright — which means every policy below that references it (on
-- profiles, campaigns, and campaign_entries) would ALSO have failed to be
-- created, cascading from that one missing function. This step, and the
-- ones after it, re-establish everything that was never actually applied.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select profile.role = 'admin' from public.profiles as profile where profile.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- STEP 5c — re-establish the campaigns/campaign_entries policies. Per the
-- note above, these depend on is_admin() and very likely never actually
-- existed — re-creating them is not redundant, it's completing work that
-- silently never finished the first time.
-- ---------------------------------------------------------------------------
alter table public.campaigns enable row level security;
alter table public.campaign_entries enable row level security;

drop policy if exists "campaigns_select_live_or_admin" on public.campaigns;
create policy "campaigns_select_live_or_admin"
  on public.campaigns for select
  to authenticated
  using (status = 'live' or public.is_admin());

drop policy if exists "campaigns_insert_admin" on public.campaigns;
create policy "campaigns_insert_admin"
  on public.campaigns for insert
  to authenticated
  with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "campaigns_update_admin" on public.campaigns;
create policy "campaigns_update_admin"
  on public.campaigns for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "campaign_entries_select_own_or_admin" on public.campaign_entries;
create policy "campaign_entries_select_own_or_admin"
  on public.campaign_entries for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.campaign_entries from anon, authenticated;
grant select, insert, update on table public.campaigns to authenticated;
grant select on table public.campaign_entries to authenticated;
-- columns it references. If SubsGigs' own trigger already exists under this
-- or a different name targeting the old columns, this replaces it outright.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_campaign_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, x_handle, email, role, status)
  values (
    new.id,
    new.raw_user_meta_data ->> 'x_handle',
    new.email,
    'creator',
    'pending'
  )
  on conflict (id) do nothing; -- defensive: never overwrite an already-seeded row
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_campaign on auth.users;
create trigger on_auth_user_created_campaign
  after insert on auth.users
  for each row execute function public.handle_new_campaign_user();

-- ---------------------------------------------------------------------------
-- STEP 7 — the "select own row" RLS policy needs to exist AND reference the
-- (now-correct) column names. Re-applying this is safe even if it's already
-- right, and cheap insurance if it isn't.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- STEP 8 — replace the flagged SECURITY DEFINER VIEW with a SECURITY
-- DEFINER FUNCTION instead. Same underlying need (a non-admin member has to
-- see accurate capacity counts across ALL entries, not just their own row,
-- which requires bypassing campaign_entries' own "select own or admin" RLS
-- policy for this one narrow, read-only, counts-only purpose) — but
-- Supabase's linter specifically flags security-definer VIEWS as high-risk
-- (their behavior is easy to overlook since a view doesn't visually announce
-- "this bypasses RLS" the way a function's `security definer` keyword does).
-- A function doing the exact same thing is the idiomatic, expected pattern
-- here — matching every other RPC in this system — and doesn't trip that
-- specific check.
-- ---------------------------------------------------------------------------
drop view if exists public.campaign_capacity;

create or replace function public.get_campaign_capacity(p_campaign_id uuid default null)
returns table (
  campaign_id uuid,
  occupied_entries integer,
  accepted_entries integer,
  spots_left integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    campaign.id as campaign_id,
    count(entry.id) filter (where entry.status in ('pending', 'accepted'))::integer as occupied_entries,
    count(entry.id) filter (where entry.status = 'accepted')::integer as accepted_entries,
    greatest(
      campaign.max_entries - count(entry.id) filter (where entry.status in ('pending', 'accepted'))::integer,
      0
    )::integer as spots_left
  from public.campaigns as campaign
  left join public.campaign_entries as entry on entry.campaign_id = campaign.id
  where (campaign.status = 'live' or public.is_admin())
    and (p_campaign_id is null or campaign.id = p_campaign_id)
  group by campaign.id, campaign.max_entries;
$$;

revoke all on function public.get_campaign_capacity(uuid) from public;
grant execute on function public.get_campaign_capacity(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- STEP 9 — confirm the repair worked. Should show x_handle/role/status and
-- NO x_username/is_admin/verification_status.
-- ---------------------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
