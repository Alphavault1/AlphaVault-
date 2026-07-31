-- Alpha Vault — Money-math regression check
-- ============================================
-- WHAT THIS IS: a self-contained script that creates fake test data, runs
-- your REAL production functions (review_campaign_entry, delete_campaign)
-- against it, and checks the resulting numbers against what they SHOULD be.
-- It is not a framework, not a dependency, not something that needs
-- installing — it's one SQL file you paste into Supabase's SQL Editor and
-- run, same as any migration.
--
-- SAFETY — READ THIS FIRST:
-- The entire script runs inside one transaction that ends in `rollback` —
-- see the very last line. Nothing it does is ever kept, pass or fail. Even
-- the one DDL change it makes (temporarily dropping a foreign key, explained
-- below) is undone automatically by the rollback, because DDL is
-- transactional in Postgres. You can run this against production and it
-- will still leave zero trace — but run it against your SANDBOX project
-- first regardless, as a habit, not because this one is unsafe.
--
-- WHY THE FK GETS TEMPORARILY DROPPED:
-- public.profiles.id is a foreign key to auth.users(id) — a real profile
-- normally only exists because a real person signed up. This script needs
-- fake profiles with fake IDs that were never real users, so the constraint
-- is dropped for the duration of this transaction only, then automatically
-- restored the instant it ends (rollback undoes DDL exactly like it undoes
-- data changes). This assumes the constraint's default Postgres-generated
-- name, profiles_id_fkey — if your database ever renamed it, this drop
-- becomes a silent no-op and the later fake-profile insert will fail loudly
-- with a real foreign-key error instead of proceeding incorrectly. Either
-- way you'll know immediately, not get a false result.
--
-- WHY set_config SIMULATES BEING SIGNED IN:
-- review_campaign_entry and delete_campaign both check public.is_admin(),
-- which checks auth.uid() — the ID of whoever is "currently signed in."
-- There's no real signed-in session in a SQL Editor run, so this script
-- fakes one the same way Supabase's own docs describe for testing:
-- set_config('request.jwt.claims', ...). Right after setting it, the script
-- immediately checks that auth.uid() actually returns the expected fake
-- admin ID before running anything else — if that check fails, everything
-- stops immediately with a clear message, rather than quietly producing
-- meaningless results.
--
-- HOW TO READ THE OUTPUT:
-- Run this in Supabase's SQL Editor, then look at the "Messages" panel (not
-- the results grid) — every check prints PASS or FAIL with the actual
-- numbers involved. A final summary line gives you the total.
--
-- WHAT TO EXPECT THE FIRST TIME YOU RUN THIS:
-- Scenario A (baseline) and Scenario C (multi-campaign safety) should PASS.
-- Scenario B is expected to FAIL right now — not because anything is broken
-- today, but because it proves the exact risk flagged earlier: if a
-- campaign's reward_amount ever changes after entries were already accepted
-- at the old amount, delete_campaign's reversal goes wrong. There's no UI
-- for editing reward_amount yet, so this can't happen through normal use of
-- the site today — but Scenario B forces it directly via SQL to prove the
-- underlying functions aren't protected against it, independent of whether
-- a UI exists yet. This is the concrete evidence behind the proposed rule:
-- lock reward_amount once a campaign has any accepted entries. Once that
-- rule is built, re-run this script — Scenario B should flip to PASS, and
-- that's how you'll know the fix actually worked, not just that it compiled.

begin;

-- ---------------------------------------------------------------------------
-- Setup: allow synthetic profile rows for the duration of this transaction.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Scratch table to pass generated IDs between the DO blocks below. Lives in
-- pg_temp, which is transaction/session-scoped and vanishes on rollback
-- regardless — this is a convenience, not a second safety mechanism.
create temporary table test_ids (key text primary key, value uuid) on commit drop;
create temporary table test_results (
  id serial primary key,
  scenario text not null,
  passed boolean not null,
  detail text not null
) on commit drop;

do $$
declare
  admin_id uuid := gen_random_uuid();
  alice_id uuid := gen_random_uuid();
  bob_id   uuid := gen_random_uuid();
  carol_id uuid := gen_random_uuid();
