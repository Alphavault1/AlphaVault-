-- Alpha Vault — Phase 1 database schema
-- =====================================
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
--
-- Design notes:
--   * All writes happen server-side via the service-role key (see
--     app/api/apply/route.ts). The browser never touches this table.
--   * Row Level Security is ENABLED with NO public policies, so the anon/public
--     key cannot read or write applications at all. Only the service role
--     (which bypasses RLS) can — exactly what we want for an applications table.
--   * `status`, `reviewed_by`, and `reviewed_at` are here now but only used
--     starting Phase 2 (the Discord approve/reject flow). New rows are 'pending'.

create table if not exists public.applications (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  discord_username text not null,
  x_handle         text,
  role             text not null,
  work_url         text not null,
  note             text,

  -- Application lifecycle (Phase 2 flips this).
  status           text not null default 'pending',
  reviewed_by      text,
  reviewed_at      timestamptz,

  -- Integrity guards. Keep the role list in sync with APPLICANT_ROLES in
  -- lib/applicationSchema.ts.
  constraint applications_role_check
    check (role in (
      'Developer',
      'Designer',
      'Trading & Alpha',
      'Content & Community',
      'Founder & BD',
      'Other'
    )),
  constraint applications_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

-- Fast lookups for the Phase 2 admin view: newest first, filter by status.
create index if not exists applications_created_at_idx
  on public.applications (created_at desc);
create index if not exists applications_status_idx
  on public.applications (status);

-- Lock the table down. RLS on + no policies = anon/public key has no access.
alter table public.applications enable row level security;
