// scripts/test-query-guard.ts
// Run: npx tsx scripts/test-query-guard.ts
// The boot-read query guard (src/lib/queryGuardCore.ts) against a real
// react-query client, in the situations the boot review (20.11) found:
//  - the root layout's hook starts the subscription read before the boot, the
//    boot's read joins it, and the boot must still see the server's answer
//    (that is what lets the RevenueCat sync run on a cold start);
//  - a late GET must not overwrite a newer write (the streak tick's POST);
//  - a late answer after a sign-out / another sign-in must not be filed under
//    the next account;
//  - B1 (boot fix round, 20.11): a server answer equal to the seed (the usual
//    launch, nothing changed) is still the server's answer, although
//    react-query keeps the seeded object in the cache;
//  - B8: guard.seed() stores a value stale (updatedAt 0) and marked, also when
//    it replaces an earlier seed; a read in flight is never dropped for a
//    seed, and a seed never stops the boot's read from asking the server.
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import { createQueryGuard } from '../src/lib/queryGuardCore';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string): void {
  if (cond) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}`); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeClient(): QueryClient {
  // Same defaults as src/lib/queryClient.ts.
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: (n) => n < 2 } } });
}

interface Sub { isPro: boolean | null; proExpiresAt: string | null; proSource: string | null }

async function hookOwnedSubscriptionRead(): Promise<void> {
  const client = makeClient();
  let authId: string | null = 'A';
  const guard = createQueryGuard(client, () => authId);
  const key = ['subscription'];
  const snapshots: Array<{ authId: string; value: Sub | null }> = [];
  let hookRan = 0;
  let bootRan = 0;
  const server: Sub = { isPro: true, proExpiresAt: '2026-12-20T10:00:00Z', proSource: 'store' };
  const subscriptionQueryFn = guard.guardedQueryFn<Sub | null>(
    key,
    async () => { hookRan++; await sleep(20); return server; },
    (v, ctx) => snapshots.push({ authId: ctx.authId, value: v }),
  );

  // Root layout mounts: useIsPro() → useSubscription starts the GET.
  const observer = new QueryObserver(client, { queryKey: key, queryFn: subscriptionQueryFn });
  const unsub = observer.subscribe(() => {});

  // Then bootFromToken starts, seeds the saved state, and reads.
  await sleep(1);
  const bootStartedAt = Date.now();
  const seed: Sub = { isPro: false, proExpiresAt: null, proSource: null };
  client.setQueryData(key, seed, { updatedAt: 0 });
  guard.markSeeded(seed);
  check(guard.serverAnswerSince(key, bootStartedAt) === undefined, 'F1: a seeded snapshot is not a server answer');
  const bootQueryFn = guard.guardedQueryFn<Sub | null>(key, async () => { bootRan++; return server; });
  await client.fetchQuery({ queryKey: key, queryFn: bootQueryFn });

  check(hookRan === 1 && bootRan === 0, `F1: the boot joined the hook's request (hookRan=${hookRan}, bootRan=${bootRan})`);
  const answer = guard.serverAnswerSince<Sub | null>(key, bootStartedAt);
  check(answer?.isPro === true, 'F1: the boot still sees the server answer, so the RevenueCat sync runs');
  check(snapshots.length === 1 && snapshots[0].authId === 'A', 'F1: snapshot filed once, under the account that asked');
  unsub();
  authId = null;
}

async function lateStreakGet(): Promise<void> {
  const client = makeClient();
  const guard = createQueryGuard(client, () => 'A');
  const key = ['streak'];
  const snapshots: unknown[] = [];
  const streakQueryFn = guard.guardedQueryFn(
    key,
    async () => { await sleep(30); return { currentStreak: 3 }; }, // read before the tick
    (v) => snapshots.push(v),
  );
  const observer = new QueryObserver(client, { queryKey: key, queryFn: streakQueryFn });
  const unsub = observer.subscribe(() => {});
  await sleep(5);
  client.setQueryData(key, { currentStreak: 4 }); // the tick's POST answer
  await sleep(40);
  check((client.getQueryData(key) as { currentStreak: number }).currentStreak === 4, 'F1b: late streak GET does not overwrite the tick');
  check(snapshots.length === 0, 'F1b: the dropped answer is not snapshotted');
  check(client.getQueryState(key)?.isInvalidated === true, 'F1b: query marked stale to reconcile later');
  unsub();
}