begin
  insert into test_ids (key, value) values
    ('admin', admin_id), ('alice', alice_id), ('bob', bob_id), ('carol', carol_id);

  insert into public.profiles (id, x_handle, email, role, status)
  values
    (admin_id, 'test_regression_admin', 'regression-admin@example.invalid', 'admin',   'approved'),
    (alice_id, 'test_regression_alice', 'regression-alice@example.invalid', 'creator', 'approved'),
    (bob_id,   'test_regression_bob',   'regression-bob@example.invalid',   'creator', 'approved'),
    (carol_id, 'test_regression_carol', 'regression-carol@example.invalid', 'creator', 'approved');
end $$;

-- Simulate being signed in as the fake admin, then IMMEDIATELY verify it
-- actually worked before trusting a single result below.
do $$
declare
  admin_id uuid;
  resolved uuid;
begin
  select value into admin_id from test_ids where key = 'admin';
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id)::text, true);
  resolved := auth.uid();
  if resolved is distinct from admin_id then
    raise exception 'SETUP FAILED: auth.uid() returned % but expected % — the session-simulation technique this script relies on is not behaving as expected in this database. Stop here; nothing below this point is trustworthy until this is fixed.', resolved, admin_id;
  end if;
  raise notice 'Setup OK: auth.uid() correctly resolves to the fake admin (%).', admin_id;
end $$;

-- ---------------------------------------------------------------------------
-- SCENARIO A — baseline sanity check.
-- Accept one entry, reject another, delete the campaign. Nothing about
-- reward_amount changes mid-flight. Expected: everything reverses to
-- exactly zero, same as it always has.
-- ---------------------------------------------------------------------------
do $$
declare
  alice_id uuid; admin_id uuid; campaign_id uuid; entry_alice uuid; entry_bob uuid; bob_id uuid;
  earnings numeric; entered int; accepted int; rejected int;
begin
  select value into alice_id from test_ids where key = 'alice';
  select value into bob_id   from test_ids where key = 'bob';
  select value into admin_id from test_ids where key = 'admin';

  insert into public.campaigns (name, requirements, max_entries, reward_amount, status, created_by)
  values ('Regression test A', array['Post about it'], 10, 25.00, 'live', admin_id)
  returning id into campaign_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, alice_id, 'https://x.com/alice/status/1', '0xAAAAAAAAAAAAAAAAAAAA', 'usdt_bep20')
  returning id into entry_alice;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, bob_id, 'https://x.com/bob/status/1', '0xBBBBBBBBBBBBBBBBBBBB', 'usdc_base')
  returning id into entry_bob;

  perform public.review_campaign_entry(entry_alice, 'accepted', null);
  perform public.review_campaign_entry(entry_bob, 'rejected', 'Did not meet requirements');

  select total_earnings into earnings from public.profiles where id = alice_id;
  insert into test_results (scenario, passed, detail) values (
    'A.1 — accept credits the right amount', earnings = 25.00,
    format('alice.total_earnings = %s (expected 25.00)', earnings)
  );

  perform public.delete_campaign(campaign_id);

  select total_earnings, campaigns_entered, campaigns_accepted into earnings, entered, accepted
    from public.profiles where id = alice_id;
  insert into test_results (scenario, passed, detail) values (
    'A.2 — delete reverses alice fully (no reward change occurred)',
    earnings = 0 and entered = 0 and accepted = 0,
    format('alice: earnings=%s entered=%s accepted=%s (expected 0/0/0)', earnings, entered, accepted)
  );

  select campaigns_entered, campaigns_rejected into entered, rejected
    from public.profiles where id = bob_id;
  insert into test_results (scenario, passed, detail) values (
    'A.3 — delete reverses bob''s rejection correctly',
    entered = 0 and rejected = 0,
    format('bob: entered=%s rejected=%s (expected 0/0)', entered, rejected)
  );
end $$;

-- ---------------------------------------------------------------------------
-- SCENARIO B — the actual risk this script exists to catch.
-- Accept one entry at reward_amount=25 (bob is credited $25). Then simulate
-- a FUTURE edit-campaign feature changing the price to $15 — today there's
-- no UI for this, so this UPDATE is standing in for that feature directly.
-- Then delete. Expected (correct) result: bob's earnings return to exactly
-- 0, because he should lose exactly what he was actually paid. What CURRENT
-- delete_campaign actually does: subtracts the campaign's price AT THE TIME
-- OF DELETION (15), not the price he was actually paid (25) — leaving him
-- at 25 - 15 = 10, a real $10 error sitting in his earnings total.
-- ---------------------------------------------------------------------------
do $$
declare
  bob_id uuid; admin_id uuid; campaign_id uuid; entry_id uuid; earnings numeric;
