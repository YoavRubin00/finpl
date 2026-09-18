// src/features/economy/useEconomy.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyEconomyDelta, getEconomy, type Economy } from '../../lib/api/economy';
import { useAuthStore } from '../auth/useAuthStore';
import { readSnapshot, writeSnapshot } from './querySnapshot';

export const economyQueryKey = ['economy'] as const;

/** Persisted last-known economy (UX-21 flash-of-zero). Keyed by authId inside. */
const ECONOMY_SNAPSHOT_KEY = 'economy-snapshot:v1';

function isEconomy(v: unknown): v is Economy {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<Economy>;
  const numOrNull = (x: unknown): boolean => x === null || typeof x === 'number';
  return numOrNull(e.xp) && numOrNull(e.coins) && numOrNull(e.gems) && numOrNull(e.level)
    && typeof e.virtualBalance === 'string';
}

/** Shown while the real query is pending on a cold open — the LAST server-
 *  confirmed balance for this account, never 0. Pure read (no writes on render). */
function economyPlaceholder(): Economy | undefined {
  return readSnapshot(ECONOMY_SNAPSHOT_KEY, isEconomy)?.value;
}

export function useEconomy() {
  // Guests cannot read their economy server-side — they have no auth token,
  // so this query would just generate a 401 every mount. Skip it entirely
  // for guests; the fire-and-forget optimistic cache writes keep the local
  // UI in sync until they convert to a real account.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  return useQuery({
    queryKey: economyQueryKey,
    queryFn: async () => {
      const economy = (await getEconomy()).economy;
      // Snapshot only on a successful fetch (event-driven, never per render).
      writeSnapshot(ECONOMY_SNAPSHOT_KEY, economy);
      return economy;
    },
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
      qc.setQueryData(economyQueryKey, economy);
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
