-- Alpha Vault — Campaign & Rewards: role management
-- =====================================================
-- Run AFTER campaign_schema_04_admin_features.sql. Supabase → SQL Editor →
-- paste → Run. Safe to re-run.
--
-- WHY THIS EXISTS: up to now, promoting someone to admin required an admin
-- running a raw SQL UPDATE by hand — fine for bootstrapping the very first
-- admin, but not something a non-technical client can do themselves, and not
-- something that should require pinging a developer every time. This RPC
-- lets any existing admin promote (or demote) another member from the
-- Members page in the app itself.

create or replace function public.set_member_role(
  p_profile_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_role not in ('creator', 'admin') then
    raise exception using errcode = '22023', message = 'Role must be creator or admin';
  end if;

  if p_profile_id = auth.uid() then
    raise exception using errcode = '22023', message = 'You cannot change your own role';
  end if;

  -- Guards against a real lockout scenario: if this change would demote the
  -- only remaining admin, every admin page becomes unreachable — nobody
  -- left with access to undo it. Only relevant when actually demoting
  -- someone who is currently an admin; promoting someone, or demoting a
  -- non-admin (a no-op), never needs this check.
  if p_role = 'creator' then
    if exists (select 1 from public.profiles where id = p_profile_id and role = 'admin') then
      select count(*) into admin_count from public.profiles where role = 'admin';
      if admin_count <= 1 then
        raise exception using errcode = '55000', message = 'Cannot remove the last remaining admin';
      end if;
    end if;
  end if;

  update public.profiles set role = p_role where id = p_profile_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public;
grant execute on function public.set_member_role(uuid, text) to authenticated;