begin
  select value into bob_id   from test_ids where key = 'bob';
  select value into admin_id from test_ids where key = 'admin';

  insert into public.campaigns (name, requirements, max_entries, reward_amount, status, created_by)
  values ('Regression test B', array['Post about it'], 10, 25.00, 'live', admin_id)
  returning id into campaign_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, bob_id, 'https://x.com/bob/status/2', '0xCCCCCCCCCCCCCCCCCCCC', 'usdt_bep20')
  returning id into entry_id;

  perform public.review_campaign_entry(entry_id, 'accepted', null);

  select total_earnings into earnings from public.profiles where id = bob_id;
  insert into test_results (scenario, passed, detail) values (
    'B.1 — bob correctly credited 25 at the original price', earnings = 25.00,
    format('bob.total_earnings = %s (expected 25.00)', earnings)
  );

  -- Standing in for a future "edit campaign" feature — this UPDATE is
  -- exactly what that feature would do to reward_amount.
  update public.campaigns set reward_amount = 15.00 where id = campaign_id;

  perform public.delete_campaign(campaign_id);

  select total_earnings into earnings from public.profiles where id = bob_id;
  insert into test_results (scenario, passed, detail) values (
    'B.2 — delete correctly reverses the ORIGINAL amount bob was paid, not the current price',
    earnings = 0,
    format('bob.total_earnings = %s (expected 0.00 — a non-zero value here is real, quantifiable earnings corruption, currently %s off)', earnings, 25.00 - earnings)
  );
end $$;

-- ---------------------------------------------------------------------------
-- SCENARIO C — a profile active in more than one campaign at once.
-- Carol is accepted in TWO campaigns. Deleting one must only reverse that
-- one campaign's contribution, leaving the other fully intact.
-- ---------------------------------------------------------------------------
do $$
declare
  carol_id uuid; admin_id uuid; campaign_1 uuid; campaign_2 uuid; entry_1 uuid; entry_2 uuid;
  earnings numeric; accepted int;
begin
  select value into carol_id from test_ids where key = 'carol';
  select value into admin_id from test_ids where key = 'admin';

  insert into public.campaigns (name, requirements, max_entries, reward_amount, status, created_by)
  values ('Regression test C1', array['Post about it'], 10, 10.00, 'live', admin_id)
  returning id into campaign_1;

  insert into public.campaigns (name, requirements, max_entries, reward_amount, status, created_by)
  values ('Regression test C2', array['Post about it'], 10, 20.00, 'live', admin_id)
  returning id into campaign_2;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_1, carol_id, 'https://x.com/carol/status/1', '0xDDDDDDDDDDDDDDDDDDDD', 'usdt_bep20')
  returning id into entry_1;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_2, carol_id, 'https://x.com/carol/status/2', '0xEEEEEEEEEEEEEEEEEEEE', 'usdc_base')
  returning id into entry_2;

  perform public.review_campaign_entry(entry_1, 'accepted', null);
  perform public.review_campaign_entry(entry_2, 'accepted', null);

  select total_earnings into earnings from public.profiles where id = carol_id;
  insert into test_results (scenario, passed, detail) values (
    'C.1 — carol credited both campaigns (10 + 20)', earnings = 30.00,
    format('carol.total_earnings = %s (expected 30.00)', earnings)
  );

  -- Delete ONLY campaign 1.
  perform public.delete_campaign(campaign_1);

  select total_earnings, campaigns_accepted into earnings, accepted
    from public.profiles where id = carol_id;
  insert into test_results (scenario, passed, detail) values (
    'C.2 — deleting campaign 1 leaves campaign 2''s 20 untouched',
    earnings = 20.00 and accepted = 1,
    format('carol: earnings=%s accepted=%s (expected 20.00/1)', earnings, accepted)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Report — every result, then a summary.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  total int := 0;
  failed int := 0;
begin
  for r in select * from test_results order by id loop
    total := total + 1;
    if r.passed then
      raise notice 'PASS — %: %', r.scenario, r.detail;
    else
      failed := failed + 1;
      raise warning 'FAIL — %: %', r.scenario, r.detail;
    end if;
  end loop;

  raise notice '=================================================';
  if failed = 0 then
    raise notice 'SUMMARY: % / % passed. All money-math checks green.', total, total;
  else
    raise warning 'SUMMARY: %/% FAILED (% passed). See FAIL lines above for exact numbers.', failed, total, total - failed;
  end if;
  raise notice '=================================================';
end $$;

-- Unconditional — nothing this script did is ever kept, pass or fail.
rollback;
