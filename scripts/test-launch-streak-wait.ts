// scripts/test-launch-streak-wait.ts
// Run: npx tsx scripts/test-launch-streak-wait.ts
// Boot fix B5 (20.11): the launch's daily login bonus decides streak-freeze use
// from the ['streak'] query, so a launch with a session token waits, at most a
// few seconds, for a real server streak answer
// (src/features/economy/launchStreakWait.ts):
//  - guests and launches without a token run at once; a token read that never
//    answers is covered by the same limit;
//  - an answer noted before the launch's mark never counts (reset per launch);
//  - the economy store's local streak seed can never end the wait, while a kept
//    GET answer and a POST answer do (real @tanstack/query-core and the query
//    guard, wired as useStreak.ts wires them), and the bonus then reads the
//    server's answer from the cache, not the seed it replaced;
//  - a foreground run during the launch's wait is left to it, and a second
//    mount of the root layout joins it.
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import { createQueryGuard } from '../src/lib/queryGuardCore';
import {
  createLaunchLoginBonus,
  createStreakArrivals,
  waitForLaunchStreak,
  type LaunchStreakWait,
  type StreakArrivals,
} from '../src/features/economy/launchStreakWait';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The app waits LAUNCH_STREAK_WAIT_MS (3 s); a shorter limit keeps this quick.
const CAP = 500;

function makeClient(): QueryClient {
  // Same defaults as src/lib/queryClient.ts.
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: (n) => n < 2 } } });
}

type Token = 'yes' | 'none' | 'fail' | 'hang';
function startWait(arrivals: StreakArrivals, mark: number, o: { guest?: boolean; token?: Token } = {}) {
  let tokenReads = 0;
  const token = o.token ?? 'yes';
  const startedAt = Date.now();
  const p = waitForLaunchStreak({
    mark,
    capMs: CAP,
    isGuest: () => o.guest === true,
    hasToken: () => {
      tokenReads++;
      if (token === 'fail') return Promise.reject(new Error('keychain unavailable'));
      if (token === 'hang') return new Promise<boolean>(() => {});
      return Promise.resolve(token === 'yes');
    },
    arrivals,
  }).then((r) => ({ r, ms: Date.now() - startedAt }));
  return { p, tokenReads: () => tokenReads };
}

/** Settled within `ms`? (without waiting past it) */
async function settledWithin<T>(p: Promise<T>, ms: number): Promise<boolean> {
  let settled = false;
  void p.then(() => { settled = true; }, () => { settled = true; });
  await sleep(ms);
  return settled;
}

function arrivalsBasics(): void {
  const a = createStreakArrivals();
  check(a.count() === 0, 'arrivals: none at the start of a process');
  let calls = 0;
  a.whenAfter(a.count(), () => calls++);
  check(calls === 0, 'arrivals: a waiter is not called before an answer');
  a.note();
  check(calls === 1 && a.count() === 1, 'arrivals: the next answer calls it');
  a.note();
  check(calls === 1, 'arrivals: once only');
  let late = 0;
  a.whenAfter(0, () => late++);
  check(late === 1, 'arrivals: an answer already past the mark calls at once');
  let cancelled = 0;
  const cancel = a.whenAfter(a.count(), () => cancelled++);
  cancel();
  let other = 0;
  a.whenAfter(a.count(), () => { throw new Error('waiter bug'); });
  a.whenAfter(a.count(), () => other++);
  a.note();
  check(cancelled === 0, 'arrivals: a cancelled waiter is not called');
  check(other === 1, "arrivals: one waiter's error does not stop the others");
}

async function guestsAndTokenlessLaunchesRunAtOnce(): Promise<void> {
  const a = createStreakArrivals();
  const guest = startWait(a, a.count(), { guest: true });
  const g = await guest.p;
  check(!g.r.waited && g.r.reason === 'guest' && g.ms < 30 && guest.tokenReads() === 0, `guest: at once, no token read (${g.ms}ms)`, g.r);
  const none = await startWait(a, a.count(), { token: 'none' }).p;
  check(!none.r.waited && none.r.reason === 'no_token' && none.ms < 30, `no token: at once (${none.ms}ms)`, none.r);
  const fail = await startWait(a, a.count(), { token: 'fail' }).p;
  check(!fail.r.waited && fail.r.reason === 'no_token' && fail.ms < 30, `token read fails: counts as none, at once (${fail.ms}ms)`, fail.r);
}

