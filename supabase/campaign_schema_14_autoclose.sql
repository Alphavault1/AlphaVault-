-- Alpha Vault — Campaign & Rewards: auto-close on reaching capacity
-- ============================================================================
-- Run AFTER campaign_schema_13_unpaid_export.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHAT THIS ADDS: before this, a campaign that filled up (occupied_entries
-- reaching max_entries) was already correctly PROTECTED — submit_campaign_
-- entry has always rejected any entry attempt past capacity, and the member
-- UI already replaces the entry form with "This campaign is full." once
-- spotsLeft hits zero. What was missing: the campaign's own status stayed
-- 'live' forever, with nothing surfacing the fact that it's actually full
-- anywhere an admin would see at a glance (the dashboard, the LIVE badge).
-- Functionally safe; visibly misleading.
--
-- This makes the LAST entry that fills a campaign also flip its status to
-- 'closed', in the same transaction as that entry's insert — so the moment
-- a campaign is genuinely full, it's visibly closed everywhere the status
-- badge shows, not just silently blocked at the point of submission.
--
-- DELIBERATELY ONE-WAY: this only ever closes a campaign automatically. It
-- never reopens one. If an admin later rejects an entry (freeing a spot) or
-- deletes one, the campaign stays closed rather than silently reopening to
-- 'live' with no one having decided that should happen. Reopening is always
-- a deliberate admin action via the existing DRAFT/LIVE/CLOSED toggle — this
-- migration doesn't touch that path at all. An automatic, silent reopening
-- felt like the wrong default: it would mean entries could start flowing
-- into a campaign again with nobody having actually chosen that.
--
-- Same signature as before (uuid, text, text, text) — plain create-or-
-- replace applies, no drop-first needed.

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

  -- The row we just inserted brings the true occupied count to
  -- occupied_entries + 1 (the pre-insert count computed above, plus this
  -- one). If that reaches the cap, this is the entry that filled it — close
  -- the campaign in the same transaction as the insert that caused it, so
  -- the two facts (campaign is full / campaign is closed) can never
  -- disagree with each other even for a moment.
  if occupied_entries + 1 >= selected_campaign.max_entries then
    update public.campaigns set status = 'closed' where id = p_campaign_id;
  end if;

  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = auth.uid();

  return created_entry_id;
end;
$$;

revoke all on function public.submit_campaign_entry(uuid, text, text, text) from public;
grant execute on function public.submit_campaign_entry(uuid, text, text, text) to authenticated;