async function seededThenAnswered(): Promise<void> {
  const client = makeClient();
  const guard = createQueryGuard(client, () => 'A');
  const key = ['economy'];
  const seed = { coins: 100 };
  client.setQueryData(key, seed, { updatedAt: 0 });
  guard.markSeeded(seed);
  const written: unknown[] = [];
  await client.fetchQuery({
    queryKey: key,
    queryFn: guard.guardedQueryFn(key, async () => { await sleep(5); return { coins: 150 }; }, (v) => written.push(v)),
  });
  check((client.getQueryData(key) as { coins: number }).coins === 150, 'seed replaced by the server answer');
  check(written.length === 1, 'server answer snapshotted');
}

/** What the network hands back: a fresh object every time, never the cached one. */
const fromJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

async function seedEqualToTheAnswer(): Promise<void> {
  // B1 (20.11): the common launch. Nothing changed since the last one, so the
  // saved snapshot (a JSON copy of an earlier answer) equals the server's
  // answer. React-query's structural sharing then keeps the SEEDED object in
  // the cache, so a check by object identity read the answer as "still the
  // seed" and the launch RevenueCat-to-server sync never ran.
  for (const who of ['boot', 'hook'] as const) {
    const client = makeClient();
    let authId: string | null = 'A';
    const guard = createQueryGuard(client, () => authId);
    const key = ['subscription'];
    const server: Sub = { isPro: false, proExpiresAt: null, proSource: null };
    const snapshots: Array<{ authId: string; value: Sub | null }> = [];
    const subscriptionQueryFn = guard.guardedQueryFn<Sub | null>(
      key,
      async () => { await sleep(10); return fromJson(server); },
      (v, ctx) => snapshots.push({ authId: ctx.authId, value: v }),
    );

    let unsub = () => {};
    if (who === 'hook') {
      // The root layout's useIsPro() starts the GET before the boot seeds.
      const observer = new QueryObserver(client, { queryKey: key, queryFn: subscriptionQueryFn });
      unsub = observer.subscribe(() => {});
      await sleep(1);
    }
    const bootStartedAt = Date.now();
    const seed = fromJson(server); // the saved snapshot, read back from storage
    client.setQueryData(key, seed, { updatedAt: 0 });
    guard.markSeeded(seed);
    check(guard.serverAnswerSince(key, bootStartedAt) === undefined, `B1 (${who} reads first): before the answer the seed is not a server answer`);
    await client.fetchQuery({ queryKey: key, queryFn: subscriptionQueryFn });

    check(client.getQueryData(key) === seed, `B1 (${who} reads first): react-query kept the seeded object for the equal answer (structural sharing)`);
    const answer = guard.serverAnswerSince<Sub | null>(key, bootStartedAt);
    check(answer !== undefined && answer !== null && answer.isPro === false,
      `B1 (${who} reads first): the unchanged answer counts as the server's, so the RevenueCat sync runs`);
    check(snapshots.length === 1 && snapshots[0].authId === 'A', `B1 (${who} reads first): the answer is snapshotted once`);
    check(guard.serverAnswerSince(key, Date.now() + 1000) === undefined, `B1 (${who} reads first): an answer from before 'since' does not count`);
    unsub();
    authId = null;
  }
}

