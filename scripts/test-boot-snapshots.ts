// scripts/test-boot-snapshots.ts
// Run: npx tsx scripts/test-boot-snapshots.ts
// The cold boot's local-storage side with an ASYNC storage only, as on devices
// (MMKV never initialises there, see src/lib/zustandStorage.ts):
//  - the snapshot prime: nothing is readable before it, the right account's
//    value after it, never another account's;
//  - a slow storage hits the prime cap and the boot falls back to the network
//    path; a fast one lets it open at once ('cached');
//  - a second concurrent boot joins the first; "try again" starts a new one;
//  - waiting for persisted stores to load, with and without a cap;
//  - B6 (20.11): a store that never loads (a real zustand persist store whose
//    saved JSON is unreadable) is reported once after a limit while the wait
//    goes on, and the report names it by its storage key;
//  - B7: the snapshot key names live in one place and sign-out removes all
//    three from storage; a sign-in files its balance and streak (not only the
//    Pro state) under the new account, never a seed, an older answer, another
//    account's or bought gems still pending; a late answer (a POST, the
//    streak tick, a purchase re-read) is cached and filed only for the account
//    and session that asked.
import fs from 'node:fs';
import path from 'node:path';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { QueryClient } from '@tanstack/query-core';
import {
  createAccountTracker,
  createSnapshotStore,
  ECONOMY_SNAPSHOT_KEY,
  fileIfStillSignedIn,
  SNAPSHOT_STORAGE_KEYS,
  STREAK_SNAPSHOT_KEY,
  SUBSCRIPTION_SNAPSHOT_KEY,
  type RequestAccount,
  type SnapshotStorage,
} from '../src/features/economy/querySnapshotCore';
import { createPendingGems, withoutPendingGems, type GemsCarrier } from '../src/features/economy/pendingGemsCore';
import { createQueryGuard } from '../src/lib/queryGuardCore';
import { createSingleFlight, decideBootPath, waitCapped } from '../src/lib/auth/bootCore';
import {
  storeName,
  whenHydrated,
  whenAllHydrated,
  whenHydratedReportingSlow,
  type HydratingStore,
} from '../src/lib/stores/whenHydrated';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** AsyncStorage stand-in: every read takes `delayMs`; no synchronous read. */
function fakeAsyncStorage(delayMs: number, initial: Record<string, string> = {}, opts?: { failReads?: boolean }) {
  const data = new Map(Object.entries(initial));
  let reads = 0;
  const storage: SnapshotStorage = {
    async getItem(key) {
      reads++;
      await sleep(delayMs);
      if (opts?.failReads) throw new Error('storage unavailable');
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      await sleep(1);
      data.set(key, value);
    },
  };
  /** zustandStorage.removeItem, as signOut calls it. */
  const removeItem = async (key: string) => {
    await sleep(1);
    data.delete(key);
  };
  return { storage, data, reads: () => reads, removeItem };
}

interface Sub { isPro: boolean | null; proExpiresAt: string | null; proSource: string | null }
const isSub = (v: unknown): v is Sub => !!v && typeof v === 'object' && 'isPro' in (v as object);
const SUB_KEY = 'subscription-snapshot:v1';
const savedForA = JSON.stringify({ authId: 'A', at: 1, value: { isPro: true, proExpiresAt: null, proSource: 'store' } });

async function primeReadsTheRightAccount(): Promise<void> {
  let authId: string | null = 'A';
  const fake = fakeAsyncStorage(20, { [SUB_KEY]: savedForA });
  const store = createSnapshotStore({ storage: fake.storage, getAuthId: () => authId });

  check(store.read(SUB_KEY, isSub) === null, 'before the prime nothing is readable (no sync storage)');
  check(!store.isPrimed(SUB_KEY), 'not primed yet');
  await store.prime(SUB_KEY);
  check(store.isPrimed(SUB_KEY), 'primed');
  check(store.read(SUB_KEY, isSub)?.value.isPro === true, 'after the prime: the saved Pro state for account A');
  check(fake.reads() === 1, `one storage read for render + prime (reads=${fake.reads()})`);
  authId = 'B';
  check(store.read(SUB_KEY, isSub) === null, 'another account never sees it');
  authId = null;
  check(store.read(SUB_KEY, isSub) === null, 'signed out: nothing');
}

