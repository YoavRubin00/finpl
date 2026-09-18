// src/features/economy/querySnapshot.ts
//
// Last-known-value snapshots for the wallet queries (economy / streak), so a
// cold open shows the user's real balance instead of "0 → count-up"
// (UX-21, audit 2026-09-18). Hay Day never shows 0; it shows the last value.
//
// Design:
//  - Written ONLY on server-confirmed values (successful GET, mutation
//    onSuccess) — never on render, never on optimistic writes.
//  - Keyed by authId so an account switch can never leak the previous
//    account's balance into the next one's placeholder.
//  - Read synchronously from MMKV for the very first render; the AsyncStorage
//    fallback (web / MMKV missing) primes an in-memory cache asynchronously.
import { readStringSync, zustandStorage } from '../../lib/zustandStorage';
import { useAuthStore } from '../auth/useAuthStore';

interface SnapshotEnvelope<T> {
  authId: string;
  at: number;
  value: T;
}

const memory = new Map<string, SnapshotEnvelope<unknown> | null>();
const primed = new Set<string>();

function parseEnvelope<T>(raw: string | null, isValue: (v: unknown) => v is T): SnapshotEnvelope<T> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const env = parsed as Partial<SnapshotEnvelope<unknown>>;
    if (typeof env.authId !== 'string' || typeof env.at !== 'number' || !isValue(env.value)) return null;
    return { authId: env.authId, at: env.at, value: env.value };
  } catch {
    return null;
  }
}

/**
 * Returns the snapshot for the CURRENT authId, or null. Safe to call during
 * render (pure read; the one-time async prime happens off the render path).
 */
export function readSnapshot<T>(key: string, isValue: (v: unknown) => v is T): SnapshotEnvelope<T> | null {
  const authId = useAuthStore.getState().authId;
  if (!authId) return null;

  if (!memory.has(key)) {
    const sync = readStringSync(key);
    if (sync !== null) {
      memory.set(key, parseEnvelope(sync, isValue));
    } else if (!primed.has(key)) {
      // No MMKV (web / fallback): prime once from AsyncStorage. The first
      // render(s) see null; subsequent renders get the snapshot.
      primed.add(key);
      Promise.resolve<string | null>(zustandStorage.getItem(key) as string | null | Promise<string | null>)
        .then((raw) => { if (!memory.has(key)) memory.set(key, parseEnvelope(raw, isValue)); })
        .catch(() => { /* non-fatal — placeholder stays empty */ });
      return null;
    } else {
      return null;
    }
  }

  const env = memory.get(key);
  if (!env || env.authId !== authId || !isValue(env.value)) return null;
  return { authId: env.authId, at: env.at, value: env.value };
}

/** Persist a server-confirmed value for the current authId. Fire-and-forget. */
export function writeSnapshot<T>(key: string, value: T | null | undefined): void {
  if (value === null || value === undefined) return;
  const authId = useAuthStore.getState().authId;
  if (!authId) return;
  const env: SnapshotEnvelope<T> = { authId, at: Date.now(), value };
  memory.set(key, env);
  try {
    void Promise.resolve(zustandStorage.setItem(key, JSON.stringify(env))).catch(() => { /* non-fatal */ });
  } catch { /* non-fatal */ }
}