async function writeEqualToTheSeedIsKept(): Promise<void> {
  // B1 hardening: the guard tells a seed by its updatedAt 0, not by object
  // identity. A newer write that happens to equal the seed (the tick's POST
  // answer) keeps the seeded object in the cache with a fresh updatedAt; it
  // must still win over the older GET answer in flight.
  const client = makeClient();
  const guard = createQueryGuard(client, () => 'A');
  const key = ['streak'];
  const seed = fromJson({ currentStreak: 4 });
  client.setQueryData(key, seed, { updatedAt: 0 });
  guard.markSeeded(seed);
  const snapshots: unknown[] = [];
  const streakQueryFn = guard.guardedQueryFn(
    key,
    async () => { await sleep(30); return { currentStreak: 3 }; }, // read before the tick
    (v) => snapshots.push(v),
  );
  const observer = new QueryObserver(client, { queryKey: key, queryFn: streakQueryFn });
  const unsub = observer.subscribe(() => {});
  await sleep(5);
  client.setQueryData(key, fromJson({ currentStreak: 4 })); // the tick's POST answer, equal to the seed
  await sleep(40);
  check((client.getQueryData(key) as { currentStreak: number }).currentStreak === 4, 'B1: a write equal to the seed still wins over the older GET');
  check(snapshots.length === 0, 'B1: that dropped GET answer is not snapshotted');
  unsub();
}

async function seedPutsAStaleMarkedValue(): Promise<void> {
  // B8 (20.11): one way to put a seed in the cache (a saved snapshot,
  // RevenueCat's cached Pro, the economy store's local streak).
  const client = makeClient();
  const guard = createQueryGuard(client, () => 'A');
  const key = ['streak'];
  const local = { currentStreak: 1, lastActiveDate: '2026-11-18' };
  const stored = guard.seed(key, local);
  const state = client.getQueryState(key);
  check(state?.dataUpdatedAt === 0 && stored === client.getQueryData(key), 'seed: stored with updatedAt 0 and returned as the cache holds it');
  check(guard.isSeeded(client.getQueryData(key)), 'seed: the cached value is marked seeded');
  check(guard.serverAnswerSince(key, 0) === undefined, 'seed: never a server answer for serverAnswerSince, even since 0');

  // Replacing an earlier seed: structural sharing stores a copy, which must be the marked one.
  const subKey = ['subscription'];
  const savedNotPro: Sub = { isPro: false, proExpiresAt: null, proSource: null };
  guard.seed(subKey, savedNotPro);
  const storePro: Sub = { isPro: true, proExpiresAt: '2026-12-20T10:00:00Z', proSource: null };
  const replaced = guard.seed(subKey, storePro);
  check(replaced !== undefined && replaced !== storePro && replaced.isPro === true,
    'seed over a seed: react-query stores a copy of the new value (structural sharing)');
  check(guard.isSeeded(client.getQueryData(subKey)) && client.getQueryState(subKey)?.dataUpdatedAt === 0,
    'seed over a seed: the copy in the cache is the one marked, still updatedAt 0');
}

async function aSeedIsNeverANewerWrite(): Promise<void> {
  // B8: the economy store's local streak lands while the boot's GET is in
  // flight. Written as a normal write it was a "newer local write" and the
  // server's answer was dropped in its favour; as a seed the answer is kept.
  const client = makeClient();
  const guard = createQueryGuard(client, () => 'A');
  const key = ['streak'];
  const snapshots: unknown[] = [];
  const streakQueryFn = guard.guardedQueryFn(
    key,
    async () => { await sleep(30); return { currentStreak: 5, lastActiveDate: '2026-11-20' }; },
    (v) => snapshots.push(v),
  );
  const observer = new QueryObserver(client, { queryKey: key, queryFn: streakQueryFn });
  const unsub = observer.subscribe(() => {});
  await sleep(5);
  guard.seed(key, { currentStreak: 1, lastActiveDate: '2026-11-18' }); // the economy store loads mid-request
  await sleep(40);
  const cached = client.getQueryData(key) as { currentStreak: number };
  check(cached.currentStreak === 5 && snapshots.length === 1, 'B8: a GET in flight when a seed lands is kept (and snapshotted), not dropped for the seed', cached);
  check(client.getQueryState(key)?.isInvalidated === false, 'B8: and the query is not marked stale for a reconcile');
  unsub();
}