async function tokenLaunchWaitsForTheServer(): Promise<void> {
  const a = createStreakArrivals();
  const mark = a.count();
  const w = startWait(a, mark);
  await sleep(60);
  a.note(); // the daily tick's POST answer, ~60 ms into the wait
  const { r, ms } = await w.p;
  check(r.waited && r.arrived && ms >= 50 && ms < CAP, `token: runs as soon as the server's streak is in (${ms}ms)`, r);

  // Accepted after the launch began but before the wait started (e.g. while
  // the economy store was still loading): counts, so no wait at all.
  const a2 = createStreakArrivals();
  const mark2 = a2.count();
  a2.note();
  const early = await startWait(a2, mark2).p;
  check(early.r.waited && early.r.arrived && early.ms < 30, `token: an answer already in since the launch began: at once (${early.ms}ms)`, early.r);
}

async function earlierLaunchAnswerDoesNotCount(): Promise<void> {
  // The root layout mounts again in the same process (a new launch for the
  // user): the previous launch's answer must not end this launch's wait.
  const a = createStreakArrivals();
  a.note();
  const { r, ms } = await startWait(a, a.count()).p;
  check(r.waited && !r.arrived && ms >= CAP - 20, `reset per launch: an answer from before the mark does not count (capped after ${ms}ms)`, r);
}

async function theLimitCoversEverything(): Promise<void> {
  const a = createStreakArrivals();
  const none = await startWait(a, a.count()).p;
  check(none.r.waited && !none.r.arrived && none.ms >= CAP - 20 && none.ms < CAP + 150, `no answer: runs anyway after the limit (${none.ms}ms)`, none.r);
  const hang = await startWait(a, a.count(), { token: 'hang' }).p;
  check(hang.r.waited && !hang.r.arrived && hang.ms >= CAP - 20 && hang.ms < CAP + 150, `token read never answers: still runs after the limit (${hang.ms}ms)`, hang.r);
}

/** useStreak.ts's wiring: the guarded GET notes a kept answer once react-query
 *  has stored it; a POST answer notes right after setQueryData. */
function streakWiring(client: QueryClient, arrivals: StreakArrivals, serverAnswer: () => Promise<{ currentStreak: number; lastActiveDate: string }>) {
  const guard = createQueryGuard(client, () => 'A');
  const snapshots: unknown[] = [];
  const key = ['streak'];
  const streakQueryFn = guard.guardedQueryFn(key, serverAnswer, (v) => {
    snapshots.push(v);
    setTimeout(() => arrivals.note(), 0);
  });
  return { guard, key, streakQueryFn, snapshots };
}

// The economy store's seed, as useEconomyUIStore's onRehydrateStorage writes
// it: the LOCAL calendar's streak, a normal write (not a snapshot seed).
const LOCAL_SEED = { currentStreak: 1, lastActiveDate: '2026-11-18' };
const SERVER_STREAK = { currentStreak: 3, lastActiveDate: '2026-11-20' };

async function theLocalSeedNeverEndsTheWait(): Promise<void> {
  const client = makeClient();
  const arrivals = createStreakArrivals();
  const { guard, key } = streakWiring(client, arrivals, async () => ({ ...SERVER_STREAK }));
  const launchStartedAt = Date.now();
  const mark = arrivals.count();

  const local = { ...LOCAL_SEED };
  client.setQueryData(key, local); // the economy store loads
  check(guard.serverAnswerSince(key, launchStartedAt) === local,
    'why B5 has its own signal: serverAnswerSince takes the local seed for a server answer');
  const w = startWait(arrivals, mark);
  check(!(await settledWithin(w.p, 80)), 'the local seed does not end the wait');

  // The daily tick's POST answer: stored, then noted. The wait ends and the
  // cache holds the server's streak.
  const post = { ...SERVER_STREAK };
  client.setQueryData(key, post);
  arrivals.note();
  const ended = await w.p;
  check(ended.r.waited && ended.r.arrived, "the tick's POST answer ends the wait", ended.r);
  check(JSON.stringify(client.getQueryData(key)) === JSON.stringify(post), "the cache holds the server's streak when the bonus runs");
}

async function anAnswerDroppedForTheSeedNotesNothing(): Promise<void> {
  // A GET in flight when the local seed lands: the guard keeps the newer local
  // write and drops the server answer, so nothing is noted and the wait goes on.
  const client = makeClient();
  const arrivals = createStreakArrivals();
  const { key, streakQueryFn, snapshots } = streakWiring(client, arrivals, async () => { await sleep(30); return { ...SERVER_STREAK }; });
  const mark = arrivals.count();
  const observer = new QueryObserver(client, { queryKey: key, queryFn: streakQueryFn });
  const unsub = observer.subscribe(() => {});
  await sleep(5);
  client.setQueryData(key, { ...LOCAL_SEED }); // the store loads mid-request
  const w = startWait(arrivals, mark);
  await sleep(50);
  check(snapshots.length === 0 && arrivals.count() === mark, 'a server answer dropped for the local seed notes nothing');
  check(!(await settledWithin(w.p, 30)), 'so the wait goes on');
  unsub();
  const capped = await w.p;
  check(capped.r.waited && !capped.r.arrived, 'and ends at the limit if nothing else answers', capped.r);
}

