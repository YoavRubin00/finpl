// scripts/test-subscription-fallback.ts
// Run: node node_modules/tsx/dist/cli.mjs scripts/test-subscription-fallback.ts
//
// What a cold start shows as the subscription before the server answers
// (boot fix round B, 20.11; src/features/subscription/subscriptionSeedCore.ts),
// with no React Native:
//  - B3: a saved Pro whose expiry has passed is seeded as not Pro, by the same
//    rule the server reports with (api/_shared/subscriptionSync.ts applyExpiry);
//  - B2: when the boot's server work ends in 'error' (any path, 'cached'
//    included), RevenueCat's cached Pro replaces a saved seed that is not Pro,
//    as a seed; never a server answer, never a Pro seed, never after a
//    sign-out or a takeover, and the first server answer replaces it;
//  - both together: a renewed subscriber whose saved expiry has passed sees
//    Pro offline through RevenueCat.
// The cache cases drive a real react-query client through the query guard,
// wired the way lifecycle.ts and useSubscription.ts wire them.
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import {
  fallsBackToStoreCache,
  mayShowStoreCachePro,
  showStoreCacheProIfNoServerAnswer,
  toEpochMs,
  withExpiryApplied,
  type StoreProState,
} from '../src/features/subscription/subscriptionSeedCore';
import type { SubscriptionLike } from '../src/features/subscription/proOverrideCore';
import { createQueryGuard, type QueryGuard } from '../src/lib/queryGuardCore';
import { applyExpiry } from '../api/_shared/subscriptionSync';

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

const NOW = Date.parse('2026-11-20T12:00:00Z');
const notPro: SubscriptionLike = { isPro: false, proExpiresAt: null, proSource: null };

function dates(): void {
  check(toEpochMs('2026-12-20 10:00:00+00') === Date.parse('2026-12-20T10:00:00Z'), "toEpochMs: Postgres' format (Hermes parses only ISO)");
  check(toEpochMs('2026-12-20 10:00:00.123+00') === Date.parse('2026-12-20T10:00:00.123Z'), 'toEpochMs: with milliseconds');
  check(toEpochMs('2026-12-20 10:00:00+05:30') === Date.parse('2026-12-20T04:30:00Z'), 'toEpochMs: an offset with minutes');
  check(toEpochMs('2026-12-20T10:00:00Z') === Date.parse('2026-12-20T10:00:00Z'), "toEpochMs: ISO (RevenueCat's dates)");
  check(toEpochMs(null) === null && toEpochMs(undefined) === null && toEpochMs('') === null && toEpochMs('soon') === null,
    'toEpochMs: nothing, or something unreadable, is no date');
}

function expiredSnapshots(): void {
  // ═══ B3 ═══
  const lapsed: SubscriptionLike = { isPro: true, proExpiresAt: '2026-11-19 10:00:00+00', proSource: 'store' };
  const shown = withExpiryApplied(lapsed, NOW);
  check(shown.isPro === false && shown.proExpiresAt === lapsed.proExpiresAt && shown.proSource === 'store',
    'B3: a saved Pro whose expiry has passed is seeded as not Pro (the rest kept)', shown);
  check(lapsed.isPro === true, 'B3: the saved value itself is not changed');
  const atNow: SubscriptionLike = { isPro: true, proExpiresAt: new Date(NOW).toISOString(), proSource: 'store' };
  check(withExpiryApplied(atNow, NOW).isPro === false, 'B3: an expiry exactly now counts as passed ("at or before")');
  const active: SubscriptionLike = { isPro: true, proExpiresAt: '2026-12-20 10:00:00+00', proSource: 'store' };
  check(withExpiryApplied(active, NOW) === active, 'B3: an expiry still ahead: unchanged (same object)');
  const lifetime: SubscriptionLike = { isPro: true, proExpiresAt: null, proSource: 'promotional' };
  check(withExpiryApplied(lifetime, NOW) === lifetime, 'B3: Pro with no expiry: unchanged');
  const unreadable: SubscriptionLike = { isPro: true, proExpiresAt: 'soon', proSource: 'store' };
  check(withExpiryApplied(unreadable, NOW) === unreadable, 'B3: an unreadable expiry: unchanged');
  check(withExpiryApplied(notPro, NOW) === notPro, 'B3: not Pro: unchanged');

  // The same answer as the server's own rule, on the same rows.
  const rows: SubscriptionLike[] = [lapsed, atNow, active, lifetime, unreadable, notPro,
    { isPro: true, proExpiresAt: '2026-11-20 11:59:59+00', proSource: null },
    { isPro: null, proExpiresAt: '2026-11-19T00:00:00Z', proSource: null }];
  const mismatches = rows.filter((r) => (withExpiryApplied(r, NOW).isPro === true) !== (applyExpiry(r, NOW)?.isPro === true));
  check(mismatches.length === 0, "B3: the app's rule reports Pro exactly when the server's applyExpiry does", mismatches);
}