async function aSeedStillAsksTheServer(): Promise<void> {
  // B8: with the local streak in the cache, the boot's read (fetchQuery, the
  // client's default staleTime of 30 s) and a screen mounting useStreak (60 s)
  // still ask the server. As a normal write they returned the local value.
  for (const how of ['normal write (before B8)', 'seed'] as const) {
    for (const reader of ['boot read', 'mounting screen'] as const) {
      const client = makeClient();
      const guard = createQueryGuard(client, () => 'A');
      const key = ['streak'];
      let reads = 0;
      const streakQueryFn = guard.guardedQueryFn(key, async () => { reads++; await sleep(5); return { currentStreak: 5 }; });
      const local = { currentStreak: 1 };
      if (how === 'seed') guard.seed(key, local); else client.setQueryData(key, local);
      if (reader === 'boot read') {
        await client.fetchQuery({ queryKey: key, queryFn: streakQueryFn });
      } else {
        const observer = new QueryObserver(client, { queryKey: key, queryFn: streakQueryFn, staleTime: 60_000 });
        const unsub = observer.subscribe(() => {});
        await sleep(20);
        unsub();
      }
      const shown = (client.getQueryData(key) as { currentStreak: number }).currentStreak;
      const ok = how === 'seed' ? reads === 1 && shown === 5 : reads === 0 && shown === 1;
      check(ok, `B8 (${how}, ${reader}): ${how === 'seed'
        ? 'asks the server and shows its streak'
        : "took the local streak for the server's and never asked"} (reads=${reads}, shown=${shown})`);
    }
  }
}

async function accountSwitchDuringRead(): Promise<void> {
  // F3: a slow read for A; A signs out (cache cleared) and B signs in.
  const client = makeClient();
  let authId: string | null = 'A';
  const guard = createQueryGuard(client, () => authId);
  const key = ['economy'];
  const filed: Array<{ authId: string; v: unknown }> = [];
  const p = client.fetchQuery({
    queryKey: key,
    queryFn: guard.guardedQueryFn(key, async () => { await sleep(30); return { coins: 999 }; }, (v, ctx) => filed.push({ authId: ctx.authId, v })),
  }).catch(() => undefined);
  await sleep(5);
  client.clear();
  authId = null;
  await sleep(5);
  authId = 'B';
  client.setQueryData(key, { coins: 7 }); // B's own data
  await p;
  await sleep(5);
  check(filed.length === 0, 'F3: A\'s late answer is not snapshotted (under B or anyone)');
  check((client.getQueryData(key) as { coins: number }).coins === 7, 'F3: A\'s late answer does not reach B\'s cache');

  // Same, without a cache clear: only the account changed.
  const client2 = makeClient();
  let authId2: string | null = 'A';
  const guard2 = createQueryGuard(client2, () => authId2);
  const filed2: unknown[] = [];
  const p2 = client2.fetchQuery({
    queryKey: key,
    queryFn: guard2.guardedQueryFn(key, async () => { await sleep(20); return { coins: 1 }; }, (v) => filed2.push(v)),
  });
  await sleep(5);
  authId2 = 'B';
  await p2;
  check(filed2.length === 0, 'F3: account changed mid-read: no snapshot written');
}

async function main(): Promise<void> {
  await hookOwnedSubscriptionRead();
  await lateStreakGet();
  await seededThenAnswered();
  await seedEqualToTheAnswer();
  await writeEqualToTheSeedIsKept();
  await seedPutsAStaleMarkedValue();
  await aSeedIsNeverANewerWrite();
  await aSeedStillAsksTheServer();
  await accountSwitchDuringRead();
  console.log(`\n${passed} passed, ${failed} failed`);
  // The clients' gc timers would keep Node alive for gcTime.
  process.exit(failed > 0 ? 1 : 0);
}
void main();
