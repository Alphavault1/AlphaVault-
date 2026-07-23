-- Alpha Vault — Campaign & Rewards: Application Required campaigns
-- =====================================================================
-- Run AFTER campaign_schema_06_duration.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHAT THIS ADDS: a second campaign type. Every campaign so far has been
-- "Direct Submission" — approved members can submit an entry straight away.
-- This adds "Application Required": members must apply and be approved
-- FIRST, and only then can they submit an actual entry. Existing campaigns
-- are entirely unaffected — they default to 'direct_submission', same
-- behavior as before this file ever ran.

-- ---------------------------------------------------------------------------
-- 1. campaign_type — which flow a campaign uses.
-- ---------------------------------------------------------------------------

alter table public.campaigns add column if not exists campaign_type text not null default 'direct_submission';

alter table public.campaigns drop constraint if exists campaigns_campaign_type_check;
alter table public.campaigns
  add constraint campaigns_campaign_type_check
  check (campaign_type in ('direct_submission', 'application_required'));

-- ---------------------------------------------------------------------------
-- 2. campaign_applications — the pre-approval gate itself. Deliberately
--    separate from campaign_entries: an application has no submission link,
--    no wallet, no reward consequence of its own — it's purely "may this
--    member attempt this campaign at all," decided before any content or
--    payout details exist. Rejecting/accepting an application never touches
--    profiles' earnings or entry counters (only actual entry review does).
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_applications (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending',
  review_note   text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  applied_at    timestamptz not null default now(),

  constraint campaign_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint campaign_applications_one_per_profile
    unique (campaign_id, profile_id),
  constraint campaign_applications_review_note_length_check
    check (review_note is null or char_length(review_note) <= 500),
  -- Same state-machine guard as campaign_entries: structurally impossible to
  -- have e.g. an "approved" application with no reviewer on record.
  constraint campaign_applications_review_state_check
    check (
      (status = 'pending'  and reviewed_by is null     and reviewed_at is null)
      or
      (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
    )
);

create index if not exists campaign_applications_campaign_status_idx
  on public.campaign_applications (campaign_id, status);
create index if not exists campaign_applications_profile_idx
  on public.campaign_applications (profile_id);

alter table public.campaign_applications enable row level security;

drop policy if exists "campaign_applications_select_own_or_admin" on public.campaign_applications;
create policy "campaign_applications_select_own_or_admin"
  on public.campaign_applications for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- No direct INSERT/UPDATE policy, same reasoning as campaign_entries: every
-- write goes through the RPCs below, which is what makes their guarantees
-- (one application per person, idempotent review) actually airtight rather
-- than just conventions the frontend happens to follow.
revoke all on table public.campaign_applications from anon, authenticated;
grant select on table public.campaign_applications to authenticated;

-- ---------------------------------------------------------------------------
-- 3. submit_campaign_application — a member applies. No capacity check here
--    on purpose: unlike entries (where max_entries is a hard cap on paid
--    spots), there's no reason to cap how many people can APPLY — the whole
--    point of this campaign type is that the admin decides who's worthy
--    from among everyone who applies, not that applying itself is scarce.
-- ---------------------------------------------------------------------------

create or replace function public.submit_campaign_application(
  p_campaign_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile   public.profiles%rowtype;
  selected_campaign  public.campaigns%rowtype;
  created_application_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'You must be signed in to apply';
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

  select * into selected_campaign from public.campaigns where id = p_campaign_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  if selected_campaign.status <> 'live' then
    raise exception using errcode = '55000', message = 'This campaign is not live';
  end if;

  if selected_campaign.campaign_type <> 'application_required' then
    raise exception using errcode = '55000', message = 'This campaign does not require an application';
  end if;

  if selected_campaign.end_date is not null and selected_campaign.end_date <= now() then
    raise exception using errcode = '55000', message = 'This campaign has ended';
  end if;

  if exists (
    select 1 from public.campaign_applications
    where campaign_id = p_campaign_id and profile_id = auth.uid()
  ) then
    raise exception using errcode = '23505', message = 'You have already applied to this campaign';
  end if;

  insert into public.campaign_applications (campaign_id, profile_id)
  values (p_campaign_id, auth.uid())
  returning id into created_application_id;

  return created_application_id;
end;
$$;

revoke all on function public.submit_campaign_application(uuid) from public;
grant execute on function public.submit_campaign_application(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. review_campaign_application — admin approves/rejects. Same idempotency
--    reasoning as review_campaign_entry: the row-lock plus the "must
--    currently be pending" check makes double-reviewing (two admins, or a
--    retried request) structurally impossible, not just unlikely.
-- ---------------------------------------------------------------------------

create or replace function public.review_campaign_application(
  p_application_id uuid,
  p_status text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_application public.campaign_applications%rowtype;
  normalized_review_note text := nullif(btrim(p_review_note), '');
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Review status must be approved or rejected';
  end if;

  if normalized_review_note is not null and char_length(normalized_review_note) > 500 then
    raise exception using errcode = '22023', message = 'Review notes cannot exceed 500 characters';
  end if;

  select * into selected_application from public.campaign_applications where id = p_application_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Application not found';
  end if;

  if selected_application.status <> 'pending' then
    raise exception using errcode = '55000', message = 'This application has already been reviewed';
  end if;

  update public.campaign_applications
  set
    status = p_status,
    review_note = normalized_review_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = selected_application.id;
end;
$$;

revoke all on function public.review_campaign_application(uuid, text, text) from public;
grant execute on function public.review_campaign_application(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. The actual gate. submit_campaign_entry now checks, for
--    application_required campaigns specifically, that the caller has an
--    APPROVED application on file before letting them submit an entry at
--    all. Direct-submission campaigns are completely unaffected — this
--    check only activates for the new type.
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

  if selected_campaign.end_date is not null and selected_campaign.end_date <= now() then
    raise exception using errcode = '55000', message = 'This campaign has ended';
  end if;

  -- NEW: the application gate. Checked after the general campaign-state
  -- checks above (a closed/expired campaign should say so, not "you need to
  -- apply first," even if it also happens to require applications) but
  -- before the duplicate-entry and capacity checks, since "you haven't been
  -- approved to enter this" is the more useful message for someone who
  -- skipped the application step entirely.
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
-- 6. export — handle + status for every application on a campaign, same
--    shape/reasoning as export_campaign_submissions.
-- ---------------------------------------------------------------------------

create or replace function public.export_campaign_applications(p_campaign_id uuid)
returns table (
  x_handle text,
  status text,
  applied_at timestamptz
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
  select profile.x_handle::text, application.status, application.applied_at
  from public.campaign_applications as application
  join public.profiles as profile on profile.id = application.profile_id
  where application.campaign_id = p_campaign_id
  order by application.applied_at, profile.x_handle;
end;
$$;

revoke all on function public.export_campaign_applications(uuid) from public;
grant execute on function public.export_campaign_applications(uuid) to authenticated;
