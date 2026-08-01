-- Alpha Vault — Campaign & Rewards: unpaid-wallets export
-- ============================================================================
-- Run AFTER campaign_schema_12_payout_status.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHAT THIS ADDS: a second export, alongside the existing "export every
-- accepted wallet" one, filtered to ONLY entries that haven't been paid yet.
-- The existing export stays exactly as it was — full accepted list,
-- unfiltered, for record-keeping/auditing. This new one exists specifically
-- for running a payout batch: pull the list of who's still owed money right
-- now, send it, then mark each one paid.
--
-- Same body as export_accepted_campaign_wallets (migration 08) with one
-- added condition — kept as a SEPARATE function rather than an optional
-- parameter on the existing one, matching this project's existing pattern
-- of one small single-purpose function per distinct export rather than one
-- function branching on a flag.

create or replace function public.export_unpaid_campaign_wallets(
  p_campaign_id uuid
)
returns table (
  x_handle text,
  wallet_address text,
  payment_method text,
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
  select profile.x_handle::text, entry.wallet_address, entry.payment_method, entry.submission_url, entry.reviewed_at
  from public.campaign_entries as entry
  join public.profiles as profile on profile.id = entry.profile_id
  where entry.campaign_id = p_campaign_id
    and entry.status = 'accepted'
    and entry.payout_status = 'unpaid'
  order by entry.reviewed_at, profile.x_handle;
end;
$$;

revoke all on function public.export_unpaid_campaign_wallets(uuid) from public;
grant execute on function public.export_unpaid_campaign_wallets(uuid) to authenticated;