async function writeWinsOverALatePrime(): Promise<void> {
  const fake = fakeAsyncStorage(30, { [SUB_KEY]: savedForA });
  const store = createSnapshotStore({ storage: fake.storage, getAuthId: () => 'A' });
  const p = store.prime(SUB_KEY);
  store.write<Sub>(SUB_KEY, { isPro: false, proExpiresAt: null, proSource: null });
  await p;
  check(store.read(SUB_KEY, isSub)?.value.isPro === false, 'a server answer written during the prime is not overwritten by the older stored value');
}

async function resetForgetsAndStaysForgotten(): Promise<void> {
  const fake = fakeAsyncStorage(30, { [SUB_KEY]: savedForA });
  const store = createSnapshotStore({ storage: fake.storage, getAuthId: () => 'A' });
  const p = store.prime(SUB_KEY);
  store.reset(); // sign-out while the read is in flight
  await p;
  check(!store.isPrimed(SUB_KEY), 'reset: a prime from before the sign-out does not refill memory');
  await store.prime(SUB_KEY);
  check(store.read(SUB_KEY, isSub)?.authId === 'A', 'a new prime after reset loads again (still keyed by account)');
}

async function storageErrorIsNoSnapshot(): Promise<void> {
  const fake = fakeAsyncStorage(5, {}, { failReads: true });
  const store = createSnapshotStore({ storage: fake.storage, getAuthId: () => 'A' });
  await store.prime(SUB_KEY);
  check(store.isPrimed(SUB_KEY) && store.read(SUB_KEY, isSub) === null, 'a storage error counts as "no snapshot", never throws');
}

async function bootPathFromPrime(delayMs: number, capMs: number): Promise<{ path: string; capped: boolean; ms: number }> {
  const fake = fakeAsyncStorage(delayMs, { [SUB_KEY]: savedForA });
  const store = createSnapshotStore({ storage: fake.storage, getAuthId: () => 'A' });
  const wait = await waitCapped(store.prime(SUB_KEY), capMs);
  const proKnown = store.read(SUB_KEY, isSub) !== null;
  const path = decideBootPath({ hasSession: true, proKnown, backfillDone: true, tokenExpired: false });
  return { path, capped: wait.capped, ms: wait.ms };
}

async function primeCapDecidesThePath(): Promise<void> {
  const fast = await bootPathFromPrime(20, 500);
  check(!fast.capped && fast.path === 'cached', `fast storage: prime done in ${fast.ms}ms, boot opens at once ('cached')`);
  const slow = await bootPathFromPrime(800, 500);
  check(slow.capped && slow.ms >= 480 && slow.ms < 700, `slow storage: prime capped at ~500ms (${slow.ms}ms)`);
  check(slow.path === 'network', 'slow storage: boot falls back to the network path');
  check(decideBootPath({ hasSession: true, proKnown: true, backfillDone: true, tokenExpired: true }) === 'network', 'expired token: network path');
  check(decideBootPath({ hasSession: false, proKnown: false, backfillDone: true, tokenExpired: false }) === 'network', 'no saved session: network path');
}

async function secondBootJoinsTheFirst(): Promise<void> {
  const flight = createSingleFlight<string>();
  let started = 0;
  const boot = () => { started++; return sleep(20).then(() => `boot-${started}`); };
  const first = flight.run(boot);
  await sleep(5); // the second mount arrives while the first boot runs
  const second = flight.run(boot);
  check(first === second, 'a second concurrent boot joins the first (same promise)');
  const [a, b] = await Promise.all([first, second]);
  check(started === 1 && a === 'boot-1' && b === 'boot-1', `one boot ran (started=${started})`);
  const later = await flight.run(boot);
  check(started === 1 && later === 'boot-1', 'a mount after the boot finished gets the same result, no new boot');
  const retry = await flight.run(boot, { fresh: true });
  check(started === 2 && retry === 'boot-2', '"try again" starts a genuinely new attempt');
  check((await flight.run(boot)) === 'boot-2', 'later mounts join the newest attempt');
  flight.replace('signed_out');
  check((await flight.run(boot)) === 'signed_out' && started === 2, '"continue without signing in" replaces the result for later mounts');
}

function fakePersistedStore(hydrateAfterMs: number | null): HydratingStore {
  let hydrated = false;
  const listeners = new Set<() => void>();
  if (hydrateAfterMs !== null) {
    setTimeout(() => { hydrated = true; listeners.forEach((l) => l()); }, hydrateAfterMs);
  }
  return {
    persist: {
      hasHydrated: () => hydrated,
      onFinishHydration: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    },
  };
}

