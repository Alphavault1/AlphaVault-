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
  -- Mirrors submit_campaign_entry's own side effect — a real entry always
  -- increments this at submission time, before it can ever be reviewed.
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = alice_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, bob_id, 'https://x.com/bob/status/1', '0xBBBBBBBBBBBBBBBBBBBB', 'usdc_base')
  returning id into entry_bob;
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = bob_id;

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
-- SCENARIO B — the actual risk this script exists to catch, now that the
-- protection has been built.
--
-- Accept one entry at reward_amount=25 (bob is credited $25). Then attempt
-- to change the campaign's reward_amount to $15 — standing in for what the
-- campaign-editing feature's own form would attempt. This is no longer a
-- bare UPDATE the way it was before campaigns_prevent_locked_field_changes
-- existed (migration 10) — it's wrapped in its own nested block specifically
-- to CATCH the exception that update should now raise, and check that it
-- actually was raised, rather than let it abort the whole script.
--
-- If the trigger is doing its job, that UPDATE never succeeds — meaning
-- reward_amount stays 25, and deleting the campaign afterward correctly
-- reverses exactly what was paid, back to 0. This is the same scenario that
-- used to fail (leaving bob $10 richer than he should be) now proving the
-- fix actually closes that gap, not just that the code compiles.
-- ---------------------------------------------------------------------------
do $$
declare
  bob_id uuid; admin_id uuid; campaign_id uuid; entry_id uuid; earnings numeric;
  reward_after_attempt numeric;
begin
  select value into bob_id   from test_ids where key = 'bob';
  select value into admin_id from test_ids where key = 'admin';

  insert into public.campaigns (name, requirements, max_entries, reward_amount, status, created_by)
  values ('Regression test B', array['Post about it'], 10, 25.00, 'live', admin_id)
  returning id into campaign_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, bob_id, 'https://x.com/bob/status/2', '0xCCCCCCCCCCCCCCCCCCCC', 'usdt_bep20')
  returning id into entry_id;
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = bob_id;

  perform public.review_campaign_entry(entry_id, 'accepted', null);

  select total_earnings into earnings from public.profiles where id = bob_id;
  insert into test_results (scenario, passed, detail) values (
    'B.1 — bob correctly credited 25 at the original price', earnings = 25.00,
    format('bob.total_earnings = %s (expected 25.00)', earnings)
  );

  -- Nested block specifically to catch the exception the trigger SHOULD
  -- raise here — without this nested begin/exception, an unhandled
  -- exception would abort the entire script at this line, and none of the
  -- scenarios after this one would ever run or report anything.
  begin
    update public.campaigns set reward_amount = 15.00 where id = campaign_id;
    -- Reaching this line means the UPDATE succeeded — the trigger did NOT
    -- block it. That's a real failure of the protection, not a test-script
    -- problem.
    insert into test_results (scenario, passed, detail) values (
      'B.2 — reward_amount change is BLOCKED once an entry is accepted', false,
      'The UPDATE succeeded when it should have been rejected — campaigns_prevent_locked_field_changes is not protecting this case.'
    );
  exception
    when others then
      insert into test_results (scenario, passed, detail) values (
        'B.2 — reward_amount change is BLOCKED once an entry is accepted', true,
        format('Correctly rejected by the database: %s', sqlerrm)
      );
  end;

  -- Independent confirmation, not just trusting that the exception implies
  -- nothing changed: read the value back directly.
  select reward_amount into reward_after_attempt from public.campaigns where id = campaign_id;
  insert into test_results (scenario, passed, detail) values (
    'B.3 — reward_amount is still 25 after the blocked attempt', reward_after_attempt = 25.00,
    format('campaigns.reward_amount = %s (expected still 25.00, unchanged)', reward_after_attempt)
  );

  perform public.delete_campaign(campaign_id);

  select total_earnings into earnings from public.profiles where id = bob_id;
  insert into test_results (scenario, passed, detail) values (
    'B.4 — delete correctly reverses the full 25 (reward_amount was never actually changed)',
    earnings = 0,
    format('bob.total_earnings = %s (expected 0.00 — a non-zero value here would mean the lock failed to hold and earnings are corrupted)', earnings)
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
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = carol_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_2, carol_id, 'https://x.com/carol/status/2', '0xEEEEEEEEEEEEEEEEEEEE', 'usdc_base')
  returning id into entry_2;
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = carol_id;

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
-- SCENARIO D — the trigger's OTHER rule, never tested until now: max_entries
-- can't drop below however many entries already exist, even before any
-- acceptance at all (this is independent of Scenario B's lock, which only
-- kicks in once an entry is ACCEPTED — this rule applies to pending entries
-- too, from the moment a campaign has any entries whatsoever).
--
-- alice and bob are reused here — both fully reset to 0/0/0/$0 by the
-- deletes in scenarios A and B above, so they're safe to reuse as a clean
-- slate rather than declaring two more fake profiles for one scenario.
-- ---------------------------------------------------------------------------
do $$
declare
  alice_id uuid; bob_id uuid; admin_id uuid; campaign_id uuid;
  entry_alice uuid; entry_bob uuid; max_after_attempt integer;