async function aKeptGetAnswerEndsTheWait(): Promise<void> {
  // A GET answer the guard keeps ends the wait, and the bonus reads that
  // answer, not the local seed it replaced: the note comes after react-query
  // has stored it.
  const client = makeClient();
  const arrivals = createStreakArrivals();
  const { key, streakQueryFn, snapshots } = streakWiring(client, arrivals, async () => { await sleep(20); return { ...SERVER_STREAK }; });
  client.setQueryData(key, { ...LOCAL_SEED });
  let seen: unknown = 'not run';
  const bonus = createLaunchLoginBonus({
    wait: (mark) => waitForLaunchStreak({ mark, capMs: CAP, isGuest: () => false, hasToken: async () => true, arrivals }),
    award: () => { seen = client.getQueryData(key); },
  });
  const run = bonus.launch(arrivals.count());
  // A read made after the seed (e.g. once it is stale): nothing writes meanwhile, so it is kept.
  await client.fetchQuery({ queryKey: key, queryFn: streakQueryFn, staleTime: 0 });
  await run;
  check(snapshots.length === 1, 'the kept GET answer is snapshotted');
  check((seen as { currentStreak?: number })?.currentStreak === 3, 'the bonus reads the server answer, not the seed it replaced', seen);
}

async function foregroundAndSecondMountJoinTheLaunch(): Promise<void> {
  const arrivals = createStreakArrivals();
  let awards = 0;
  const results: LaunchStreakWait[] = [];
  const bonus = createLaunchLoginBonus({
    wait: (mark) => waitForLaunchStreak({ mark, capMs: CAP, isGuest: () => false, hasToken: async () => true, arrivals }),
    award: () => { awards++; },
    onWaited: (r) => results.push(r),
  });
  const run = bonus.launch(arrivals.count());
  check(bonus.isWaiting(), 'launch: waiting for the server streak');
  bonus.foreground(); // iOS reports 'active' right at launch
  check(awards === 0, "a foreground during the launch's wait does not award (it would read the local seed)");
  const second = bonus.launch(arrivals.count()); // the root layout mounts again
  check(second === run, "a second mount joins the launch's wait");
  await sleep(20);
  arrivals.note();
  await run;
  check(awards === 1 && !bonus.isWaiting(), 'the launch awards once, for both');
  const first = results[0];
  check(results.length === 1 && first.waited && first.arrived, 'onWaited gets the wait result', results);
  bonus.foreground();
  check(awards === 2, 'after the launch, a foreground awards at once (as before)');

  // Guest launch: at once, and a foreground right after is unaffected.
  let guestAwards = 0;
  const guestBonus = createLaunchLoginBonus({
    wait: (mark) => waitForLaunchStreak({ mark, capMs: CAP, isGuest: () => true, hasToken: async () => false, arrivals }),
    award: () => { guestAwards++; },
  });
  const startedAt = Date.now();
  await guestBonus.launch(arrivals.count());
  check(guestAwards === 1 && Date.now() - startedAt < 30, `guest launch: awards at once (${Date.now() - startedAt}ms)`);

  // A broken wait still awards (never worse than before).
  let brokenAwards = 0;
  const broken = createLaunchLoginBonus({
    wait: () => { throw new Error('bug'); },
    award: () => { brokenAwards++; },
  });
  await broken.launch(0);
  check(brokenAwards === 1 && !broken.isWaiting(), 'a wait that throws still awards');
}

async function main(): Promise<void> {
  arrivalsBasics();
  await guestsAndTokenlessLaunchesRunAtOnce();
  await tokenLaunchWaitsForTheServer();
  await earlierLaunchAnswerDoesNotCount();
  await theLimitCoversEverything();
  await theLocalSeedNeverEndsTheWait();
  await anAnswerDroppedForTheSeedNotesNothing();
  await aKeptGetAnswerEndsTheWait();
  await foregroundAndSecondMountJoinTheLaunch();
  console.log(`\n${passed} passed, ${failed} failed`);
  // The clients' gc timers would keep Node alive for gcTime.
  process.exit(failed > 0 ? 1 : 0);
}
void main();
