-- Alpha Vault — Campaign & Rewards: real wallet address format validation
-- ============================================================================
-- Run AFTER campaign_schema_10_campaign_editing.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHAT THIS ADDS: wallet_address was only ever checked for LENGTH (8–255
-- characters) — never checked to actually be shaped like a real address.
-- That's a wide-open range: a 9-character typo, a copy-paste that dropped
-- half the string, or someone pasting an unrelated string would all pass
-- the old check and reach the database untouched, with nothing catching it
-- until a payout silently failed to land.
--
-- (For the record: a specific real submission was checked directly against
-- this concern and confirmed to be a correctly-shaped, valid 42-character
-- address — 0x + 40 hex characters, exactly right. Nothing was actually
-- wrong with any existing entry. This migration is a preventative guard
-- against a real gap in the validation, not a fix for a data problem that
-- occurred.)
--
-- Both accepted chains (USDT on BEP20, USDC on Base) are EVM-compatible, so
-- one shape check covers both: `0x` followed by exactly 40 hex characters.
--
-- Deliberately checking SHAPE, not EIP-55 checksum casing — a checksum check
-- would reject perfectly valid all-lowercase addresses, which many wallets
-- and exchanges export by default. That would be a worse failure mode
-- (rejecting good addresses) than the gap being closed here.
--
-- THREE LAYERS, matching the payment_method pattern already used in this
-- project (migration 08): the zod schema (lib/campaignSchema.ts), this RPC's
-- own check, and the table's own CHECK constraint below. Same reasoning as
-- always — the zod layer only protects requests that go through that exact
-- code path; the RPC and table-level checks are what make the rule true
-- regardless of what calls them.
--
-- ---------------------------------------------------------------------------
-- On existing data:
-- Every existing wallet_address should be checked against this pattern
-- before assuming they're all fine — this migration does not do that check
-- for you, on purpose (see below). A normal ADD CONSTRAINT validates every
-- existing row immediately, and would refuse to apply at all if even one
-- existing row failed the new rule. Rather than have this migration itself
-- silently depend on every historical row already being correct, the
-- constraint is added `NOT VALID`: it applies to every new insert and
-- update from this point forward, without retroactively validating rows
-- that already exist.
--
-- Once you've confirmed every existing wallet_address is genuinely valid
-- (spot-checked or queried directly), this constraint can be tightened to
-- also cover old rows by running:
--   alter table public.campaign_entries validate constraint
--     campaign_entries_wallet_format_check;
-- That step is NOT run automatically here — it should only be run once
-- existing data has actually been reviewed, not assumed.
-- ---------------------------------------------------------------------------

alter table public.campaign_entries
  drop constraint if exists campaign_entries_wallet_format_check;

alter table public.campaign_entries
  add constraint campaign_entries_wallet_format_check
  check (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
  not valid;

-- ---------------------------------------------------------------------------
-- submit_campaign_entry — same shape check, replacing the length-only check.
-- Signature is unchanged (uuid, text, text, text), so a plain
-- create-or-replace applies here — no drop-first needed, unlike migrations
-- 08/09 where the signature or return shape actually changed.
-- ---------------------------------------------------------------------------

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

  -- Real shape check, replacing the old length-only check. See migration
  -- header for why this validates 0x+40-hex rather than checksum casing.
  if normalized_wallet_address !~ '^0x[a-fA-F0-9]{40}$' then
    raise exception using errcode = '22023', message = 'Enter a valid wallet address — it should start with 0x, followed by 40 letters/numbers (42 characters total)';
  end if;

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
