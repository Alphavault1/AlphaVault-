-- Alpha Vault — Campaign & Rewards: faster campaign deletion
-- ===========================================================
-- Run AFTER campaign_schema_08_payment_method.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHAT THIS CHANGES: delete_campaign's behaviour is IDENTICAL — same admin
-- check, same counter reversals, same cascade delete, same final numbers.
-- Only its performance characteristics change.
--
-- THE PROBLEM: the previous version looped over every entry in the campaign
-- with `for entry_row in select ... loop` and ran a separate UPDATE against
-- public.profiles for each one. That's one round of plpgsql interpretation
-- plus one statement execution PER ENTRY — so deleting a campaign with 400
-- entries executed 400 individual UPDATEs sequentially inside a single
-- transaction. At small entry counts that's milliseconds and unnoticeable;
-- it degrades linearly, and on a large campaign it can run long enough to
-- feel broken from the dashboard, or to hit Postgres' statement timeout and
-- roll the whole thing back.
--
-- THE FIX: three set-based UPDATEs — one per entry status — that each reverse
-- every affected profile in a single statement. Postgres does the join and
-- the bulk update itself instead of plpgsql driving it row by row. The work
-- becomes proportional to a few index scans rather than to the entry count.
--
-- WHY THREE STATEMENTS AND NOT ONE: each status reverses a DIFFERENT set of
-- columns (accepted also reverses total_earnings and campaigns_accepted;
-- rejected reverses campaigns_rejected; pending reverses only
-- campaigns_entered). Splitting by status keeps each statement's intent
-- obvious and mirrors the original branch-per-status logic exactly.
--
-- WHY NO AGGREGATION IS NEEDED: campaign_entries has
-- `unique (campaign_id, profile_id)` (constraint
-- campaign_entries_one_per_profile), so within ONE campaign a profile can
-- have at most one entry. Each profile is therefore touched at most once per
-- statement, and a plain UPDATE ... FROM decrements by exactly 1 — no risk
-- of the double-counting that would occur if multiple entries per profile
-- were possible here.
--
-- The existing campaign_entries_campaign_status_submitted_idx index on
-- (campaign_id, status, submitted_at) already serves every WHERE clause
-- below, so no new index is required.

create or replace function public.delete_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward numeric(12, 2);
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  select reward_amount into reward from public.campaigns where id = p_campaign_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  -- Accepted entries: reverse the entry count, the accepted count, AND the
  -- earnings those acceptances credited.
  update public.profiles as profile
  set campaigns_entered  = greatest(profile.campaigns_entered - 1, 0),
      campaigns_accepted = greatest(profile.campaigns_accepted - 1, 0),
      total_earnings     = greatest(profile.total_earnings - reward, 0)
  from public.campaign_entries as entry
  where entry.campaign_id = p_campaign_id
    and entry.profile_id = profile.id
    and entry.status = 'accepted';

  -- Rejected entries: reverse the entry count and the rejected count. No
  -- earnings were ever credited for these.
  update public.profiles as profile
  set campaigns_entered  = greatest(profile.campaigns_entered - 1, 0),
      campaigns_rejected = greatest(profile.campaigns_rejected - 1, 0)
  from public.campaign_entries as entry
  where entry.campaign_id = p_campaign_id
    and entry.profile_id = profile.id
    and entry.status = 'rejected';

  -- Pending entries: only the entry count was ever incremented.
  update public.profiles as profile
  set campaigns_entered = greatest(profile.campaigns_entered - 1, 0)
  from public.campaign_entries as entry
  where entry.campaign_id = p_campaign_id
    and entry.profile_id = profile.id
    and entry.status = 'pending';

  -- The FK's `on delete cascade` removes every campaign_entries row for this
  -- campaign automatically as a side effect of this delete.
  delete from public.campaigns where id = p_campaign_id;
end;
$$;

revoke all on function public.delete_campaign(uuid) from public;
grant execute on function public.delete_campaign(uuid) to authenticated;
