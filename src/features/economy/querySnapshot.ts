// src/features/economy/querySnapshot.ts
//
// Last-known-value snapshots for the wallet queries (economy / streak) and the
// subscription, so a cold open shows the user's real balance and Pro state
// instead of "0 → count-up" (UX-21, audit 2026-09-18; boot without waiting,
// 20.11). Hay Day never shows 0; it shows the last value.
//
// Design:
//  - Written ONLY on server-confirmed values (successful GET, mutation
//    onSuccess) — never on render, never on optimistic writes.
//  - Keyed by authId so an account switch can never leak the previous
//    account's balance into the next one's placeholder.
//  - On devices everything lives in AsyncStorage (MMKV never initialises, see
//    src/lib/zustandStorage.ts), so a snapshot is readable only after it was
//    primed into memory. The cold boot primes the three snapshots it needs and
//    waits for them, bounded (lifecycle.ts); readSnapshot() never waits and is
//    safe during render. Logic: querySnapshotCore.ts.
import { readStringSync, zustandStorage } from '../../lib/zustandStorage';
import { useAuthStore } from '../auth/useAuthStore';
import { createAccountTracker, createSnapshotStore, type RequestAccount, type SnapshotEnvelope } from './querySnapshotCore';

export {
  ECONOMY_SNAPSHOT_KEY,
  STREAK_SNAPSHOT_KEY,
  SUBSCRIPTION_SNAPSHOT_KEY,
  SNAPSHOT_STORAGE_KEYS,
  fileIfStillSignedIn,
} from './querySnapshotCore';
export type { RequestAccount } from './querySnapshotCore';

const store = createSnapshotStore({
  storage: zustandStorage,
  readSync: readStringSync,
  getAuthId: () => useAuthStore.getState().authId,
});

/**
 * Returns the snapshot for the CURRENT authId, or null. Safe to call during
 * render: when the key is not loaded yet it starts loading it and returns null.
 */
export function readSnapshot<T>(key: string, isValue: (v: unknown) => v is T): SnapshotEnvelope<T> | null {
  return store.read(key, isValue);
}

/**
 * Persist a server-confirmed value. Fire-and-forget. Keyed by `forAuthId` when
 * given (the account the request was made for, so an answer that lands after
 * a sign-out / account switch can't be filed under the next account), else
 * by the current authId.
 */
export function writeSnapshot<T>(key: string, value: T | null | undefined, forAuthId?: string): void {
  store.write(key, value, forAuthId);
}

/** Load a snapshot from storage into memory (once). Never rejects. */
export function primeSnapshot(key: string): Promise<void> {
  return store.prime(key);
}

export function isSnapshotPrimed(key: string): boolean {
  return store.isPrimed(key);
}

const accounts = createAccountTracker(() => useAuthStore.getState().authId);

/**
 * The account a request is made for, taken when it starts, for its answer
 * that lands later (boot fix B7, querySnapshotCore.ts): skip the cache write
 * when `changed()`, file the snapshot only under `fileAs()`. Used by every
 * late writer of the three snapshots (the economy POSTs, the streak tick and
 * activity POSTs, the subscription purchase POST and its re-reads).
 */
export function requestAccount(): RequestAccount {
  return accounts.atStart();
}

/** A sign-out or account wipe begins (lifecycle.ts): answers to requests
 *  started before it are no longer this device's to apply. */
export function endAccountSession(): void {
  accounts.endSession();
}

/** Forget the snapshots held in memory (sign-out, account wipe). A prime
 *  still in flight can't refill it. Storage is separate: sign-out removes
 *  SNAPSHOT_STORAGE_KEYS (lifecycle.ts), the account wipe removes every key. */
export function resetSnapshotMemory(): void {
  store.reset();
}
