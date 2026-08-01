-- Alpha Vault — Campaign & Rewards: payout status tracking
-- ============================================================================
-- Run AFTER campaign_schema_11_wallet_format.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHY THIS EXISTS: "$5 total paid" on the admin dashboard was computed as
-- reward_amount × accepted_entries — a calculation of what's OWED, not a
-- record of money actually sent. The platform has no built-in payment
-- rail; the real transfer happens manually, off-platform, whenever the
-- admin sends crypto from their own wallet after exporting the accepted-
-- wallets CSV. Labeling that owed figure "paid" claimed a completed
-- transaction that hadn't happened — flagged directly by the client.
--
-- This adds a genuine payout_status per entry, so "paid" means someone
-- actually clicked to confirm they sent the money, not just that an entry
-- was accepted.
--
-- THE TWO DASHBOARD NUMBERS THIS ENABLES (built in the app layer, not here):
--   Total Qualified/Approved — reward_amount × count(status = 'accepted')
--     — unchanged from the old "total paid" calculation, just relabeled to
--       say what it actually is: the value of approved work, paid or not.
--   Total Disbursed — reward_amount × count(status = 'accepted' AND
--     payout_status = 'paid') — starts at $0 and only grows when the admin
--     explicitly confirms a payment went out.

alter table public.campaign_entries
  add column if not exists payout_status text not null default 'unpaid';

alter table public.campaign_entries
  drop constraint if exists campaign_entries_payout_status_check;
alter table public.campaign_entries
  add constraint campaign_entries_payout_status_check
  check (payout_status in ('unpaid', 'paid'));

-- ---------------------------------------------------------------------------
-- set_entry_payout_status — admin-only, and the one rule that actually
-- matters: an entry can only be marked 'paid' if it's genuinely accepted.
-- Nothing was ever owed for a pending or rejected entry, so there's nothing
-- to confirm payment on — this is enforced here, at the database, not left
-- to the admin UI to simply not offer the button. Same reasoning as every
-- other guard this session: a UI that hides a button is a courtesy, not a
-- guarantee.
--
-- Accepts BOTH 'paid' and 'unpaid' (not a one-way "mark paid" action) so an
-- accidental click has an undo — a real click on a real button by a real
-- person should have a way back, not just a one-way door.
-- ---------------------------------------------------------------------------

create or replace function public.set_entry_payout_status(
  p_entry_id uuid,
  p_payout_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_payout_status not in ('unpaid', 'paid') then
    raise exception using errcode = '22023', message = 'Invalid payout status';
  end if;

  select status into current_status from public.campaign_entries where id = p_entry_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Entry not found';
  end if;

  if current_status <> 'accepted' then
    raise exception using errcode = '55000', message = 'Only accepted entries can have a payout status — this entry was never approved, so nothing is owed on it';
  end if;

  update public.campaign_entries set payout_status = p_payout_status where id = p_entry_id;
end;
$$;

revoke all on function public.set_entry_payout_status(uuid, text) from public;
grant execute on function public.set_entry_payout_status(uuid, text) to authenticated;