function theRules(): void {
  // ═══ B2: when ═══
  check(fallsBackToStoreCache('error', true), "B2: the server work ended in 'error' with a saved session: fall back");
  for (const r of ['ok', 'auth_invalid', 'no_profile', 'superseded']) {
    check(!fallsBackToStoreCache(r, true), `B2: '${r}': no fallback`);
  }
  check(!fallsBackToStoreCache('error', false), 'B2: no saved session: no fallback (nothing shows signed in yet)');

  // ═══ B2: over what ═══
  check(mayShowStoreCachePro(undefined) && mayShowStoreCachePro({ data: undefined, dataUpdatedAt: 0 }),
    'B2: an empty cache (no snapshot, or the read failed): may show');
  check(mayShowStoreCachePro({ data: notPro, dataUpdatedAt: 0 }), 'B2: a saved seed that is not Pro: may show');
  check(!mayShowStoreCachePro({ data: { ...notPro, isPro: true }, dataUpdatedAt: 0 }), 'B2: a seed that already says Pro: left (no downgrade either way)');
  check(!mayShowStoreCachePro({ data: notPro, dataUpdatedAt: NOW }), 'B2: a server answer "not Pro": never replaced');
  check(!mayShowStoreCachePro({ data: null, dataUpdatedAt: NOW }), 'B2: a server answer "no row" (null): never replaced');
}

function makeClient(): QueryClient {
  // Same defaults as src/lib/queryClient.ts.
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false } } });
}

const KEY = ['subscription'];
const RC_PRO: StoreProState = { isPro: true, proExpiresAt: '2026-12-20T10:00:00Z' };

/** lifecycle.ts seedProFromStoreCache, against this client. */
function fallback(client: QueryClient, guard: QueryGuard, o: {
  rc: StoreProState | null;
  readMs?: number;
  isCurrent?: () => boolean;
  duringRead?: () => void;
}) {
  let reads = 0;
  const run = showStoreCacheProIfNoServerAnswer({
    cacheState: () => client.getQueryState(KEY),
    readStoreCache: async () => {
      reads++;
      await sleep(o.readMs ?? 5);
      o.duringRead?.();
      return o.rc;
    },
    isCurrent: o.isCurrent ?? (() => true),
    seed: (value) => { guard.seed(KEY, value); },
  });
  return { run, reads: () => reads };
}

const cached = (client: QueryClient) => client.getQueryData<SubscriptionLike | null>(KEY);

