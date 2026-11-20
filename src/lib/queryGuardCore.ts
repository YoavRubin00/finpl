// src/lib/queryGuardCore.ts
//
// Server reads that never overwrite newer local writes (boot review 20.11).
// Pure logic, no React Native imports, so scripts/test-query-guard.ts runs it
// in Node; the app binds it to its query client in src/lib/queryGuard.ts.
//
// Why: a cold start now renders from saved state before the server answers,
// so a read can still be in flight when something writes the same query (the
// login-bonus optimistic write, the streak tick's POST answer, a purchase's
// subscription answer). React-query stores whatever the read returns, so the
// older answer used to win. Every query function of the boot-read queries
// (economy, streak, subscription, progress, user stats, profile) goes through
// guardedQueryFn, whether the boot or a screen's hook started the request.
import type { QueryClient, QueryKey } from '@tanstack/react-query';

// A seed is a saved snapshot put in the cache with updatedAt 0 (lifecycle.ts
// seedFromSnapshot), and the guard tells it apart by that updatedAt, never by
// object identity: when the server's answer equals the seed (nothing changed
// since the last launch, the usual case), react-query's structural sharing
// keeps the seeded object in the cache, now with the answer's updatedAt. Read
// by identity, that answer looked like "still the seed" and the launch's
// RevenueCat-to-server sync never ran (boot fix B1, 20.11).
export interface QueryGuard {
  /** Mark a value put in the cache from a saved snapshot (stored with
   *  updatedAt 0). The guard itself decides by updatedAt; isSeeded is for
   *  callers that need to know whether a cached object came from a snapshot. */
  markSeeded(value: object): void;
  isSeeded(value: unknown): boolean;
  /**
   * Puts a value in the cache as a seed: a saved snapshot, RevenueCat's cached
   * Pro, the economy store's local streak (boot fix B8, 20.11). Stored with
   * updatedAt 0, so it is stale (the next read and every mounting screen ask
   * the server), a read in flight is never dropped in its favour, and
   * serverAnswerSince never takes it for a server answer. The value the cache
   * now holds is marked seeded (structural sharing may store a copy of
   * `value` when it replaces an earlier seed) and returned. Callers decide
   * whether a seed may go in (it overwrites whatever the cache holds).
   */
  seed<T>(key: QueryKey, value: T): T | undefined;
  /**
   * Wraps a query function. If the query got a newer write while the request
   * was in flight (anything but a seeded snapshot, i.e. stored with a real
   * updatedAt), that write is kept, this answer is dropped and the query is
   * marked stale so the next ordinary refetch (mount, focus, reconnect)
   * reconciles once the writes have settled.
   *
   * `onAccepted` (e.g. a snapshot write) runs only for an answer that was
   * kept, with the authId the request was made for, and only when that account
   * is still signed in and the cache was not cleared meanwhile (a sign-out
   * clears it), so a late answer can never be filed under another account.
   */
  guardedQueryFn<T>(
    key: QueryKey,
    fetcher: () => Promise<T>,
    onAccepted?: (value: T, ctx: { authId: string }) => void,
  ): () => Promise<T>;
  /**
   * The data a query got from the server since `sinceMs`, whoever made the
   * request (the boot or a hook that mounted first: the boot joins an
   * in-flight request instead of making its own). A GET answer, or a write
   * stored since then such as a POST's answer, also when it equals the seed
   * and the cache kept the seeded object. Seeded snapshots (stored with
   * updatedAt 0) and anything older don't count. undefined = no answer.
   */
  serverAnswerSince<T>(key: QueryKey, sinceMs: number): T | undefined;
}

export function createQueryGuard(client: QueryClient, getAuthId: () => string | null): QueryGuard {
  const seededValues = new WeakSet<object>();

  const isSeeded = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && seededValues.has(value);

  return {
    markSeeded(value) {
      seededValues.add(value);
    },
    isSeeded,
    seed<T>(key: QueryKey, value: T): T | undefined {
      client.setQueryData<T>(key, value, { updatedAt: 0 });
      const stored = client.getQueryData<T>(key);
      if (typeof stored === 'object' && stored !== null) seededValues.add(stored);
      return stored;
    },
    guardedQueryFn(key, fetcher, onAccepted) {
      return async () => {
        const cache = client.getQueryCache();
        const query = cache.find({ queryKey: key, exact: true });
        const startCount = query?.state.dataUpdateCount ?? 0;
        const authId = getAuthId();

        const value = await fetcher();

        // Cleared meanwhile (sign-out): this answer belongs to nobody now.
        if (!query || cache.find({ queryKey: key, exact: true }) !== query) return value;

        const state = query.state;
        // Written meanwhile, and not a seed (updatedAt 0): a newer local write.
        if (state.dataUpdateCount !== startCount && state.data !== undefined && state.dataUpdatedAt !== 0) {
          // setTimeout, not a microtask: react-query stores this function's
          // result after it returns, and that store would clear the stale flag.
          setTimeout(() => {
            void client.invalidateQueries({ queryKey: key, refetchType: 'none' });
          }, 0);
          return state.data as typeof value;
        }
        if (onAccepted && authId && getAuthId() === authId) {
          try { onAccepted(value, { authId }); } catch { /* non-fatal */ }
        }
        return value;
      };
    },
    serverAnswerSince<T>(key: QueryKey, sinceMs: number): T | undefined {
      const state = client.getQueryState<T>(key);
      if (!state || state.status !== 'success' || state.data === undefined) return undefined;
      // A seed (updatedAt 0) or an answer from before `sinceMs`.
      if (state.dataUpdatedAt === 0 || state.dataUpdatedAt < sinceMs) return undefined;
      return state.data;
    },
  };
}
