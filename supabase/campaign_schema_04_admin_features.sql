-- Alpha Vault — Campaign & Rewards: admin feature set (deletion, reference
-- link, submissions export)
-- =============================================================================
-- Run AFTER campaign_schema_03_repairs.sql. Supabase → SQL Editor → paste →
-- Run. Safe to re-run — every step is idempotent.
--
-- NOTE ON SCOPE: "cost tracking" and "search/filtering" aren't in this file —
-- they need no schema changes. Cost tracking is reward_amount × accepted
-- entries, computed from data get_campaign_capacity() already returns.
-- Search/filtering is client-side filtering of already-fetched rows. Both are
-- pure frontend work, shipped alongside this migration but not part of it.

-- ---------------------------------------------------------------------------
-- 1. Campaign reference link — an optional URL an admin can attach to a
--    campaign (an example post, task instructions), shown to members.
-- ---------------------------------------------------------------------------

alter table public.campaigns add column if not exists reference_url text;

alter table public.campaigns drop constraint if exists campaigns_reference_url_check;
alter table public.campaigns
  add constraint campaigns_reference_url_check
  check (
    reference_url is null
    or (char_length(reference_url) <= 2048 and reference_url ~* '^https?://[^[:space:]]+$')
  );

comment on column public.campaigns.reference_url is
  'Optional HTTP(S) link that helps members complete the campaign task.';

-- ---------------------------------------------------------------------------
-- 2. Campaign deletion — the part that's easy to get subtly wrong.
-- ---------------------------------------------------------------------------
-- `campaign_entries.campaign_id references campaigns(id) on delete cascade`
-- already means the entries themselves vanish automatically when a campaign
-- is deleted — that part needs no new code. What's NOT automatic, and is the
-- actual reason this needs its own RPC rather than a plain DELETE: every
-- profile who has an entry in this campaign has counters on THEIR OWN row
-- (campaigns_entered, campaigns_accepted, campaigns_rejected, total_earnings)
-- that were incremented when that entry was submitted/reviewed. A cascade
-- delete on campaign_entries does nothing to reverse those — left alone,
-- deleting a campaign would leave every affected profile with phantom stats
-- for a campaign that no longer exists (an accepted entry's reward still
-- counted in total_earnings, an entered/accepted/rejected count that no
-- longer corresponds to anything). This function walks every entry in the
-- campaign BEFORE deleting it and reverses exactly what was added, per
-- profile, per entry status — so the numbers stay correct afterward.

create or replace function public.delete_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_row record;
  reward numeric(12, 2);
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  select reward_amount into reward from public.campaigns where id = p_campaign_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  -- Reverse every entry's contribution to its own profile's counters, one
  -- profile at a time, before anything is deleted.
  for entry_row in
    select profile_id, status from public.campaign_entries where campaign_id = p_campaign_id
  loop
    if entry_row.status = 'accepted' then
      update public.profiles
      set campaigns_entered  = greatest(campaigns_entered - 1, 0),
          campaigns_accepted = greatest(campaigns_accepted - 1, 0),
          total_earnings     = greatest(total_earnings - reward, 0)
      where id = entry_row.profile_id;
    elsif entry_row.status = 'rejected' then
      update public.profiles
      set campaigns_entered  = greatest(campaigns_entered - 1, 0),
          campaigns_rejected = greatest(campaigns_rejected - 1, 0)
      where id = entry_row.profile_id;
    else -- pending
      update public.profiles
      set campaigns_entered = greatest(campaigns_entered - 1, 0)
      where id = entry_row.profile_id;
    end if;
  end loop;

  -- The FK's `on delete cascade` removes every campaign_entries row for this
  -- campaign automatically as a side effect of this delete.
  delete from public.campaigns where id = p_campaign_id;
end;
$$;

revoke all on function public.delete_campaign(uuid) from public;
grant execute on function public.delete_campaign(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Submissions export — handle + submission link for every entry in a
--    campaign (not just accepted ones, unlike the wallet export). Useful for
--    an admin doing a first-pass content review before formally
--    accepting/rejecting anything.
-- ---------------------------------------------------------------------------

create or replace function public.export_campaign_submissions(p_campaign_id uuid)
returns table (
  x_handle text,
  submission_url text,
  status text,
  submitted_at timestamptz
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
  select profile.x_handle::text, entry.submission_url, entry.status, entry.submitted_at
  from public.campaign_entries as entry
  join public.profiles as profile on profile.id = entry.profile_id
  where entry.campaign_id = p_campaign_id
  order by entry.submitted_at, profile.x_handle;
end;
$$;

revoke all on function public.export_campaign_submissions(uuid) from public;
grant execute on function public.export_campaign_submissions(uuid) to authenticated;