async function waitingForStores(): Promise<void> {
  const loads = await whenHydrated(fakePersistedStore(30), 1000);
  check(!loads.capped && loads.ms >= 25, `store loads after ${loads.ms}ms, not capped`);
  const never = await whenHydrated(fakePersistedStore(null), 50);
  check(never.capped, 'a store that never loads hits the cap');
  const all = await whenAllHydrated([fakePersistedStore(10), fakePersistedStore(40)], 1000);
  check(!all.capped && all.ms >= 35, `all stores: waits for the slowest (${all.ms}ms)`);
  const already = await whenHydrated(fakePersistedStore(0));
  await sleep(5);
  check(!already.capped, 'already-loaded store resolves at once');
}

/** Settled within `ms`? (without waiting past it) */
async function settledWithin<T>(p: Promise<T>, ms: number): Promise<boolean> {
  let settled = false;
  void p.then(() => { settled = true; }, () => { settled = true; });
  await sleep(ms);
  return settled;
}

async function stuckStoresAreReported(): Promise<void> {
  // In time: no report.
  const reports: number[] = [];
  const inTime = await whenHydratedReportingSlow(fakePersistedStore(20), 100, (ms) => reports.push(ms));
  await sleep(120);
  check(!inTime.capped && reports.length === 0, 'B6: a store that loads in time is not reported');

  // Never loads: one report at the limit, and the wait goes on (the launch
  // effects keep skipping instead of running against an unloaded store).
  const neverReports: number[] = [];
  const never = whenHydratedReportingSlow(fakePersistedStore(null), 40, (ms) => neverReports.push(ms));
  check(!(await settledWithin(never, 120)), 'B6: a store that never loads: the wait goes on past the limit');
  check(neverReports.length === 1 && neverReports[0] === 40, `B6: ... and is reported once (${JSON.stringify(neverReports)})`);

  // Loads late: reported, then the wait still ends when it loads.
  const lateReports: number[] = [];
  const late = await whenHydratedReportingSlow(fakePersistedStore(90), 40, (ms) => lateReports.push(ms));
  check(!late.capped && late.ms >= 80 && lateReports.length === 1, `B6: a slow store is reported and still waited for (${late.ms}ms)`);

  // Already loaded: at once, no timer.
  const loadedReports: number[] = [];
  const loaded = fakePersistedStore(0);
  await sleep(5);
  const at = await whenHydratedReportingSlow(loaded, 10, (ms) => loadedReports.push(ms));
  await sleep(30);
  check(at.ms === 0 && loadedReports.length === 0, 'B6: an already-loaded store resolves at once, never reported');

  // A report that throws does not break the wait.
  const throwing = await whenHydratedReportingSlow(fakePersistedStore(40), 10, () => { throw new Error('analytics down'); });
  check(!throwing.capped, 'B6: a failing report does not break the wait');
}

async function aRealStoreWithUnreadableJson(): Promise<void> {
  // zustand 5 persist over an async storage, as on devices: the saved value
  // fails to parse, so the store never finishes loading and nothing says so.
  const data = new Map<string, string>([['economy-ui-store-v1', '{"state":{"coins":1']]);
  const storage: StateStorage = {
    getItem: async (k) => { await sleep(5); return data.get(k) ?? null; },
    setItem: async (k, v) => { data.set(k, v); },
    removeItem: async (k) => { data.delete(k); },
  };
  const useCorrupt = create<{ coins: number }>()(
    persist(() => ({ coins: 0 }), { name: 'economy-ui-store-v1', storage: createJSONStorage(() => storage) }),
  );
  const reports: Array<{ store: string; ms: number }> = [];
  const wait = whenHydratedReportingSlow(useCorrupt, 60, (ms) => reports.push({ store: storeName(useCorrupt), ms }));
  const settled = await settledWithin(wait, 150);
  check(!useCorrupt.persist.hasHydrated() && !settled, 'B6: unreadable saved JSON: zustand never finishes loading the store');
  check(reports.length === 1 && reports[0].store === 'economy-ui-store-v1',
    `B6: reported once, by its storage key (${JSON.stringify(reports)})`);

  const plain = fakePersistedStore(0);
  const throwingName: HydratingStore = { persist: { ...plain.persist, getOptions: () => { throw new Error('x'); } } };
  check(storeName(plain) === 'unknown' && storeName(throwingName) === 'unknown', "B6: a store without a name reports 'unknown'");
}

