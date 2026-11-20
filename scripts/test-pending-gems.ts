// scripts/test-pending-gems.ts
// Run: node node_modules/tsx/dist/cli.mjs scripts/test-pending-gems.ts
//
// Bought gems shown before the server credits them (economy fix round E2b,
// src/features/economy/pendingGemsCore.ts), with no React Native:
//  - the review's cases: the starter pack's own coin POST answer, the 5 s
//    re-read and any reward answer used to wipe the bought gems from the
//    screen until the RevenueCat webhook landed (eco-purchases #2, honest
//    "missed");
//  - pending gems are never spendable (honest #4: an exchange right after a
//    purchase paid the coins while the server took no gems);
//  - spends and rewards in between, several purchases, webhooks out of order,
//    a capped reward, the 3-minute window, another account.
// The second half drives a real react-query client through the query guard,
// wired the way src/features/economy/useEconomy.ts wires it.
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import {
  createPendingGems,
  PENDING_GEMS_REREAD_MS,
  PENDING_GEMS_WINDOW_MS,
  rawGems,
  spendableGems,
  withoutPendingGems,
  type GemsCarrier,
} from '../src/features/economy/pendingGemsCore';
import { createQueryGuard } from '../src/lib/queryGuardCore';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Eco extends GemsCarrier { xp: number | null; coins: number | null; gems: number | null; level: number | null; virtualBalance: string }
const eco = (gems: number, coins = 1000): Eco => ({ xp: 10, coins, gems, level: 1, virtualBalance: '0' });

const T0 = 1_800_000_000_000;
const A = 'user-a@example.com';
const B = 'user-b@example.com';

