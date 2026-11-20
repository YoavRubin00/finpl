// scripts/test-query-guard.ts
// Run: npx tsx scripts/test-query-guard.ts
// The boot-read query guard (src/lib/queryGuardCore.ts) against a real
// react-query client, in the situations the boot review (20.11) found:
//  - the root layout's hook starts the subscription read before the boot, the
//    boot's read joins it, and the boot must still see the server's answer
//    (that is what lets the RevenueCat sync run on a cold start);
//  - a late GET must not overwrite a newer write (the streak tick's POST);
//  - a late answer after a sign-out / another sign-in must not be filed under
//    the next account.
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
  await accountSwitchDuringRead();
  console.log(`\n${passed} passed, ${failed} failed`);
  // The clients' gc timers would keep Node alive for gcTime.
  process.exit(failed > 0 ? 1 : 0);
}
void main();
