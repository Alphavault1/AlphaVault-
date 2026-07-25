-- Alpha Vault — Campaign & Rewards: entry payment method
-- ========================================================
-- Run AFTER campaign_schema_07_application_required.sql. Supabase → SQL
-- Editor → paste → Run. Safe to re-run.
--
-- WHAT THIS ADDS: a required Payment Method on every campaign entry — which
-- chain the member wants their reward paid on: USDT (BEP20) or USDC (Base).
-- It sits alongside the existing wallet address (the wallet says WHERE to
-- send, the payment method says WHAT/on which chain), shows on the admin's
-- entry review list, and becomes a new column in the accepted-wallets export
-- the payout run is driven from.
--
-- Stored as a stable slug ('usdt_bep20' / 'usdc_base'), same convention as
-- `status` and `campaign_type` — enum-like text guarded by a CHECK, not a
-- free-form display string. The human wording ("USDT (BEP20)") is applied in
-- the app layer (lib/paymentMethods.ts), so re-wording a label never needs a
-- migration.

-- ---------------------------------------------------------------------------
-- 1. payment_method — the column itself.
--    Added NOT NULL because there are no existing entries to migrate (this
--    is shipping before any campaign has run). It's added nullable first,
--    constrained, then set NOT NULL: if a stray row somehow existed without
--    a value, the SET NOT NULL would fail LOUDLY here rather than a bad
--    default silently masking it — the honest failure is the safer one for
--    payout data.
-- ---------------------------------------------------------------------------

alter table public.campaign_entries
  add column if not exists payment_method text;

alter table public.campaign_entries
  drop constraint if exists campaign_entries_payment_method_check;
alter table public.campaign_entries
  add constraint campaign_entries_payment_method_check
  check (payment_method in ('usdt_bep20', 'usdc_base'));

alter table public.campaign_entries
  alter column payment_method set not null;

-- ---------------------------------------------------------------------------
-- 2. submit_campaign_entry — now takes and stores the payment method.
--    The signature GAINS a parameter (uuid, text, text) → (uuid, text, text,
--    text). A create-or-replace with a different signature would create a
--    SECOND overload and leave the old 3-arg version still callable — so the
--    old one is dropped explicitly first. Everything else in the body is the
--    file-07 version verbatim; the only additions are the payment-method
--    validation (same defense-in-depth as the wallet/url checks — the client
--    schema can be bypassed by a direct RPC call, this CHECK can't) and the
--    payment_method column in the insert.
-- ---------------------------------------------------------------------------

drop function if exists public.submit_campaign_entry(uuid, text, text);

create or replace function public.submit_campaign_entry(
  p_campaign_id uuid,
  p_submission_url text,
  p_wallet_address text,
  p_payment_method text
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

  -- NEW: payment method must be one of the two supported chains. Kept in
  -- lockstep with the campaign_entries_payment_method_check constraint above
  -- and the zod enum in lib/paymentMethods.ts — three copies of the same
  -- rule at three layers, deliberately, so no single bypass admits a bad
  -- value into a table that drives real payouts.
  if p_payment_method not in ('usdt_bep20', 'usdc_base') then
    raise exception using errcode = '22023', message = 'Select a valid payment method';
  end if;

  select * into selected_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  if selected_campaign.status <> 'live' then
    raise exception using errcode = '55000', message = 'This campaign is not live';
  end if;

  if selected_campaign.end_date is not null and selected_campaign.end_date <= now() then
    raise exception using errcode = '55000', message = 'This campaign has ended';
  end if;

  if selected_campaign.campaign_type = 'application_required' then
    if not exists (
      select 1 from public.campaign_applications
      where campaign_id = p_campaign_id and profile_id = auth.uid() and status = 'approved'
    ) then
      raise exception using errcode = '42501', message = 'You need an approved application before entering this campaign';
    end if;
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

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (p_campaign_id, auth.uid(), normalized_submission_url, normalized_wallet_address, p_payment_method)
  returning id into created_entry_id;

  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = auth.uid();

  return created_entry_id;
end;
$$;

revoke all on function public.submit_campaign_entry(uuid, text, text, text) from public;
grant execute on function public.submit_campaign_entry(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. export_accepted_campaign_wallets — now returns payment_method too.
--    Its RETURNS TABLE shape changes (a column is added), and CREATE OR
--    REPLACE cannot change a function's return type — so it must be dropped
--    and recreated, not replaced in place. Same admin-only, accepted-only,
--    one-campaign-at-a-time guarantees as before; the only change is the
--    extra column, placed next to wallet_address since they're read together
--    when running a payout.
-- ---------------------------------------------------------------------------

drop function if exists public.export_accepted_campaign_wallets(uuid);

create or replace function public.export_accepted_campaign_wallets(
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
  where entry.campaign_id = p_campaign_id and entry.status = 'accepted'
  order by entry.reviewed_at, profile.x_handle;
end;
$$;

revoke all on function public.export_accepted_campaign_wallets(uuid) from public;
grant execute on function public.export_accepted_campaign_wallets(uuid) to authenticated;