function coreCases(): void {
  // ═══ One purchase, the webhook lands after a few server answers ═══
  {
    const p = createPendingGems();
    const before = eco(100);
    check(p.recordPurchase(A, 500, before, T0), 'record: a purchase of 500 for a signed-in account is recorded');
    const shownNow = p.apply(before, A, T0)!;
    check(shownNow.gems === 600 && shownNow.pendingGems === 500, 'shown at once: 100 + 500 bought (500 pending)', shownNow);
    check(spendableGems(shownNow) === 100, 'not spendable: only the 100 the server has', spendableGems(shownNow));

    // The starter pack's coin POST answers before the webhook: server still 100 gems.
    const coinAnswer = p.apply(eco(100, 6000), A, T0 + 800)!;
    check(coinAnswer.gems === 600 && coinAnswer.coins === 6000 && coinAnswer.pendingGems === 500,
      'eco-purchases #2: a server answer without the credit keeps the bought gems on screen (coins from the answer)', coinAnswer);

    // The 5 s re-read, webhook still not there.
    const reread5 = p.apply(eco(100), A, T0 + 5_000)!;
    check(reread5.gems === 600 && reread5.pendingGems === 500, 'honest missed: the 5 s re-read without the webhook keeps them too', reread5);

    // Applying again to a value that already has them changes nothing (idempotent).
    const again = p.apply(reread5, A, T0 + 5_001)!;
    check(again.gems === 600 && again.pendingGems === 500, 'idempotent: applying to the shown value does not add them twice', again);
    check(rawGems(again) === 100, 'rawGems: the server part of a shown value', rawGems(again));

    // The webhook landed: the 20 s re-read has 600.
    const reread20 = p.apply(eco(600), A, T0 + 20_000)!;
    check(reread20.gems === 600 && reread20.pendingGems === undefined && p.peek() === null,
      'the server has them: shown as the server says, nothing pending any more', { reread20, state: p.peek() });
    check(spendableGems(reread20) === 600, 'and now all 600 are spendable');
  }

  // ═══ Spends and rewards between the purchase and the webhook ═══
  {
    const p = createPendingGems();
    p.recordPurchase(A, 2500, eco(300), T0);
    // The user spends 50 confirmed gems (streak repair) and earns 20 (a quest).
    p.noteDelta(-50);
    p.noteDelta(20);
    // A server answer that already applied both, no webhook yet: 300 - 50 + 20 = 270.
    const mid = p.apply(eco(270), A, T0 + 3_000)!;
    check(mid.gems === 2770 && mid.pendingGems === 2500, 'spends and rewards in between: 270 on the server + 2,500 pending', mid);
    check(spendableGems(mid) === 270, 'spendable stays the server part (270)');
    // Webhook landed: 270 + 2,500.
    const done = p.apply(eco(2770), A, T0 + 9_000)!;
    check(done.gems === 2770 && done.pendingGems === undefined && p.peek() === null,
      'the webhook landed after a spend: recognised (the target followed the app\'s own changes)', done);
  }

  // ═══ An answer that does not include the app's latest change yet ═══
  {
    const p = createPendingGems();
    p.recordPurchase(A, 500, eco(100), T0);
    p.noteDelta(10); // a reward sent, its answer not back yet
    // An older request's answer: no reward, no webhook.
    const older = p.apply(eco(100), A, T0 + 1_000)!;
    check(older.gems === 600 && older.pendingGems === 500, 'an older answer (without the latest reward): still shows the purchase', older);
    // The webhook landed but the reward's answer is not back: 100 + 500.
    const landed = p.apply(eco(600), A, T0 + 2_000)!;
    check(landed.gems === 600 && landed.pendingGems === undefined && p.peek() === null,
      'webhook landed, reward still in flight: the 10 missing is smaller than any purchase, so it ends', landed);
  }

  // ═══ The server capped a reward (it never reaches the target exactly) ═══
  {
    const p = createPendingGems();
    p.recordPurchase(A, 80, eco(40), T0);
    p.noteDelta(30); // the server will cap this reward to 0 (24 h gem budget used up)
    const capped = p.apply(eco(40), A, T0 + 1_000)!;
    check(capped.gems === 120 && capped.pendingGems === 80, 'capped reward, no webhook yet: 40 + 80 pending (never more than bought)', capped);
    const landed = p.apply(eco(120), A, T0 + 4_000)!;
    check(landed.gems === 120 && landed.pendingGems === undefined && p.peek() === null,
      'capped reward, webhook landed: ends (30 short is less than the 80 bought), shows the server\'s 120', landed);
  }

  // ═══ Two purchases, webhooks out of order ═══
  {
    const p = createPendingGems();
    p.recordPurchase(A, 500, eco(0), T0);
    const afterFirst = p.apply(eco(0), A, T0)!;
    p.recordPurchase(A, 1200, afterFirst, T0 + 10_000);
    const both = p.apply(eco(0), A, T0 + 11_000)!;
    check(both.gems === 1700 && both.pendingGems === 1700, 'two purchases pending: 0 + 500 + 1,200', both);
    const secondFirst = p.apply(eco(1200), A, T0 + 12_000)!;
    check(secondFirst.gems === 1700 && secondFirst.pendingGems === 500, 'the second webhook lands first: still shows 1,700 (500 pending)', secondFirst);
    check(spendableGems(secondFirst) === 1200, 'the 1,200 the server has are spendable, the 500 are not');
    const all = p.apply(eco(1700), A, T0 + 13_000)!;
    check(all.gems === 1700 && all.pendingGems === undefined && p.peek() === null, 'both landed: ends', all);
  }

  // ═══ The 3-minute window ═══
  {
    const p = createPendingGems();
    p.recordPurchase(A, 500, eco(100), T0);
    check(p.peek()!.expiresAt === T0 + PENDING_GEMS_WINDOW_MS, 'the window is 3 minutes from the purchase');
    check(!p.expireIfDue(T0 + PENDING_GEMS_WINDOW_MS - 1), 'not over a moment before 3 minutes');
    const late = p.apply(eco(100), A, T0 + PENDING_GEMS_WINDOW_MS + 1)!;
    check(late.gems === 100 && late.pendingGems === undefined && p.peek() === null,
      'after 3 minutes with no webhook: the server\'s balance as it is (the bought gems are no longer shown)', late);
    const p2 = createPendingGems();
    p2.recordPurchase(A, 500, eco(100), T0);
    check(p2.expireIfDue(T0 + PENDING_GEMS_WINDOW_MS) && p2.peek() === null, 'expireIfDue ends it at 3 minutes');
    // A second purchase restarts the window.
    const p3 = createPendingGems();
    p3.recordPurchase(A, 500, eco(100), T0);
    p3.recordPurchase(A, 80, p3.apply(eco(100), A, T0)!, T0 + 120_000);
    check(p3.peek()!.expiresAt === T0 + 120_000 + PENDING_GEMS_WINDOW_MS, 'a second purchase restarts the window');
    const stripped = p3.apply(eco(100), A, T0 + 120_000 + PENDING_GEMS_WINDOW_MS)!;
    check(stripped.gems === 100 && stripped.pendingGems === undefined, 'and ends 3 minutes after the last one');
  }

  // ═══ Accounts ═══
  {
    const p = createPendingGems();
    check(!p.recordPurchase(null, 500, eco(100), T0) && p.peek() === null, 'no account: nothing recorded');
    check(!p.recordPurchase(A, 0, eco(100), T0) && !p.recordPurchase(A, -5, eco(100), T0) && !p.recordPurchase(A, Number.NaN, eco(100), T0),
      'nothing bought (0, negative, NaN): nothing recorded');
    p.recordPurchase(A, 500, eco(100), T0);
    const other = p.apply(eco(7), B, T0 + 1_000)!;
    check(other.gems === 7 && other.pendingGems === undefined && p.peek() === null,
      'another account\'s answer: never shows A\'s purchase, and A\'s pending state ends', other);
    p.recordPurchase(A, 500, eco(100), T0);
    p.clear();
    const afterClear = p.apply(eco(100), A, T0 + 1_000)!;
    check(afterClear.gems === 100 && afterClear.pendingGems === undefined, 'clear() (sign-out / wipe): nothing shown any more');
    // A cached value that still carries the overlay after the state ended is stripped back to the server part.
    const leftover = p.apply({ ...eco(600), pendingGems: 500 }, A, T0 + 2_000)!;
    check(leftover.gems === 100 && leftover.pendingGems === undefined, 'a leftover shown value is put back to the server part');
  }

  // ═══ Edge values ═══
  {
    const p = createPendingGems();
    check(p.apply(null, A, T0) === null && p.apply(undefined, A, T0) === undefined, 'null / undefined pass through');
    const untouched = eco(5);
    check(p.apply(untouched, A, T0) === untouched, 'no pending state: the same object comes back (no needless cache churn)');
    p.recordPurchase(A, 500, { ...eco(0), gems: null }, T0);
    const fromNull = p.apply({ ...eco(0), gems: null }, A, T0)!;
    check(fromNull.gems === 500 && fromNull.pendingGems === 500, 'a server row with gems null counts as 0', fromNull);
    check(spendableGems(null) === 0 && spendableGems(undefined) === 0 && spendableGems({ gems: 3, pendingGems: 10 }) === 0,
      'spendableGems never goes below 0');
    check(PENDING_GEMS_REREAD_MS.join() === [5_000, 20_000, 60_000, PENDING_GEMS_WINDOW_MS + 1_000].join(),
      're-reads at 5 s, 20 s, 60 s and just after 3 minutes', PENDING_GEMS_REREAD_MS);
  }

  // ═══ What a snapshot saves (boot fix B7: writeEconomySnapshot) ═══
  {
    const shown: Eco = { ...eco(600, 1200), pendingGems: 500 };
    const saved = withoutPendingGems(shown);
    check(saved.gems === 100 && saved.coins === 1200 && saved.pendingGems === undefined && !('pendingGems' in saved),
      'withoutPendingGems: the server part only (600 shown, 500 pending → 100), the field removed', saved);
    check(shown.pendingGems === 500 && shown.gems === 600, 'withoutPendingGems: the shown value is not changed');
    const plain = eco(7);
    check(withoutPendingGems(plain) === plain, 'withoutPendingGems: a server answer comes back as it is (same object)');
  }
}

