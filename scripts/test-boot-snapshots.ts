// scripts/test-boot-snapshots.ts
// Run: npx tsx scripts/test-boot-snapshots.ts
// The cold boot's local-storage side with an ASYNC storage only, as on devices
// (MMKV never initialises there, see src/lib/zustandStorage.ts):
//  - the snapshot prime: nothing is readable before it, the right account's
//    value after it, never another account's;
//  - a slow storage hits the prime cap and the boot falls back to the network
//    path; a fast one lets it open at once ('cached');
//  - a second concurrent boot joins the first; "try again" starts a new one;
//  - waiting for persisted stores to load, with and without a cap.
import { createSnapshotStore, type SnapshotStorage } from '../src/features/economy/querySnapshotCore';
import { createSingleFlight, decideBootPath, waitCapped } from '../src/lib/auth/bootCore';
import { whenHydrated, whenAllHydrated, type HydratingStore } from '../src/lib/stores/whenHydrated';

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

async function main(): Promise<void> {
  await primeReadsTheRightAccount();
  await writeWinsOverALatePrime();
  await resetForgetsAndStaysForgotten();
  await storageErrorIsNoSnapshot();
  await primeCapDecidesThePath();
  await secondBootJoinsTheFirst();
  await waitingForStores();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
void main();
