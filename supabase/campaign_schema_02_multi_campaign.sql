-- Alpha Vault — Campaign & Rewards: multi-campaign backend
-- ===========================================================
-- Run AFTER supabase/campaign_schema.sql (Phase 1's `profiles` table already
-- exists in your project by the time you run this). Supabase → SQL Editor →
-- paste → Run.
--
-- ARCHITECTURE NOTE — where this design comes from:
-- The client shared a reference repo ("SubsGigs") built around exactly this
-- problem: multiple simultaneous campaigns, race-safe entry submission,
-- admin review, member bans, and a wallet export for payouts. That repo's
-- SQL is genuinely well-built — row-locking for concurrency safety, an
-- idempotent review flow, and a "revoke everything, then grant only what's
-- needed" permission model. This file reimplements those same mechanisms
-- from scratch against Alpha Vault's actual schema and naming (x_handle not
-- x_username, role/status not is_admin/verification_status, text + check
-- constraints throughout rather than native Postgres enums — matching how
-- Phase 1's profiles table already does it, so the whole schema stays one
-- consistent style rather than mixing two conventions). Nothing is copy-
-- pasted; every function below is written for Alpha Vault's own tables.
--
-- WHY THIS FILE TAKES A DIFFERENT SECURITY APPROACH THAN PHASE 1:
-- Phase 1's profiles table deliberately granted almost nothing to
-- `authenticated` (see campaign_schema.sql's design note 4) because nothing
-- in that simpler, single-program model needed more. A multi-campaign
-- marketplace with shared mutable state (capacity limits, admin actions on
-- OTHER people's rows) genuinely needs the fuller pattern this file uses:
-- broad-looking table grants to `authenticated`, with the real enforcement
-- happening in RLS policies and SECURITY DEFINER RPCs. This is the standard,
-- correct way to use RLS — not a loosening of Phase 1's caution, but the
-- right tool for a materially different problem.

-- ---------------------------------------------------------------------------
-- 1. Reusable admin check — defined FIRST, before anything below references
--    it. Postgres validates that a function referenced in CREATE POLICY
--    actually exists at creation time (not deferred), so this has to come
--    before the profiles policy replacement in step 2, not after it.
--    Centralising this in one function (rather than repeating the same
--    subquery in every RPC and policy) means "how do we decide who's an
--    admin" only has to be right in one place.
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
-- 2. Extend `profiles` with campaign-facing fields.
-- ---------------------------------------------------------------------------
-- `status` (already on profiles from Phase 1: pending/approved/rejected) now
-- does double duty as account-level campaign eligibility — equivalent to
-- what the reference repo calls "verification_status." No new column for
-- this; reusing what's already there avoids two fields meaning the same
-- thing under different names.

alter table public.profiles
  add column if not exists banned_until       timestamptz,
  add column if not exists total_earnings     numeric(12, 2) not null default 0,
  add column if not exists campaigns_entered  integer not null default 0,
  add column if not exists campaigns_accepted integer not null default 0,
  add column if not exists campaigns_rejected integer not null default 0;

alter table public.profiles
  add constraint profiles_total_earnings_nonnegative_check
    check (total_earnings >= 0),
  add constraint profiles_campaigns_entered_nonnegative_check
    check (campaigns_entered >= 0),
  add constraint profiles_campaigns_accepted_nonnegative_check
    check (campaigns_accepted >= 0),
  add constraint profiles_campaigns_rejected_nonnegative_check
    check (campaigns_rejected >= 0),
  add constraint profiles_review_counts_check
    check (campaigns_accepted + campaigns_rejected <= campaigns_entered);

create index if not exists profiles_banned_until_idx
  on public.profiles (banned_until)
  where banned_until is not null;

-- Phase 1's "select own row only" policy can't support an admin member-
-- management page (an admin needs to see and act on EVERYONE's profile, not
-- just their own). Replacing it with a broader "own row, or any row if
-- you're an admin" policy is a necessary, deliberate change from Phase 1 —
-- not an oversight there, just a requirement this feature introduces.
drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. `campaigns` — one row per campaign an admin runs.
-- ---------------------------------------------------------------------------

create table if not exists public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  requirements   text[] not null,
  max_entries    integer not null,
  reward_amount  numeric(12, 2) not null,
  disclaimer     text not null default
    'We reserve the right to reject entries that do not meet the campaign requirements.',
  status         text not null default 'draft',
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint campaigns_status_check
    check (status in ('draft', 'live', 'closed')),
  constraint campaigns_name_length_check
    check (char_length(btrim(name)) between 3 and 100),
  constraint campaigns_requirements_count_check
    check (cardinality(requirements) between 1 and 20),
  constraint campaigns_requirements_no_nulls_check
    check (array_position(requirements, null) is null),
  constraint campaigns_max_entries_positive_check
    check (max_entries > 0),
  constraint campaigns_reward_amount_nonnegative_check
    check (reward_amount >= 0),
  constraint campaigns_disclaimer_length_check
    check (char_length(btrim(disclaimer)) between 10 and 1000)
);

create index if not exists campaigns_status_created_at_idx
  on public.campaigns (status, created_at desc);
create index if not exists campaigns_created_by_idx
  on public.campaigns (created_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. `campaign_entries` — one row per member's submission to a campaign.
--    A member's proof of work is an X post link (matching the rest of this
--    site's X-centric identity — same reasoning as x_handle everywhere
--    else); the payout destination is a wallet address, checked loosely on
--    length only. Validating exact wallet-format correctness per chain is
--    genuinely hard to do reliably in a CHECK constraint, and getting it
--    wrong (rejecting a valid address) is worse than a human reviewing it —
--    same pragmatic tradeoff the reference repo made.
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_entries (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  submission_url  text not null,
  wallet_address  text not null,
  status          text not null default 'pending',
  review_note     text,
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz not null default now(),

  constraint campaign_entries_status_check
    check (status in ('pending', 'accepted', 'rejected')),
  constraint campaign_entries_one_per_profile
    unique (campaign_id, profile_id),
  constraint campaign_entries_submission_url_check
    check (submission_url ~* '^https://(www\.)?(x\.com|twitter\.com)/[^[:space:]]+$'),
  constraint campaign_entries_wallet_length_check
    check (char_length(btrim(wallet_address)) between 8 and 255),
  constraint campaign_entries_review_note_length_check
    check (review_note is null or char_length(review_note) <= 500),
  -- Mirrors the reference repo's state-machine guard: a row's reviewer
  -- fields must be present/absent in lockstep with its status, so it's
  -- structurally impossible to end up with e.g. an "accepted" entry that
  -- was never actually reviewed by anyone.
  constraint campaign_entries_review_state_check
    check (
      (status = 'pending'  and reviewed_by is null     and reviewed_at is null     and review_note is null)
      or
      (status = 'accepted' and reviewed_by is not null and reviewed_at is not null and review_note is null)
      or
      (status = 'rejected' and reviewed_by is not null and reviewed_at is not null)
    )
);

create index if not exists campaign_entries_campaign_status_submitted_idx
  on public.campaign_entries (campaign_id, status, submitted_at);
create index if not exists campaign_entries_profile_submitted_idx
  on public.campaign_entries (profile_id, submitted_at desc);
create index if not exists campaign_entries_pending_submitted_idx
  on public.campaign_entries (submitted_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- 5. submit_campaign_entry — race-safe entry submission.
-- ---------------------------------------------------------------------------
-- THE RACE THIS GUARDS AGAINST: two members hitting "submit" on the last
-- open spot of a campaign at the same instant. Without a lock, both could
-- read "1 spot left," both pass the capacity check, and both insert —
-- overselling the campaign. `select ... for update` on the campaign row
-- forces the second transaction to wait for the first to finish (commit or
-- roll back) before it can even read the campaign's current state, so the
-- capacity check downstream is always working from an up-to-date count —
-- structurally impossible to oversell, not just unlikely to.
--
-- SECURITY DEFINER + explicit auth.uid()/is_admin() checks inside the
-- function body (rather than relying solely on RLS) is deliberate: the
-- capacity check, the ban check, and the "already entered" check all need
-- to happen atomically inside ONE transaction alongside the insert. RLS
-- alone can't express "check three other tables' state, then conditionally
-- allow this insert" — a function is the correct tool here, not a
-- shortcut around RLS.

create or replace function public.submit_campaign_entry(
  p_campaign_id uuid,
  p_submission_url text,
  p_wallet_address text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile      public.profiles%rowtype;
  selected_campaign     public.campaigns%rowtype;
  occupied_entries      integer;
  created_entry_id      uuid;
  normalized_submission_url text := btrim(p_submission_url);
  normalized_wallet_address text := btrim(p_wallet_address);
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'You must be signed in to enter a campaign';
  end if;

  select * into current_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;

  if current_profile.status <> 'approved' then
    raise exception using errcode = '42501', message = 'Your profile is waiting to be verified';
  end if;

  if current_profile.banned_until is not null and current_profile.banned_until > now() then
    raise exception using errcode = '42501', message = 'Your campaign access is temporarily banned';
  end if;

  if normalized_submission_url !~* '^https://(www\.)?(x\.com|twitter\.com)/[^[:space:]]+$' then
    raise exception using errcode = '22023', message = 'Enter a valid X post link';
  end if;

  if char_length(normalized_wallet_address) not between 8 and 255 then
    raise exception using errcode = '22023', message = 'Enter a valid wallet address';
  end if;

  -- THE LOCK: this SELECT blocks any concurrent submission to the same
  -- campaign until this transaction finishes. Everything after this line
  -- reads a guaranteed-fresh view of the campaign's state.
  select * into selected_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  if selected_campaign.status <> 'live' then
    raise exception using errcode = '55000', message = 'This campaign is not live';
  end if;

  if exists (
    select 1 from public.campaign_entries
    where campaign_id = p_campaign_id and profile_id = auth.uid()
  ) then
    raise exception using errcode = '23505', message = 'You have already entered this campaign';
  end if;

  select count(*)::integer into occupied_entries
  from public.campaign_entries
  where campaign_id = p_campaign_id and status in ('pending', 'accepted');

  if occupied_entries >= selected_campaign.max_entries then
    raise exception using errcode = 'P0001', message = 'This campaign is full';
  end if;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address)
  values (p_campaign_id, auth.uid(), normalized_submission_url, normalized_wallet_address)
  returning id into created_entry_id;

  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = auth.uid();

  return created_entry_id;
end;
$$;

revoke all on function public.submit_campaign_entry(uuid, text, text) from public;
grant execute on function public.submit_campaign_entry(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. review_campaign_entry — idempotent admin approve/reject.
-- ---------------------------------------------------------------------------
-- "Idempotent" here specifically means: reviewing an already-reviewed entry
-- is refused, not silently re-applied. Without that guard, two admins
-- double-clicking Approve on the same entry (or one admin's slow network
-- causing a retried request) could credit a member's earnings TWICE for one
-- accepted entry. The `for update` lock plus the `status <> 'pending'` check
-- immediately after it closes that window: the second attempt sees the
-- already-updated status and is rejected outright, even if both requests
-- arrived within milliseconds of each other.

create or replace function public.review_campaign_entry(
  p_entry_id uuid,
  p_status text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_entry public.campaign_entries%rowtype;
  selected_reward numeric(12, 2);
  normalized_review_note text := nullif(btrim(p_review_note), '');
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception using errcode = '22023', message = 'Review status must be accepted or rejected';
  end if;

  if normalized_review_note is not null and char_length(normalized_review_note) > 500 then
    raise exception using errcode = '22023', message = 'Review notes cannot exceed 500 characters';
  end if;

  -- THE LOCK + IDEMPOTENCY CHECK: see comment block above.
  select * into selected_entry from public.campaign_entries where id = p_entry_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign entry not found';
  end if;

  if selected_entry.status <> 'pending' then
    raise exception using errcode = '55000', message = 'This campaign entry has already been reviewed';
  end if;

  select reward_amount into selected_reward from public.campaigns where id = selected_entry.campaign_id;

  update public.campaign_entries
  set
    status = p_status,
    review_note = case when p_status = 'rejected' then normalized_review_note else null end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = selected_entry.id;

  if p_status = 'accepted' then
    update public.profiles
    set campaigns_accepted = campaigns_accepted + 1,
        total_earnings = total_earnings + selected_reward
    where id = selected_entry.profile_id;
  else
    update public.profiles
    set campaigns_rejected = campaigns_rejected + 1
    where id = selected_entry.profile_id;
  end if;
end;
$$;

revoke all on function public.review_campaign_entry(uuid, text, text) from public;
grant execute on function public.review_campaign_entry(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Ban system.
-- ---------------------------------------------------------------------------
-- `p_days = 0` lifts a ban (sets banned_until back to null) rather than
-- needing a separate "unban" function — one RPC covers both directions.
-- The two self/admin guards prevent both an obvious abuse path (an admin
-- banning themselves by mistake and locking themselves out) and a more
-- subtle one (one admin silently banning another admin).

create or replace function public.set_member_ban(
  p_profile_id uuid,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_banned_until timestamptz;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_days < 0 or p_days > 3650 then
    raise exception using errcode = '22023', message = 'Ban duration must be between 0 and 3650 days';
  end if;

  if p_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'Administrators cannot ban their own profile';
  end if;

  if exists (select 1 from public.profiles where id = p_profile_id and role = 'admin') then
    raise exception using errcode = '42501', message = 'Administrator profiles cannot be banned';
  end if;

  new_banned_until := case when p_days = 0 then null else now() + make_interval(days => p_days) end;

  update public.profiles set banned_until = new_banned_until where id = p_profile_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;
end;
$$;

revoke all on function public.set_member_ban(uuid, integer) from public;
grant execute on function public.set_member_ban(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Verification flow — admin approves/rejects a member's ACCOUNT (not a
--    specific campaign entry). This is the same three-state field Phase 1
--    already put on profiles (`status`), so this RPC is the missing piece
--    that was never built in Phase 1: a controlled, admin-only way to
--    change it, instead of a direct table UPDATE.
-- ---------------------------------------------------------------------------

create or replace function public.set_member_verification(
  p_profile_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Status must be pending, approved, or rejected';
  end if;

  if p_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'Administrators cannot change their own verification status';
  end if;

  if exists (select 1 from public.profiles where id = p_profile_id and role = 'admin') then
    raise exception using errcode = '42501', message = 'Administrator verification cannot be changed here';
  end if;

  update public.profiles set status = p_status where id = p_profile_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;
end;
$$;

revoke all on function public.set_member_verification(uuid, text) from public;
grant execute on function public.set_member_verification(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Wallet export — the one query built for pulling payout data, not
--    day-to-day reads. It intentionally returns ONLY accepted entries for
--    ONE campaign at a time (never a cross-campaign or all-entries dump),
--    so a single export can't become an accidental full-database wallet
--    leak. Admin-only, same as everything else that touches another
--    member's payout details.
-- ---------------------------------------------------------------------------

create or replace function public.export_accepted_campaign_wallets(
  p_campaign_id uuid
)
returns table (
  x_handle text,
  wallet_address text,
  submission_url text,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  return query
  select profile.x_handle, entry.wallet_address, entry.submission_url, entry.reviewed_at
  from public.campaign_entries as entry
  join public.profiles as profile on profile.id = entry.profile_id
  where entry.campaign_id = p_campaign_id and entry.status = 'accepted'
  order by entry.reviewed_at, profile.x_handle;
end;
$$;

revoke all on function public.export_accepted_campaign_wallets(uuid) from public;
grant execute on function public.export_accepted_campaign_wallets(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Capacity view — how a member's campaign-list page checks "spots left"
--     WITHOUT ever exposing who else entered, their submission links, or
--     their wallets. Only counts leave this view, nothing identifying.
-- ---------------------------------------------------------------------------

create or replace view public.campaign_capacity
with (security_invoker = false, security_barrier = true)
as
select
  campaign.id as campaign_id,
  count(entry.id) filter (where entry.status in ('pending', 'accepted'))::integer as occupied_entries,
  count(entry.id) filter (where entry.status = 'accepted')::integer as accepted_entries,
  greatest(
    campaign.max_entries - count(entry.id) filter (where entry.status in ('pending', 'accepted'))::integer,
    0
  ) as spots_left
from public.campaigns as campaign
left join public.campaign_entries as entry on entry.campaign_id = campaign.id
where campaign.status = 'live' or public.is_admin()
group by campaign.id, campaign.max_entries;

comment on view public.campaign_capacity is
  'Exposes campaign counts only. Never exposes entry links, wallets, or member identities.';

-- ---------------------------------------------------------------------------
-- 11. RLS + grants for the two new tables and the view.
-- ---------------------------------------------------------------------------
-- The pattern here — revoke everything from anon/authenticated, then grant
-- back only SELECT (plus, for campaigns, admin-gated INSERT/UPDATE) — means
-- the RLS policies below are the ONLY thing standing between "authenticated
-- can attempt this query" and "the database actually returns/accepts it."
-- No direct INSERT/UPDATE policy exists on campaign_entries at all: entry
-- submission and review can ONLY happen through the two SECURITY DEFINER
-- RPCs above, which is what makes the race-lock and idempotency guarantees
-- in those functions actually airtight — there's no side door that bypasses
-- them.

alter table public.campaigns enable row level security;
alter table public.campaign_entries enable row level security;

create policy "campaigns_select_live_or_admin"
  on public.campaigns for select
  to authenticated
  using (status = 'live' or public.is_admin());

create policy "campaigns_insert_admin"
  on public.campaigns for insert
  to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy "campaigns_update_admin"
  on public.campaigns for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "campaign_entries_select_own_or_admin"
  on public.campaign_entries for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.campaign_entries from anon, authenticated;
revoke all on table public.campaign_capacity from anon, authenticated;

grant select, insert, update on table public.campaigns to authenticated;
grant select on table public.campaign_entries to authenticated;
grant select on table public.campaign_capacity to authenticated;

-- ---------------------------------------------------------------------------
-- Bootstrap the first administrator (run once, manually, after that user has
-- signed up through the normal Sign Up flow):
--
-- update public.profiles
-- set role = 'admin', status = 'approved'
-- where x_handle = 'your_x_handle';
-- ---------------------------------------------------------------------------
