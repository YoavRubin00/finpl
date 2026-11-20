// src/features/subscription/useSubscription.ts
import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, syncSubscription, type SubscriptionState } from '../../lib/api/subscription';
import { checkProEntitlement, RC_ENTITLEMENT_PRO } from '../../services/revenueCat';
import type { CustomerInfo } from '../../services/revenueCat';
import { useAuthStore } from '../auth/useAuthStore';
import { readSnapshot, writeSnapshot } from '../economy/querySnapshot';
import { guardedQueryFn } from '../../lib/queryGuard';

export const subscriptionQueryKey = ['subscription'] as const;

/**
 * Last server-confirmed subscription for this account (keyed by authId inside),
 * so a cold start can show a paying user as Pro before the server answers
 * (boot without waiting on the network, 20.11). Written only from server
 * answers, never from a guess. A definite server answer replaces it; a timeout
 * or an error never does.
 */
const SUBSCRIPTION_SNAPSHOT_KEY = 'subscription-snapshot:v1';

function isSubscriptionState(v: unknown): v is SubscriptionState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<SubscriptionState>;
  const boolOrNull = s.isPro === null || typeof s.isPro === 'boolean';
  const strOrNull = (x: unknown): boolean => x === null || x === undefined || typeof x === 'string';
  return boolOrNull && strOrNull(s.proExpiresAt) && strOrNull(s.proSource);
}

/** A server answer of `subscription: null` (no row) is a definite "not Pro". */
function normalizeSubscription(sub: SubscriptionState | null | undefined): SubscriptionState {
  return sub ?? { isPro: false, proExpiresAt: null, proSource: null };
}

export function readSubscriptionSnapshot(): SubscriptionState | null {
  return readSnapshot(SUBSCRIPTION_SNAPSHOT_KEY, isSubscriptionState)?.value ?? null;
}

/** Call with a server answer only. */
export function writeSubscriptionSnapshot(sub: SubscriptionState | null | undefined, forAuthId?: string): void {
  writeSnapshot(SUBSCRIPTION_SNAPSHOT_KEY, normalizeSubscription(sub), forAuthId);
}

/** GET the subscription as a query function: a late answer never overwrites a
 *  newer write such as a purchase's answer (queryGuard), and only answers it
 *  keeps become the last known state. */
export const subscriptionQueryFn = guardedQueryFn(
  subscriptionQueryKey,
  async () => (await getSubscription()).subscription,
  (sub, { authId }) => writeSubscriptionSnapshot(sub, authId),
);

export function useSubscription() {
  // Skip for guests — they have no RevenueCat entitlement yet; useIsPro()
  // returns false from undefined data, which is correct.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isGuest = useAuthStore((s) => s.isGuest);
  // DEV-ONLY Pro override for the local WEB dev server: RevenueCat doesn't run
  // on web, so force the Pro entitlement so Pro features can be exercised in the
  // browser. Gated on __DEV__ AND Platform.OS==='web' so it can NEVER affect
  // production or native dev builds. (Yoav 2026-06-28 — web Pro test.)
  const devWebPro = __DEV__ && Platform.OS === 'web';
  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: async () => {
      if (devWebPro) return { isPro: true, proExpiresAt: null, proSource: null } as SubscriptionState;
      return subscriptionQueryFn();
    },
    staleTime: 30_000,
    enabled: (isAuthenticated && !isGuest) || devWebPro,
  });
}

export function useIsPro(): boolean {
  const { data } = useSubscription();
  return data?.isPro === true;
}

/** Re-reads after a purchase the server could not confirm yet (ms after it). */
const PURCHASE_RECHECK_MS = [5_000, 15_000, 45_000];

export function useSyncFromRevenueCat() {
  const qc = useQueryClient();
  return useMutation({
    retry: 2,
    mutationFn: async (customerInfo: CustomerInfo | null) => {
      const isPro = customerInfo
        ? customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined
        : await checkProEntitlement();
      const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
      const subscription = (await syncSubscription({ isPro, proExpiresAt })).subscription;
      return { subscription, rcIsPro: isPro, rcExpiresAt: proExpiresAt };
    },
    onSuccess: ({ subscription: sub, rcIsPro, rcExpiresAt }) => {
      writeSubscriptionSnapshot(sub);
      if (rcIsPro && sub?.isPro !== true) {
        // Since 2026-11-20 the server makes an account Pro only once
        // RevenueCat confirms it (or its webhook lands), so right after a
        // purchase it can still say "not Pro". Show the store's answer for now
        // (not saved as the last known state) and re-read the server shortly.
        qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, {
          isPro: true,
          proExpiresAt: rcExpiresAt,
          proSource: sub?.proSource ?? null,
        });
        recheckAfterPurchase(qc, 0);
        return;
      }
      qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, sub);
    },
  });
}

/** Keeps the store's "Pro" on screen until the server agrees; after the last
 *  re-read the server's answer stands, whatever it is. */
function recheckAfterPurchase(qc: ReturnType<typeof useQueryClient>, attempt: number): void {
  const last = attempt >= PURCHASE_RECHECK_MS.length - 1;
  setTimeout(() => {
    void (async () => {
      try {
        const sub = (await getSubscription()).subscription;
        if (sub?.isPro === true || last) {
          qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, sub);
          writeSubscriptionSnapshot(sub);
          return;
        }
      } catch { /* try again below */ }
      if (!last) recheckAfterPurchase(qc, attempt + 1);
    })();
  }, PURCHASE_RECHECK_MS[attempt]);
}
