// scripts/test-pro-override.ts
// Run: node node_modules/tsx/dist/cli.mjs scripts/test-pro-override.ts
//
// "The store says Pro" for this session (economy fix round E5a,
// src/features/subscription/proOverrideCore.ts), with no React Native:
//  - eco-pro #1: after a purchase (or a launch where the store says Pro and the
//    server lags) the first refetch, ~30 s later, wrote the server's "not Pro"
//    back and locked a paying user out;
//  - the override lasts until the entitlement's expiry (24 h without one), is
//    per account, ends when a fresh store answer lacks the entitlement, on
//    sign-out and on the account wipe;
//  - only what is shown changes: the snapshot keeps the server's answer.
// The second half drives a real react-query client through the query guard,
// wired the way src/features/subscription/useSubscription.ts wires it.
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import {
  createStoreProOverride,
  NO_EXPIRY_OVERRIDE_MS,
  parseStoreDate,
  type SubscriptionLike,
} from '../src/features/subscription/proOverrideCore';
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

const T0 = Date.parse('2026-11-20T12:00:00Z');
const A = 'a@example.com';
const B = 'b@example.com';
const notPro: SubscriptionLike = { isPro: false, proExpiresAt: null, proSource: null };
const serverPro: SubscriptionLike = { isPro: true, proExpiresAt: '2026-12-20 10:00:00+00', proSource: 'store' };
const in30Days = '2026-12-20T12:00:00Z';

function coreCases(): void {
  // ═══ Set from a fresh answer that lists Pro ═══
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: in30Days }, T0);
    const shown = o.apply(notPro, A, T0 + 30_000)!;
    check(shown.isPro === true && shown.proExpiresAt === in30Days && shown.proSource === null,
      'eco-pro #1: the server says not Pro 30 s later, the store said Pro → shown as Pro', shown);
    check(o.apply(notPro, A, Date.parse(in30Days) - 1)!.isPro === true, 'still Pro just before the entitlement expires');
    const after = o.apply(notPro, A, Date.parse(in30Days))!;
    check(after.isPro === false && o.peek() === null, 'from the entitlement\'s expiry on: the server\'s answer again', after);
  }
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: null }, T0);
    check(o.peek()!.untilMs === T0 + NO_EXPIRY_OVERRIDE_MS && NO_EXPIRY_OVERRIDE_MS === 24 * 3600_000,
      'no expiry (lifetime / unknown): valid for 24 hours');
    check(o.apply(notPro, A, T0 + NO_EXPIRY_OVERRIDE_MS - 1)!.isPro === true && o.apply(notPro, A, T0 + NO_EXPIRY_OVERRIDE_MS)!.isPro === false,
      'and not after 24 hours');
    const o2 = createStoreProOverride();
    o2.noteStoreAnswer(A, {}, T0);
    check(o2.peek()!.untilMs === T0 + NO_EXPIRY_OVERRIDE_MS, 'an entitlement with no expirationDate field: 24 hours too');
    const o3 = createStoreProOverride();
    o3.noteStoreAnswer(A, { expirationDate: 'not a date' }, T0);
    check(o3.peek()!.untilMs === T0 + NO_EXPIRY_OVERRIDE_MS && o3.peek()!.expirationDate === null, 'an unreadable expiry counts as none (24 hours, shown without a date)');
  }
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: '2026-11-19T12:00:00Z' }, T0);
    check(o.peek() === null && o.apply(notPro, A, T0)!.isPro === false,
      'an entitlement listed as active but already expired (a stale copy): no override');
  }

  // ═══ What ends it ═══
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: in30Days }, T0);
    o.noteStoreAnswer(A, null, T0 + 60_000);
    check(o.peek() === null && o.apply(notPro, A, T0 + 61_000)!.isPro === false,
      'a fresh answer without the entitlement ends it (cancelled / refunded)');
  }
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: in30Days }, T0);
    o.clear();
    check(o.apply(notPro, A, T0)!.isPro === false, 'clear() (sign-out / account wipe) ends it');
  }

  // ═══ Per account ═══
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(null, { expirationDate: in30Days }, T0);
    check(o.peek() === null, 'no signed-in account: nothing set');
    o.noteStoreAnswer(A, { expirationDate: in30Days }, T0);
    const forB = o.apply(notPro, B, T0);
    check(forB === notPro, 'another account never gets it (the server answer comes back untouched)');
    check(o.apply(notPro, null, T0) === notPro, 'no account: untouched');
    check(o.apply(notPro, A, T0)!.isPro === true, 'the account it was set for still gets it');
  }

  // ═══ The server's answer when it already says Pro, and null ═══
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: in30Days }, T0);
    check(o.apply(serverPro, A, T0) === serverPro, 'the server says Pro: its own answer is shown (its expiry, its source)');
    const fromNull = o.apply(null, A, T0)!;
    check(fromNull.isPro === true && fromNull.proSource === null, 'the server has no row (null): Pro shown', fromNull);
    const promo = o.apply({ isPro: false, proExpiresAt: null, proSource: 'promotional' }, A, T0)!;
    check(promo.isPro === true && promo.proSource === 'promotional', 'the server\'s source is kept', promo);
    const none = createStoreProOverride();
    check(none.apply(notPro, A, T0) === notPro && none.apply(null, A, T0) === null, 'no override: everything passes through');
  }

  // ═══ Never saved ═══
  {
    const o = createStoreProOverride();
    o.noteStoreAnswer(A, { expirationDate: in30Days }, T0);
    const shown = o.apply(notPro, A, T0)!;
    check(o.rawOf(shown) === notPro, 'rawOf: the server answer behind an overridden value (what the snapshot saves)');
    const shownFromNull = o.apply(null, A, T0)!;
    check(o.rawOf(shownFromNull) === null, 'rawOf: a null server answer stays null');
    check(o.rawOf(serverPro) === serverPro && o.rawOf(null) === null && o.rawOf(undefined) === undefined,
      'rawOf: anything not overridden comes back as it is');
    // react-query's structural sharing may store a copy of what the query
    // function returned: the server answer must survive the copy.
    const copy = JSON.parse(JSON.stringify(shown)) as SubscriptionLike;
    const fromCopy = o.rawOf(copy);
    check(copy.isPro === true && fromCopy?.isPro === false && fromCopy.proSource === null,
      'rawOf: a copy of an overridden value (structural sharing) still gives the server answer', fromCopy);
    // Applying again to a value it produced works from the server answer inside.
    const again = o.apply(shown, A, T0)!;
    check(again.isPro === true && o.rawOf(again) === notPro, 'apply is idempotent (no override of an override)');
    o.clear();
    check(o.apply(shown, A, T0) === notPro, 'after clear(), an overridden value left in the cache turns back into the server answer');
  }

  check(parseStoreDate('2026-12-20T12:00:00Z') === Date.parse('2026-12-20T12:00:00Z') && parseStoreDate(null) === null && parseStoreDate('') === null,
    'parseStoreDate reads RevenueCat\'s ISO dates');
}

