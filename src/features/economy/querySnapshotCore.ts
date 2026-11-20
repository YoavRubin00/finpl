// src/features/economy/querySnapshotCore.ts
//
// Last-known-value snapshots (economy / streak / subscription), storage-agnostic
// and free of React Native imports so scripts/test-boot-snapshots.ts can run it
// in Node against a fake async storage. The app binds it in querySnapshot.ts.
//
// On devices the storage is AsyncStorage (see the note at the top of
// src/lib/zustandStorage.ts): nothing can be read synchronously, so a value is
// only available after prime() has loaded it into memory. read() stays safe to
// call during render: it never waits, it starts the prime and returns null.

export interface SnapshotEnvelope<T> {
  authId: string;
  at: number;
  value: T;
}

export interface SnapshotStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): unknown;
}

export interface SnapshotStore {
  /** The snapshot for the CURRENT authId, or null. Never waits: when the key
   *  is not in memory yet it starts prime(key) and returns null. */
  read<T>(key: string, isValue: (v: unknown) => v is T): SnapshotEnvelope<T> | null;
  /** Loads the key from storage into memory, once (memoized). Never rejects;
   *  a storage error counts as "no snapshot". */
  prime(key: string): Promise<void>;
  isPrimed(key: string): boolean;
  /** Persist a server-confirmed value, keyed by `forAuthId` when given (the
   *  account the request was made for), else by the current authId. */
  write<T>(key: string, value: T | null | undefined, forAuthId?: string): void;
  /** Forget everything held in memory (sign-out). A prime still in flight
   *  from before the reset can't refill it. */
  reset(): void;
}

interface RawEnvelope {
  authId: string;
  at: number;
  value: unknown;
}

function parseRaw(raw: string | null): RawEnvelope | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const env = parsed as Partial<RawEnvelope>;
    if (typeof env.authId !== 'string' || typeof env.at !== 'number') return null;
    return { authId: env.authId, at: env.at, value: env.value };
  } catch {
    return null;
  }
}

export function createSnapshotStore(deps: {
  storage: SnapshotStorage;
  /** Synchronous read when the backend has one (MMKV); null when not. */
  readSync?: (key: string) => string | null;
  getAuthId: () => string | null;
}): SnapshotStore {
  const memory = new Map<string, RawEnvelope | null>();
  const primes = new Map<string, Promise<void>>();
  let epoch = 0;

  const prime = (key: string): Promise<void> => {
    if (memory.has(key)) return Promise.resolve();
    const inFlight = primes.get(key);
    if (inFlight) return inFlight;
    const startEpoch = epoch;
    const p = Promise.resolve()
      .then(() => deps.storage.getItem(key))
      .then(
        (raw) => {
          if (epoch === startEpoch && !memory.has(key)) memory.set(key, parseRaw(raw ?? null));
        },
        () => {
          if (epoch === startEpoch && !memory.has(key)) memory.set(key, null);
        },
      );
    primes.set(key, p);
    return p;
  };

  return {
    read<T>(key: string, isValue: (v: unknown) => v is T): SnapshotEnvelope<T> | null {
      const authId = deps.getAuthId();
      if (!memory.has(key)) {
        const sync = deps.readSync?.(key) ?? null;
        if (sync !== null) {
          memory.set(key, parseRaw(sync));
        } else {
          void prime(key);
          return null;
        }
      }
      if (!authId) return null;
      const env = memory.get(key);
      if (!env || env.authId !== authId || !isValue(env.value)) return null;
      return { authId: env.authId, at: env.at, value: env.value };
    },
    prime,
    isPrimed(key: string): boolean {
      return memory.has(key);
    },
    write<T>(key: string, value: T | null | undefined, forAuthId?: string): void {
      if (value === null || value === undefined) return;
      const authId = forAuthId ?? deps.getAuthId();
      if (!authId) return;
      const env: RawEnvelope = { authId, at: Date.now(), value };
      memory.set(key, env);
      try {
        void Promise.resolve(deps.storage.setItem(key, JSON.stringify(env))).catch(() => { /* non-fatal */ });
      } catch { /* non-fatal */ }
    },
    reset(): void {
      epoch++;
      memory.clear();
      primes.clear();
    },
  };
}
