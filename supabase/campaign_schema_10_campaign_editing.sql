-- Alpha Vault — Campaign & Rewards: campaign editing (reward/cap lock)
-- =======================================================================
-- Run AFTER campaign_schema_09_faster_delete.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHAT THIS ADDS: the ability to edit a campaign's name, requirements,
-- reward amount, entry cap, disclaimer, and end date after creation — with
-- reward_amount and max_entries LOCKED once the campaign has at least one
-- accepted entry.
--
-- WHY A TRIGGER, NOT JUST AN APPLICATION-LAYER CHECK:
-- campaigns already has an update policy (campaigns_update_admin) that lets
-- any admin update ANY column on ANY campaign row — that's an AUTHORIZATION
-- rule ("is this person allowed to touch this row"), and it has no way to
-- also express a DATA-INTEGRITY rule ("but not THIS field, given THIS row's
-- current state") — RLS policies only ever see one row at a time, with no
-- clean way to compare the row's old values against its proposed new ones.
-- A trigger is the mechanism built for exactly that: it receives both OLD
-- and NEW on every UPDATE and can compare them directly.
--
-- This matters concretely: without a trigger, "locking" reward_amount would
-- only be true for whichever ONE code path remembers to check for it (e.g.
-- an edit form). Any other path to the same column — a raw SQL statement,
-- a future admin tool, a bug in the edit form itself — would silently have
-- no protection at all. A trigger fires on every single UPDATE to this
-- table, regardless of what wrote it, which is the only way to make this
-- rule actually universal rather than "true as long as everyone remembers."
--
-- THE RULE ITSELF:
--   1. reward_amount and max_entries may not change once the campaign has
--      ≥1 ACCEPTED entry — changing either after money has already been
--      credited at the old value is exactly the corruption the regression
--      check (supabase/regression_check_money_math.sql, Scenario B) proved
--      happens if this isn't enforced.
--   2. Independent of the above, max_entries may never be set below the
--      number of entries already submitted (pending + accepted) — even
--      before any acceptance, dropping the cap below existing applicants
--      would put the campaign in a nonsensical state.
-- Every other column — name, requirements, disclaimer, end_date, status,
-- reference_url, campaign_type — is untouched by this trigger and remains
-- freely editable, exactly as it already was.

create or replace function public.prevent_locked_campaign_field_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_count integer;
  occupied_count integer;
begin
  -- Rule 1: reward_amount / max_entries frozen once any entry is accepted.
  if new.reward_amount is distinct from old.reward_amount
     or new.max_entries is distinct from old.max_entries then

    select count(*) into accepted_count
    from public.campaign_entries
    where campaign_id = old.id and status = 'accepted';

    if accepted_count > 0 then
      raise exception using errcode = '55000', message = format(
        'Cannot change reward amount or entry cap: this campaign already has %s accepted %s. Changing it now would make future payout math incorrect and corrupt the earnings already recorded for those entries.',
        accepted_count,
        case when accepted_count = 1 then 'entry' else 'entries' end
      );
    end if;
  end if;

  -- Rule 2: max_entries can't drop below entries already submitted, even
  -- while still unlocked (accepted_count = 0 at this point, by rule 1 above
  -- having already passed without raising).
  if new.max_entries is distinct from old.max_entries then
    select count(*) into occupied_count
    from public.campaign_entries
    where campaign_id = old.id and status in ('pending', 'accepted');

    if new.max_entries < occupied_count then
      raise exception using errcode = '55000', message = format(
        'Entry cap can''t be set below %s — that''s how many entries this campaign already has.',
        occupied_count
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists campaigns_prevent_locked_field_changes on public.campaigns;
create trigger campaigns_prevent_locked_field_changes
  before update on public.campaigns
  for each row
  execute function public.prevent_locked_campaign_field_changes();
