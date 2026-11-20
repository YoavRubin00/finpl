// src/features/economy/useEconomy.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyEconomyDelta, getEconomy, type Economy } from '../../lib/api/economy';
import { useAuthStore } from '../auth/useAuthStore';
import { guardedQueryFn } from '../../lib/queryGuard';
import { whenHydrated } from '../../lib/stores/whenHydrated';
import { ECONOMY_SNAPSHOT_KEY, isSnapshotPrimed, primeSnapshot, readSnapshot, writeSnapshot } from './querySnapshot';
import { createPendingGems, withoutPendingGems } from './pendingGemsCore';

export { spendableGems } from './pendingGemsCore';

export const economyQueryKey = ['economy'] as const;

// ─── Bought gems the server has not credited yet (pendingGemsCore.ts) ───────
// In memory only, for the signed-in account; cleared on sign-out and account
// wipe (lifecycle.ts). Every server answer written into the economy cache goes
// through withPendingGems(); every gem change the app sends goes through
// notePendingGemDelta().
const pendingGems = createPendingGems();
const currentAuthId = (): string | null => useAuthStore.getState().authId;

/** The value to cache for a server answer (or the cached value): bought gems
 *  the server still lacks stay on top, as `pendingGems` (not spendable). */
export function withPendingGems(economy: Economy | null): Economy | null {
  return pendingGems.apply(economy, currentAuthId(), Date.now()) ?? null;
}

/** The app is sending this gem change to the server (a reward, a spend). */
export function notePendingGemDelta(gemsDelta: number | null | undefined): void {
  pendingGems.noteDelta(gemsDelta);
}

/** A store purchase of `gems` just completed. `current` = what the cache shows. */
export function recordPurchasedGems(gems: number, current: Economy | null | undefined): boolean {
  return pendingGems.recordPurchase(currentAuthId(), gems, current, Date.now());
}

/** Ends the pending gems once their window has passed. True when it did. */
export function expirePendingGems(): boolean {
  return pendingGems.expireIfDue(Date.now());
}

/** Sign-out / account wipe. */
export function clearPendingGems(): void {
  pendingGems.clear();
}

// Persisted last-known economy (UX-21 flash-of-zero) under ECONOMY_SNAPSHOT_KEY
// (querySnapshotCore.ts). Keyed by authId inside.

function isEconomy(v: unknown): v is Economy {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<Economy>;
  const numOrNull = (x: unknown): boolean => x === null || typeof x === 'number';
  return numOrNull(e.xp) && numOrNull(e.coins) && numOrNull(e.gems) && numOrNull(e.level)
    && typeof e.virtualBalance === 'string';
}

/** Shown while the real query is pending on a cold open — the LAST server-
 *  confirmed balance for this account, never 0. Pure read (no writes on render).
 *  The cold boot also seeds the cache with it (lifecycle.ts). */
export function economyPlaceholder(): Economy | undefined {
  return readSnapshot(ECONOMY_SNAPSHOT_KEY, isEconomy)?.value;
}

/** Record a server-confirmed economy row as the cold-open snapshot. Only the
 *  server's part: bought gems still pending are dropped (a value read back
 *  from the cache may carry them; boot fix B7). */
export function writeEconomySnapshot(economy: Economy | null | undefined, forAuthId?: string): void {
  writeSnapshot(ECONOMY_SNAPSHOT_KEY, economy ? withoutPendingGems(economy) : economy, forAuthId);
}

/** Load the saved balance from storage (AsyncStorage on devices). */
export function primeEconomySnapshot(): Promise<void> {
  return primeSnapshot(ECONOMY_SNAPSHOT_KEY);
}

/** Upper bound on waiting for the saved balance before an optimistic reward is
 *  shown anyway (from 0, as before). Same order as the boot's own caps. */
const ECONOMY_BASE_WAIT_MS = 3000;

/**
 * Whether an optimistic economy write can start now: the account is known
 * (auth store loaded) and, for a signed-in account, its saved balance has been
 * loaded. False only during the first moments of a launch on a device, where
 * rewards granted on mount (daily login bonus) used to start from 0 coins /
 * 0 gems because the saved balance was still in AsyncStorage (20.11).
 */
export function economyBaseReady(): boolean {
  if (!useAuthStore.persist.hasHydrated()) return false;
  const { authId, isGuest } = useAuthStore.getState();
  if (!authId || isGuest) return true; // no saved server balance to wait for
  return isSnapshotPrimed(ECONOMY_SNAPSHOT_KEY);
}

