// src/lib/stores/whenHydrated.ts
//
// Waiting for zustand persist stores to finish loading from storage. On
// devices that storage is AsyncStorage (src/lib/zustandStorage.ts), so a store
// is NOT loaded on the first frame: until it is, it holds its initial state,
// and a set() before then is overwritten by the loaded state (and briefly
// written over the stored one). Code that reads or writes a persisted store at
// launch must wait for it. Pure module (no React Native imports).

export interface HydratingStore {
  persist: {
    hasHydrated(): boolean;
    onFinishHydration(fn: () => void): () => void;
    /** zustand persist's options; `name` is the storage key (for reports). */
    getOptions?(): { name?: string };
  };
}

/** The store's storage key, for reports ('unknown' when it has none). */
export function storeName(store: HydratingStore): string {
  try {
    return store.persist.getOptions?.().name ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface HydrationWait {
  ms: number;
  /** The cap ran out before every store had loaded. */
  capped: boolean;
}

/** Resolves when the store has loaded, or after `capMs` (capped: true). */
export function whenHydrated(store: HydratingStore, capMs?: number): Promise<HydrationWait> {
  const startedAt = Date.now();
  if (store.persist.hasHydrated()) return Promise.resolve({ ms: 0, capped: false });
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (capped: boolean) => {
      if (done) return;
      done = true;
      unsub();
      if (timer !== null) clearTimeout(timer);
      resolve({ ms: Date.now() - startedAt, capped });
    };
    const unsub = store.persist.onFinishHydration(() => finish(false));
    if (capMs !== undefined) timer = setTimeout(() => finish(true), capMs);
    // It may have finished between the check above and the subscription.
    if (store.persist.hasHydrated()) finish(false);
  });
}

/**
 * whenHydrated(store) with no limit, plus a report: `onSlow(ms)` runs once if
 * the store has not loaded after `reportAfterMs`, and the wait goes on (it
 * resolves only if the store loads). zustand never finishes loading a store
 * whose saved JSON fails to parse or whose read fails, and gives no sign of it
 * (boot fix B6, 20.11).
 */
export function whenHydratedReportingSlow(
  store: HydratingStore,
  reportAfterMs: number,
  onSlow: (ms: number) => void,
): Promise<HydrationWait> {
  if (store.persist.hasHydrated()) return Promise.resolve({ ms: 0, capped: false });
  const timer = setTimeout(() => {
    try { onSlow(reportAfterMs); } catch { /* a report must never break the wait */ }
  }, reportAfterMs);
  return whenHydrated(store).then((wait) => {
    clearTimeout(timer);
    return wait;
  });
}

/** Resolves when all stores have loaded, or after `capMs` overall. */
export function whenAllHydrated(stores: HydratingStore[], capMs?: number): Promise<HydrationWait> {
  const startedAt = Date.now();
  return Promise.all(stores.map((s) => whenHydrated(s, capMs))).then((waits) => ({
    ms: Date.now() - startedAt,
    capped: waits.some((w) => w.capped),
  }));
}
