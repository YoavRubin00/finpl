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
//    goes on, and the report names it by its storage key.
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { createSnapshotStore, type SnapshotStorage } from '../src/features/economy/querySnapshotCore';
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
function check(cond: boolean, label: string): void {
  if (cond) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}`); }
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
  return { storage, data, reads: () => reads };
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
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
void main();