async function cacheCases(): Promise<void> {
  {
    // The 'cached' path, offline: the saved "not Pro" (a purchase the webhook
    // has not confirmed yet) is seeded, the boot's server work fails.
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    guard.seed(KEY, { ...notPro });
    const f = fallback(client, guard, { rc: RC_PRO });
    const result = await f.run;
    const shown = cached(client);
    check(result === 'shown' && shown?.isPro === true && shown.proExpiresAt === RC_PRO.proExpiresAt && shown.proSource === null,
      "B2: a saved 'not Pro' seed + RevenueCat's cached Pro → Pro shown", { result, shown });
    check(client.getQueryState(KEY)?.dataUpdatedAt === 0 && guard.isSeeded(shown),
      'B2: it goes in as a seed (updatedAt 0, marked)');
    check(guard.serverAnswerSince(KEY, 0) === undefined, "B2: never taken for the server's answer (the launch sync compares with a real one)");

    // Back online: the server's answer replaces it, whatever it says.
    let reads = 0;
    const read = guard.guardedQueryFn<SubscriptionLike | null>(KEY, async () => { reads++; await sleep(5); return { ...notPro }; });
    const observer = new QueryObserver(client, { queryKey: KEY, queryFn: read });
    const unsub = observer.subscribe(() => {});
    await sleep(30);
    unsub();
    check(reads === 1 && cached(client)?.isPro === false && (client.getQueryState(KEY)?.dataUpdatedAt ?? 0) > 0,
      "B2: a screen mounting asks the server (the seed is stale) and the server's answer replaces it", { reads, shown: cached(client) });
  }
  {
    // No snapshot at all (the case this fallback was first written for).
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    const result = await fallback(client, guard, { rc: RC_PRO }).run;
    check(result === 'shown' && cached(client)?.isPro === true, 'B2: an empty cache + RevenueCat Pro → Pro shown (as before)');
  }
  {
    // A server answer in the cache: never replaced, RevenueCat not even read.
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    client.setQueryData(KEY, { ...notPro });
    const f = fallback(client, guard, { rc: RC_PRO });
    const result = await f.run;
    check(result === 'kept' && cached(client)?.isPro === false && f.reads() === 0, "B2: a server answer 'not Pro' is never replaced", { result });
  }
  {
    // A saved Pro seed: left as it is (nothing to add, nothing to take away).
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    guard.seed(KEY, { isPro: true, proExpiresAt: '2026-12-01 00:00:00+00', proSource: 'store' });
    const f = fallback(client, guard, { rc: { isPro: false, proExpiresAt: null } });
    const result = await f.run;
    check(result === 'kept' && cached(client)?.isPro === true && f.reads() === 0, 'B2: a saved Pro seed is never downgraded by RevenueCat');
  }
  {
    // RevenueCat's cache says not Pro, or could not be read in time.
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    guard.seed(KEY, { ...notPro });
    check(await fallback(client, guard, { rc: { isPro: false, proExpiresAt: null } }).run === 'not_pro' && cached(client)?.isPro === false,
      "B2: RevenueCat not Pro: the saved seed stays");
    check(await fallback(client, guard, { rc: null }).run === 'not_pro' && cached(client)?.isPro === false,
      'B2: RevenueCat unknown (no SDK, read capped): the saved seed stays');
    const throwing = await showStoreCacheProIfNoServerAnswer({
      cacheState: () => client.getQueryState(KEY),
      readStoreCache: () => Promise.reject(new Error('native module missing')),
      isCurrent: () => true,
      seed: () => { throw new Error('must not seed'); },
    });
    check(throwing === 'not_pro', 'B2: a failing read never throws out of the boot');
  }
  {
    // The server answers while RevenueCat is being read: its answer stays.
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    guard.seed(KEY, { ...notPro });
    const result = await fallback(client, guard, { rc: RC_PRO, duringRead: () => client.setQueryData(KEY, { ...notPro }) }).run;
    check(result === 'kept' && cached(client)?.isPro === false, 'B2: a server answer that lands during the RevenueCat read is not replaced', { result });
  }
  {
    // A sign-out (or a sign-in, or a newer boot) while RevenueCat is being read.
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    guard.seed(KEY, { ...notPro });
    let gen = 1;
    const result = await fallback(client, guard, { rc: RC_PRO, isCurrent: () => gen === 1, duringRead: () => { gen++; client.clear(); } }).run;
    check(result === 'superseded' && cached(client) === undefined, 'B2: a sign-out during the read: nothing is written into the next session', { result });
    const before = await fallback(makeClient(), guard, { rc: RC_PRO, isCurrent: () => false }).run;
    check(before === 'superseded', 'B2: superseded before it starts: nothing read, nothing written');
  }
  {
    // A server read in flight when the fallback seed lands keeps its answer.
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    guard.seed(KEY, { ...notPro });
    const snapshots: unknown[] = [];
    const read = guard.guardedQueryFn<SubscriptionLike | null>(KEY, async () => { await sleep(30); return { ...notPro }; }, (v) => snapshots.push(v));
    const inFlight = client.fetchQuery({ queryKey: KEY, queryFn: read });
    await sleep(5);
    await fallback(client, guard, { rc: RC_PRO }).run;
    check(cached(client)?.isPro === true, 'setup: the fallback seed landed while the read was in flight');
    await inFlight;
    check(cached(client)?.isPro === false && snapshots.length === 1,
      "B2: the read's answer is kept over the fallback seed (a seed is never a newer write)", { shown: cached(client), snapshots });
  }
  {
    // B3 + B2: a monthly subscriber renewed, but the saved snapshot still has
    // last month's expiry. Offline: shown as not Pro by B3, then Pro again
    // from RevenueCat's cache (which has the renewal).
    const client = makeClient();
    const guard = createQueryGuard(client, () => 'A');
    const saved: SubscriptionLike = { isPro: true, proExpiresAt: '2026-11-19 10:00:00+00', proSource: 'store' };
    guard.seed(KEY, withExpiryApplied(saved, NOW));
    check(cached(client)?.isPro === false, 'B3: the lapsed snapshot is seeded as not Pro');
    const result = await fallback(client, guard, { rc: RC_PRO }).run;
    check(result === 'shown' && cached(client)?.isPro === true && cached(client)?.proExpiresAt === RC_PRO.proExpiresAt,
      "B3 + B2: the renewed subscriber sees Pro offline, with RevenueCat's expiry", cached(client));
    const lapsedForReal = makeClient();
    const guard2 = createQueryGuard(lapsedForReal, () => 'A');
    guard2.seed(KEY, withExpiryApplied(saved, NOW));
    await fallback(lapsedForReal, guard2, { rc: { isPro: false, proExpiresAt: null } }).run;
    check(cached(lapsedForReal)?.isPro === false, 'B3 + B2: a subscriber who really lapsed stays not Pro offline');
  }
}

async function main(): Promise<void> {
  dates();
  expiredSnapshots();
  theRules();
  await cacheCases();
  console.log(`\n${passed} passed, ${failed} failed`);
  // The query clients' gc timers would keep Node alive for gcTime.
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