/** Resolves once economyBaseReady() would be true, or after a few seconds. */
export async function whenEconomyBaseReady(): Promise<void> {
  const startedAt = Date.now();
  await whenHydrated(useAuthStore, ECONOMY_BASE_WAIT_MS);
  const left = Math.max(0, ECONOMY_BASE_WAIT_MS - (Date.now() - startedAt));
  await Promise.race([primeEconomySnapshot(), new Promise<void>((r) => setTimeout(r, left))]);
}

/** GET /api/sync/economy, guarded: never overwrites a newer local write
 *  (queryGuard), snapshots only the answers it keeps (as the server sent them). */
const guardedEconomyRead = guardedQueryFn(
  economyQueryKey,
  async () => (await getEconomy()).economy,
  (economy, { authId }) => writeEconomySnapshot(economy, authId),
);

/** The economy query function (screens and the boot): the guarded read, with
 *  bought gems the server has not credited yet kept on screen. */
export const economyQueryFn = async (): Promise<Economy | null> => withPendingGems(await guardedEconomyRead());

export function useEconomy() {
  // Guests cannot read their economy server-side — they have no auth token,
  // so this query would just generate a 401 every mount. Skip it entirely
  // for guests; the fire-and-forget optimistic cache writes keep the local
  // UI in sync until they convert to a real account.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: economyQueryKey,
    // Snapshot only on a successful fetch (event-driven, never per render).
    queryFn: economyQueryFn,
    staleTime: 30_000,
    enabled: isAuthenticated && !isGuest,
    // UX-21: placeholder = last snapshot for THIS authId (readSnapshot returns
    // null for guests / other accounts, so the header falls back to 0 only
    // for a genuinely new wallet).
    placeholderData: economyPlaceholder,
  });
}

interface DeltaInput {
  xpDelta?: number;
  coinsDelta?: number;
  gemsDelta?: number;
  virtualBalanceSet?: number;
}

export function useApplyEconomyDelta() {
  const qc = useQueryClient();
  return useMutation({
    // Sequential scope so two concurrent mutations (e.g. useSpendVirtual +
    // useCreditVirtual fired together) don't both read the same stale balance
    // from the cache before either has written its result. React Query queues
    // mutations sharing a scope.id and runs them one at a time.
    scope: { id: 'economy' },
    mutationKey: economyQueryKey,
    mutationFn: async (input: DeltaInput) => (await applyEconomyDelta(input)).economy,
    onMutate: async (input) => {
      notePendingGemDelta(input.gemsDelta);
      await qc.cancelQueries({ queryKey: economyQueryKey });
      const prev = qc.getQueryData<Economy | null>(economyQueryKey);
      qc.setQueryData<Economy | null>(economyQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          xp: (old.xp ?? 0) + (input.xpDelta ?? 0),
          coins: (old.coins ?? 0) + (input.coinsDelta ?? 0),
          gems: (old.gems ?? 0) + (input.gemsDelta ?? 0),
          virtualBalance: typeof input.virtualBalanceSet === 'number'
            ? input.virtualBalanceSet.toString()
            : old.virtualBalance,
        };
      });
      return { prev };
    },
    onError: (_e, _i, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(economyQueryKey, ctx.prev);
      // Only invalidate on error so the next render pulls fresh server truth.
      qc.invalidateQueries({ queryKey: economyQueryKey });
    },
    // Server already returned the authoritative economy row — write it straight
    // into the cache instead of invalidating, which would trigger a redundant
    // GET /api/sync/economy after every XP/coin/gem mutation.
    onSuccess: (economy) => {
      qc.setQueryData(economyQueryKey, withPendingGems(economy));
      // Server-authoritative row → keep the cold-open snapshot fresh (UX-21).
      writeSnapshot(ECONOMY_SNAPSHOT_KEY, economy);
    },
  });
}

export function useAwardXp() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ xpDelta: amount });
}
export function useAwardCoins() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ coinsDelta: amount });
}
export function useSpendCoins() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ coinsDelta: -amount });
}
export function useAwardGems() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ gemsDelta: amount });
}
export function useSpendGems() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ gemsDelta: -amount });
}
export function useSetVirtualBalance() {
  const { mutate } = useApplyEconomyDelta();
  return (value: number) => mutate({ virtualBalanceSet: value });
}

export function useSpendVirtual() {
  const { data } = useEconomy();
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => {
    const current = data?.virtualBalance ? parseFloat(data.virtualBalance) : 0;
    mutate({ virtualBalanceSet: Math.max(0, current - amount) });
  };
}

export function useCreditVirtual() {
  const { data } = useEconomy();
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => {
    const current = data?.virtualBalance ? parseFloat(data.virtualBalance) : 0;
    mutate({ virtualBalanceSet: current + amount });
  };
}