// ─── B7 (boot fix round B, 20.11) ───────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function snapshotKeysAreOneList(): void {
  const names = [...SNAPSHOT_STORAGE_KEYS].sort();
  check(names.join() === ['economy-snapshot:v1', 'streak-snapshot:v1', 'subscription-snapshot:v1'].join(),
    'B7: the sign-out list names the three snapshot keys', names);
  check(new Set<string>([ECONOMY_SNAPSHOT_KEY, STREAK_SNAPSHOT_KEY, SUBSCRIPTION_SNAPSHOT_KEY]).size === 3,
    'B7: three distinct keys');
  // Nothing in the app defines its own copy of a key name, so what sign-out
  // removes can never drift from what is written.
  const literal = /['"`](economy|streak|subscription)-snapshot:v\d/;
  const definers = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))]
    .filter((f) => literal.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f).replace(/\\/g, '/'));
  check(definers.length === 1 && definers[0] === 'src/features/economy/querySnapshotCore.ts',
    'B7: the key names are written down once (querySnapshotCore.ts), every user imports them', definers);
}

async function signOutLeavesNoSnapshot(): Promise<void> {
  const fake = fakeAsyncStorage(5);
  let authId: string | null = 'a@example.com';
  const store = createSnapshotStore({ storage: fake.storage, getAuthId: () => authId });
  store.write(ECONOMY_SNAPSHOT_KEY, { coins: 1200, gems: 30 });
  store.write(STREAK_SNAPSHOT_KEY, { currentStreak: 9 });
  store.write(SUBSCRIPTION_SNAPSHOT_KEY, { isPro: true, proExpiresAt: null, proSource: 'store' });
  await sleep(10);
  check(SNAPSHOT_STORAGE_KEYS.every((k) => (fake.data.get(k) ?? '').includes('a@example.com')),
    "setup: the three snapshots are on disk, each with the account's email");

  // lifecycle.ts signOut: memory first, then the keys, then the auth store.
  store.reset();
  await Promise.all(SNAPSHOT_STORAGE_KEYS.map((k) => fake.removeItem(k)));
  authId = null;
  check(SNAPSHOT_STORAGE_KEYS.every((k) => !fake.data.has(k)), 'B7: after sign-out none of them is on disk');

  // The next launch, same account signing in again: nothing to read until the
  // server answers (a new sign-in files fresh ones).
  authId = 'a@example.com';
  const next = createSnapshotStore({ storage: fake.storage, getAuthId: () => authId });
  await Promise.all(SNAPSHOT_STORAGE_KEYS.map((k) => next.prime(k)));
  check(next.read(SUBSCRIPTION_SNAPSHOT_KEY, isSub) === null, 'B7: a later launch reads no saved Pro state for that account');
}

interface Eco extends GemsCarrier { xp: number | null; coins: number | null; gems: number | null; level: number | null; virtualBalance: string }
interface Streak { currentStreak: number | null; longestStreak: number | null; lastActiveDate: string | null }
const isEco = (v: unknown): v is Eco => !!v && typeof v === 'object' && 'coins' in (v as object);
const isStreak = (v: unknown): v is Streak => !!v && typeof v === 'object' && 'currentStreak' in (v as object);

