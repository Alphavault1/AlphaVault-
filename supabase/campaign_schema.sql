-- Alpha Vault — Campaign & Rewards: profiles table
-- =================================================
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
--
-- DESIGN NOTES (read before changing anything here):
--
-- 1. WHY A SEPARATE `profiles` TABLE, NOT JUST auth.users:
--    Supabase's own `auth.users` table is Supabase-managed and not something
--    we add arbitrary columns to. `profiles` is OUR table, linked 1:1 to it
--    (same id), holding everything specific to the campaign — x_handle,
--    role, status.
--
-- 2. WHY email IS DUPLICATED HERE (it already lives on auth.users):
--    `auth.users` sits in a protected schema that ordinary Postgres roles
--    (including our own service-role queries) can't casually join against the
--    way you'd join two public tables. Storing email on `profiles` too is the
--    standard, practical workaround — it's what lets the sign-in flow's
--    "x_handle -> email" lookup (see app/api/campaign/lookup-email) run as a
--    plain query against a public table.
--
-- 3. PROFILE CREATION HAPPENS VIA A TRIGGER, NOT CLIENT-SIDE INSERT:
--    When someone signs up, we pass their x_handle as Supabase Auth
--    "user metadata" (see SignUpModal). A trigger on auth.users then creates
--    the matching profiles row automatically, server-side, the moment the
--    auth user is created — regardless of whether email confirmation is
--    required before they can log in. Doing this client-side instead (call
--    signUp(), then separately INSERT a profiles row) has a real race/edge
--    case: if email confirmation is on, there's no session yet right after
--    signUp() returns, so an RLS-protected client insert would have nothing
--    to authenticate as. The trigger has none of that problem — it runs with
--    elevated privilege (SECURITY DEFINER) at the moment the row is created.
--
-- 4. WHY THERE'S NO "UPDATE OWN ROW" POLICY:
--    This is deliberate, not an oversight. If a signed-in creator could
--    UPDATE their own profiles row with no restriction, nothing would stop
--    them from setting their own `role` to 'admin' or `status` to 'approved'
--    — a straightforward privilege-escalation hole. Since nothing in Phase 1
--    actually needs a user to edit their own profile from the client, the
--    safe move is to not grant that capability at all yet, rather than build
--    a column-restricted version under time pressure. Approve/Reject
--    (Phase 2) will go through a service-role-backed admin route instead,
--    which is a separate, trusted path — not this policy.
--
-- 5. GRANTS ARE EXPLICIT, NOT ASSUMED — because we've been burned by this
--    exact gap before on this project (see supabase/grants_fix.sql from the
--    applications table): RLS and table-level GRANTs are two separate
--    permission layers in Postgres. A role can be fully allowed by every RLS
--    policy and still get "permission denied for table" if it was never
--    GRANTed base access to the table at all. This file grants explicitly
--    from the start instead of waiting to hit that bug a second time.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  x_handle   text not null unique,
  email      text not null,
  role       text not null default 'creator',
  status     text not null default 'pending',
  created_at timestamptz not null default now(),

  constraint profiles_role_check   check (role in ('creator', 'admin')),
  constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists profiles_status_idx on public.profiles (status);

-- Lock the table down, then open only what's actually needed.
alter table public.profiles enable row level security;

-- A signed-in user may read ONLY their own row. No one can read anyone else's
-- profile through this client-facing path — admin-side listing (Phase 2) goes
-- through the service role in a trusted server route instead.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Table-level grants — see design note 5 above. `authenticated` gets SELECT
-- only (matching the one RLS policy above); no INSERT/UPDATE/DELETE grant,
-- since profile creation happens via the trigger below (which runs with
-- elevated privilege, not as `authenticated`) and there's no self-service
-- update path in Phase 1.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

-- service_role bypasses RLS by design, but — per the same lesson — still
-- needs the base table grant to be able to act on it at all.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- Trigger: create the profiles row the moment a campaign account is created.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_campaign_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, x_handle, email, role, status)
  values (
    new.id,
    new.raw_user_meta_data ->> 'x_handle',
    new.email,
    'creator',
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_campaign on auth.users;

create trigger on_auth_user_created_campaign
  after insert on auth.users
  for each row execute function public.handle_new_campaign_user();