/**
 * The app binding (useEconomy.ts / useEconomyUIStore.ts) against a real
 * react-query client: the GET goes through the query guard and then
 * withPendingGems; POST answers and the purchase write go through
 * withPendingGems; a gem spend notes its delta.
 */
async function cacheCases(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false } } });
  let authId: string | null = A;
  const guard = createQueryGuard(client, () => authId);
  const key = ['economy'];
  const pending = createPendingGems();
  let now = T0;
  const withPendingGems = (e: Eco | null): Eco | null => pending.apply(e, authId, now) ?? null;
  let server = eco(100, 1000);
  const snapshots: Eco[] = [];
  const guarded = guard.guardedQueryFn<Eco | null>(key, async () => { await sleep(5); return { ...server }; }, (v) => { if (v) snapshots.push(v); });
  const economyQueryFn = async () => withPendingGems(await guarded());

  const observer = new QueryObserver(client, { queryKey: key, queryFn: economyQueryFn });
  const unsub = observer.subscribe(() => {});
  await sleep(20);
  const shown = () => client.getQueryData<Eco | null>(key)!;
  check(shown().gems === 100, 'cache: first read shows the server balance');

  // Purchase completes (expectPurchasedEconomyCredit).
  pending.recordPurchase(authId, 500, shown(), now);
  client.setQueryData<Eco | null>(key, withPendingGems(shown()));
  check(shown().gems === 600 && spendableGems(shown()) === 100, 'cache: bought gems shown at once, not spendable');

  // A reward POST answers (fireEconomyDelta .then) before the webhook.
  pending.noteDelta(0);
  server = eco(100, 1150);
  client.setQueryData<Eco | null>(key, withPendingGems({ ...server }));
  check(shown().gems === 600 && shown().coins === 1150, 'cache: a reward\'s answer keeps the bought gems (the bug: they vanished here)');

  // The 5 s re-read: invalidate → refetch through the guard, webhook not there.
  now = T0 + 5_000;
  await client.invalidateQueries({ queryKey: key });
  await sleep(20);
  check(shown().gems === 600 && shown().pendingGems === 500, 'cache: the 5 s re-read keeps them (the bug: they vanished at 5 s)');
  check(snapshots.every((s) => s.pendingGems === undefined) && snapshots[snapshots.length - 1].gems === 100,
    'snapshot: only what the server sent is saved (never the pending gems)', snapshots);

  // The user tries the 2,500 exchange: only 100 is spendable.
  check(spendableGems(shown()) < 2500, 'cache: the exchange check sees 100, not 600 (honest #4)');
  // They spend 50 confirmed gems instead (a local optimistic write + POST).
  pending.noteDelta(-50);
  client.setQueryData<Eco | null>(key, (old) => (old ? { ...old, gems: (old.gems ?? 0) - 50 } : old));
  check(shown().gems === 550 && spendableGems(shown()) === 50, 'cache: an optimistic spend keeps the pending part (spread of the old value)');
  server = eco(50, 1150);
  client.setQueryData<Eco | null>(key, withPendingGems({ ...server }));
  check(shown().gems === 550 && shown().pendingGems === 500, 'cache: the spend\'s answer: 50 + 500 pending');

  // A GET in flight while a local write happens: the guard keeps the cached
  // value, and applying the overlay to it again does not double it.
  now = T0 + 20_000;
  server = eco(550, 1150); // the webhook landed
  const refetch = client.refetchQueries({ queryKey: key });
  await sleep(1);
  client.setQueryData<Eco | null>(key, (old) => (old ? { ...old, coins: (old.coins ?? 0) + 10 } : old));
  await refetch;
  await sleep(5);
  check(shown().gems === 550 && shown().pendingGems === 500 && shown().coins === 1160,
    'cache: a GET dropped by the guard returns the cached value; no double overlay', shown());

  // The next re-read sees the webhook's credit: the pending part ends.
  await client.invalidateQueries({ queryKey: key });
  await sleep(20);
  check(shown().gems === 550 && shown().pendingGems === undefined && pending.peek() === null,
    'cache: the re-read with the webhook\'s credit shows the server as it is', shown());
  check(spendableGems(shown()) === 550, 'cache: everything spendable now');

  // Sign-out: cleared; a late answer for A never brings anything back for B.
  pending.recordPurchase(authId, 80, shown(), now);
  client.clear();
  pending.clear();
  authId = B;
  client.setQueryData<Eco | null>(key, withPendingGems(eco(3)));
  check(shown().gems === 3 && shown().pendingGems === undefined, 'cache: after sign-out and another sign-in nothing of A\'s purchase shows');
  unsub();
}

async function main(): Promise<void> {
  coreCases();
  await cacheCases();
  console.log(`\n${passed} passed, ${failed} failed`);
  // The query client's gc timers would keep Node alive for gcTime.
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