async function aNewSessionFilesItsAnswers(): Promise<void> {
  // signInWithProfile: the reads run before signIn() sets the authId, so the
  // guarded query functions file nothing; after it, the answers since the
  // sign-in began are filed under the new account (lifecycle.ts
  // snapshotForNewSession, with the app's writers).
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false } } });
  let authId: string | null = null;
  const guard = createQueryGuard(client, () => authId);
  const fake = fakeAsyncStorage(1);
  const snapshots = createSnapshotStore({ storage: fake.storage, getAuthId: () => authId });
  const pending = createPendingGems();
  const writeEconomy = (v: Eco | null, id: string) => snapshots.write(ECONOMY_SNAPSHOT_KEY, v ? withoutPendingGems(v) : v, id);
  const writeStreak = (v: Streak | null, id: string) => snapshots.write(STREAK_SNAPSHOT_KEY, v, id);
  const writeSub = (v: Sub | null, id: string) => snapshots.write(SUBSCRIPTION_SNAPSHOT_KEY, v, id);
  const B = 'b@example.com';

  const serverEco: Eco = { xp: 40, coins: 2500, gems: 60, level: 2, virtualBalance: '0' };
  const ecoRead = guard.guardedQueryFn<Eco | null>(['economy'], async () => { await sleep(5); return { ...serverEco }; },
    (v, ctx) => writeEconomy(v, ctx.authId));
  const streakRead = guard.guardedQueryFn<Streak | null>(['streak'], async () => { await sleep(5); return { currentStreak: 6, longestStreak: 9, lastActiveDate: '2026-11-20' }; },
    (v, ctx) => writeStreak(v, ctx.authId));
  // A seed in the subscription query (a boot with a saved session would have one): never filed.
  guard.seed(['subscription'], { isPro: true, proExpiresAt: null, proSource: 'store' });

  const startedAt = Date.now();
  await Promise.all([
    client.fetchQuery({ queryKey: ['economy'], queryFn: async () => pending.apply(await ecoRead(), authId, Date.now()) ?? null }),
    client.fetchQuery({ queryKey: ['streak'], queryFn: streakRead }),
  ]);
  check(fake.data.size === 0, 'setup: the reads ran with no account, so nothing was filed');

  authId = B; // signIn()
  // A purchase's gems shown as pending ride on the cached balance (a guest has
  // none; this checks the writer keeps them out all the same).
  pending.recordPurchase(B, 500, client.getQueryData<Eco>(['economy']), Date.now());
  client.setQueryData<Eco | null>(['economy'], (old) => pending.apply(old ?? null, authId, Date.now()) ?? null);
  check(client.getQueryData<Eco>(['economy'])?.pendingGems === 500, 'setup: the cached balance shows 500 bought gems as pending');

  const filed = {
    economy: fileIfStillSignedIn(guard.serverAnswerSince<Eco | null>(['economy'], startedAt), B, authId, writeEconomy),
    streak: fileIfStillSignedIn(guard.serverAnswerSince<Streak | null>(['streak'], startedAt), B, authId, writeStreak),
    subscription: fileIfStillSignedIn(guard.serverAnswerSince<Sub | null>(['subscription'], startedAt), B, authId, writeSub),
  };
  check(filed.economy && filed.streak, 'B7: after the sign-in, the balance and the streak are filed', filed);
  check(!filed.subscription, 'B7: a seed is not a server answer: not filed');
  const eco = snapshots.read(ECONOMY_SNAPSHOT_KEY, isEco);
  check(eco?.authId === B && eco.value.coins === 2500 && eco.value.gems === 60 && eco.value.pendingGems === undefined,
    'B7: the balance is filed under the new account as the server sent it (pending gems never saved)', eco);
  check(snapshots.read(STREAK_SNAPSHOT_KEY, isStreak)?.value.currentStreak === 6, 'B7: the streak is filed under the new account');

  // Not filed: an answer from before the sign-in began, or another account by now.
  const later = Date.now() + 1000;
  check(!fileIfStillSignedIn(guard.serverAnswerSince<Eco | null>(['economy'], later), B, authId, writeEconomy),
    'B7: no answer since the start: nothing filed');
  check(!fileIfStillSignedIn({ ...serverEco }, B, 'c@example.com', writeEconomy) && !fileIfStillSignedIn({ ...serverEco }, B, null, writeEconomy),
    'B7: another account signed in by now (or none): nothing filed');
  check(!fileIfStillSignedIn<Eco | null>({ ...serverEco }, B, B, () => { throw new Error('disk full'); }),
    'B7: a failing write is reported, never thrown');
}

function lateAnswersBelongToTheirAccount(): void {
  const A = 'a@example.com';
  const B = 'b@example.com';
  let authId: string | null = A;
  const accounts = createAccountTracker(() => authId);

  const steady = accounts.atStart();
  check(steady.authId === A && !steady.changed() && steady.fileAs() === A, 'B7: nothing changed: cached and filed under the account that asked');

  const forA = accounts.atStart();
  authId = B; // another account signed in (no sign-out in between)
  check(forA.changed() && forA.fileAs() === null, 'B7: another account signed in since: neither cached nor filed');
  authId = A;

  const beforeSignOut = accounts.atStart();
  accounts.endSession(); // signOut() begins; the auth store still says A for a moment
  check(beforeSignOut.changed() && beforeSignOut.fileAs() === null,
    'B7: a sign-out began (the auth store not cleared yet): neither cached nor filed');
  authId = null;
  check(beforeSignOut.changed() && beforeSignOut.fileAs() === null, 'B7: ... and after it');
  authId = A; // the same account signs in again
  check(beforeSignOut.changed() && beforeSignOut.fileAs() === null,
    "B7: the same account signing in again: the earlier session's answer still is not applied");
  const afterSignIn = accounts.atStart();
  check(!afterSignIn.changed() && afterSignIn.fileAs() === A, 'B7: a request of the new session is unaffected by the earlier sign-out');

  // A launch: the auth store has not loaded yet, so no account is known when
  // the login bonus's POST goes out; it loads while the request is in flight.
  authId = null;
  const preLoad = accounts.atStart();
  authId = A;
  check(!preLoad.changed() && preLoad.fileAs() === null,
    'B7: started before the auth store loaded: still cached (as before), never filed (no account to file it under)');
  // A guest's request, still a guest.
  authId = null;
  const guest = accounts.atStart();
  check(!guest.changed() && guest.fileAs() === null, 'B7: a guest: cached as before, nothing to file');
}

