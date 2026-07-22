-- Alpha Vault — Campaign & Rewards: campaign duration
-- ========================================================
-- Run AFTER campaign_schema_05_role_management.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. end_date — optional. A campaign without one runs until manually closed
--    or until it fills up; setting one gives it a hard deadline as well.
-- ---------------------------------------------------------------------------

alter table public.campaigns add column if not exists end_date timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Real enforcement, not just a displayed date. Without this, an expired
--    campaign would keep silently accepting entries forever — the date on
--    the card would just be decorative. Same defense-in-depth reasoning as
--    every other check in submit_campaign_entry: checked here, inside the
--    same locked transaction as the capacity check, not left to the
--    frontend to "remember" to hide an expired campaign's entry form.
-- ---------------------------------------------------------------------------

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

  select * into selected_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  if selected_campaign.status <> 'live' then
    raise exception using errcode = '55000', message = 'This campaign is not live';
  end if;

  -- NEW: the actual enforcement for item 4. Checked after the status check
  -- (a closed/draft campaign should say so, not "expired," even if it also
  -- happens to have a past end_date) but before capacity, since "this
  -- campaign has ended" is a more useful message than "this campaign is
  -- full" for something that's actually just out of time.
  if selected_campaign.end_date is not null and selected_campaign.end_date <= now() then
    raise exception using errcode = '55000', message = 'This campaign has ended';
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