/** The app binding (useSubscription.ts) against a real react-query client. */
async function cacheCases(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false } } });
  let authId: string | null = A;
  let now = T0;
  const guard = createQueryGuard(client, () => authId);
  const key = ['subscription'];
  const o = createStoreProOverride();
  const withStoreProOverride = (sub: SubscriptionLike | null) => o.apply(sub, authId, now);
  const snapshots: Array<SubscriptionLike | null> = [];
  const writeSubscriptionSnapshot = (sub: SubscriptionLike | null | undefined) => {
    snapshots.push((o.rawOf(sub) ?? null) as SubscriptionLike | null);
  };
  let server: SubscriptionLike = notPro;
  let reads = 0;
  const guarded = guard.guardedQueryFn<SubscriptionLike | null>(key, async () => { reads++; await sleep(5); return { ...server }; }, (v) => writeSubscriptionSnapshot(v));
  const subscriptionQueryFn = async () => withStoreProOverride(await guarded());

  const observer = new QueryObserver(client, { queryKey: key, queryFn: subscriptionQueryFn });
  const unsub = observer.subscribe(() => {});
  await sleep(20);
  const shown = () => client.getQueryData<SubscriptionLike | null>(key);
  check(shown()?.isPro === false, 'cache: before the purchase, not Pro');

  // The purchase: the store's fresh answer lists Pro, the server can't confirm yet.
  o.noteStoreAnswer(authId, { expirationDate: in30Days }, now);
  const answer = { ...notPro }; // POST answer: still not Pro
  writeSubscriptionSnapshot(answer);
  client.setQueryData(key, withStoreProOverride(answer));
  check(shown()?.isPro === true, 'cache: right after the purchase, Pro on screen');

  // ~40 s later a screen mounts on stale data → refetch; the server still says not Pro.
  now = T0 + 40_000;
  await client.invalidateQueries({ queryKey: key });
  await sleep(20);
  check(reads === 2 && shown()?.isPro === true, 'cache: the refetch 40 s later keeps Pro (the bug: locked out here)', { reads, shown: shown() });
  check(snapshots.length > 0 && snapshots.every((s) => s?.isPro === false),
    'snapshot: only the server\'s "not Pro" is ever saved (the next launch asks again)', snapshots);
  // What the boot's sign-in path would snapshot from the cache (the stored value, possibly a copy).
  writeSubscriptionSnapshot(shown());
  check(snapshots[snapshots.length - 1]?.isPro === false, 'snapshot: saving the cached (shown) value still saves the server\'s answer');

  // The webhook lands: the server says Pro with its own data.
  server = serverPro;
  now = T0 + 120_000;
  await client.invalidateQueries({ queryKey: key });
  await sleep(20);
  check(shown()?.isPro === true && shown()?.proSource === 'store' && snapshots[snapshots.length - 1]?.isPro === true,
    'cache: once the server agrees, its own answer is shown and saved');

  // The subscription is cancelled: a fresh store answer lacks Pro, the server agrees.
  o.noteStoreAnswer(authId, null, now);
  server = notPro;
  await client.invalidateQueries({ queryKey: key });
  await sleep(20);
  check(shown()?.isPro === false, 'cache: the store and the server say not Pro → not Pro');

  // Sign-out clears it; another account never sees it.
  o.noteStoreAnswer(authId, { expirationDate: in30Days }, now);
  client.clear();
  o.clear();
  authId = B;
  client.setQueryData(key, withStoreProOverride(notPro));
  check(shown()?.isPro === false, 'cache: after sign-out and another sign-in, nothing of A\'s store answer shows');
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