async function aLateAnswerAfterSignOutWritesNothing(): Promise<void> {
  // fireEconomyDelta for A is in flight; A signs out, B signs in; A's answer
  // lands. It must reach neither B's cache nor any snapshot (it used to be
  // cached, and filed under whoever was signed in when it landed).
  const A = 'a@example.com';
  const B = 'b@example.com';
  let authId: string | null = A;
  const accounts = createAccountTracker(() => authId);
  const fake = fakeAsyncStorage(1);
  const snapshots = createSnapshotStore({ storage: fake.storage, getAuthId: () => authId });
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false } } });
  const answerLanded = (account: RequestAccount, economy: Eco) => {
    // useEconomyUIStore fireEconomyDelta .then (the same steps).
    if (account.changed()) return;
    client.setQueryData(['economy'], economy);
    const fileAs = account.fileAs();
    if (fileAs) snapshots.write(ECONOMY_SNAPSHOT_KEY, withoutPendingGems(economy), fileAs);
  };

  client.setQueryData(['economy'], { xp: 1, coins: 900, gems: 5, level: 1, virtualBalance: '0' });
  const inFlight = accounts.atStart();

  // signOut(): session ends, cache and memory cleared, saved snapshots removed,
  // then the auth store. The answer lands in the middle of it.
  accounts.endSession();
  client.clear();
  snapshots.reset();
  answerLanded(inFlight, { xp: 1, coins: 1900, gems: 5, level: 1, virtualBalance: '0' });
  await Promise.all(SNAPSHOT_STORAGE_KEYS.map((k) => fake.removeItem(k)));
  authId = null;
  await sleep(5);
  check(client.getQueryData(['economy']) === undefined, "B7: A's late answer during the sign-out does not refill the cache");
  check(!fake.data.has(ECONOMY_SNAPSHOT_KEY), "B7: ... nor A's saved balance on disk");

  // B signs in; another of A's answers lands now.
  authId = B;
  client.setQueryData(['economy'], { xp: 0, coins: 50, gems: 0, level: 1, virtualBalance: '0' });
  answerLanded(inFlight, { xp: 1, coins: 2900, gems: 5, level: 1, virtualBalance: '0' });
  await sleep(5);
  check(client.getQueryData<Eco>(['economy'])?.coins === 50, "B7: A's late answer does not reach B's cache");
  check(!fake.data.has(ECONOMY_SNAPSHOT_KEY) && snapshots.read(ECONOMY_SNAPSHOT_KEY, isEco) === null,
    "B7: and is never filed under B (it used to be)");

  // B's own answer is cached and filed as usual.
  answerLanded(accounts.atStart(), { xp: 0, coins: 80, gems: 0, level: 1, virtualBalance: '0' });
  await sleep(5);
  const filed = snapshots.read(ECONOMY_SNAPSHOT_KEY, isEco);
  check(client.getQueryData<Eco>(['economy'])?.coins === 80 && filed?.authId === B && filed.value.coins === 80,
    "B7: B's own answer is cached and filed under B");
}

async function main(): Promise<void> {
  await primeReadsTheRightAccount();
  await writeWinsOverALatePrime();
  await resetForgetsAndStaysForgotten();
  await storageErrorIsNoSnapshot();
  await primeCapDecidesThePath();
  await secondBootJoinsTheFirst();
  await waitingForStores();
  await stuckStoresAreReported();
  await aRealStoreWithUnreadableJson();
  snapshotKeysAreOneList();
  await signOutLeavesNoSnapshot();
  await aNewSessionFilesItsAnswers();
  lateAnswersBelongToTheirAccount();
  await aLateAnswerAfterSignOutWritesNothing();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
void main();