begin
  select value into alice_id from test_ids where key = 'alice';
  select value into bob_id   from test_ids where key = 'bob';
  select value into admin_id from test_ids where key = 'admin';

  insert into public.campaigns (name, requirements, max_entries, reward_amount, status, created_by)
  values ('Regression test D', array['Post about it'], 5, 10.00, 'live', admin_id)
  returning id into campaign_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, alice_id, 'https://x.com/alice/status/2', '0xFFFFFFFFFFFFFFFFFFFF', 'usdt_bep20')
  returning id into entry_alice;
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = alice_id;

  insert into public.campaign_entries (campaign_id, profile_id, submission_url, wallet_address, payment_method)
  values (campaign_id, bob_id, 'https://x.com/bob/status/3', '0x1111111111111111111A', 'usdc_base')
  returning id into entry_bob;
  update public.profiles set campaigns_entered = campaigns_entered + 1 where id = bob_id;

  -- Two pending entries now exist (neither accepted yet) — occupied=2.
  -- Attempting to drop max_entries to 1 (below the 2 already submitted)
  -- should be blocked, even though accepted_count is still 0 and Scenario
  -- B's lock hasn't engaged at all.
  begin
    update public.campaigns set max_entries = 1 where id = campaign_id;
    insert into test_results (scenario, passed, detail) values (
      'D.1 — max_entries can''t drop below entries already submitted', false,
      'The UPDATE to max_entries=1 succeeded when it should have been rejected — 2 entries already exist.'
    );
  exception
    when others then
      insert into test_results (scenario, passed, detail) values (
        'D.1 — max_entries can''t drop below entries already submitted', true,
        format('Correctly rejected by the database: %s', sqlerrm)
      );
  end;

  -- Boundary check: setting it to EXACTLY the occupied count (2) should be
  -- allowed — this rule is "can't go below," not "can't go below or equal."
  update public.campaigns set max_entries = 2 where id = campaign_id;
  select max_entries into max_after_attempt from public.campaigns where id = campaign_id;
  insert into test_results (scenario, passed, detail) values (
    'D.2 — max_entries CAN be set to exactly the occupied count (boundary)',
    max_after_attempt = 2,
    format('campaigns.max_entries = %s (expected 2 — this update should succeed)', max_after_attempt)
  );

  -- Normal editing still works when nothing is locked: raising it well
  -- above occupied should succeed without any error.
  update public.campaigns set max_entries = 20 where id = campaign_id;
  select max_entries into max_after_attempt from public.campaigns where id = campaign_id;
  insert into test_results (scenario, passed, detail) values (
    'D.3 — max_entries can be freely raised when nothing is locked',
    max_after_attempt = 20,
    format('campaigns.max_entries = %s (expected 20)', max_after_attempt)
  );

  perform public.delete_campaign(campaign_id);
end $$;


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

-- ---------------------------------------------------------------------------
-- Results — a real SELECT, not just RAISE messages.
-- ---------------------------------------------------------------------------
-- RAISE NOTICE/WARNING write to a separate message channel that some SQL
-- clients surface differently (or not at all) in their UI. A plain SELECT
-- is guaranteed to show up in the Results grid every single client
-- supports — so that's the reliable source of truth here, not the RAISE
-- lines above (those stay too, as a convenience if your client does show
-- them, but don't rely on them alone).
--
-- This runs BEFORE the rollback below, which is exactly why it's safe: a
-- SELECT sends its rows back to you the instant it executes, inside the
-- still-open transaction. The rollback that follows only undoes the DATA
-- CHANGES (the fake profiles, campaigns, entries) — it has no effect on
-- results you've already received. You'll see this table, and the database
-- will still end up with zero trace of any of this afterward.
select
  scenario,
  case when passed then 'PASS' else 'FAIL' end as result,
  detail
from test_results
order by id;

-- Unconditional — nothing this script did is ever kept, pass or fail.
rollback;
