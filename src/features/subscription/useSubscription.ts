// src/features/subscription/useSubscription.ts
import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, syncSubscription, type SubscriptionState } from '../../lib/api/subscription';
import { checkProEntitlement, RC_ENTITLEMENT_PRO } from '../../services/revenueCat';
import type { CustomerInfo } from '../../services/revenueCat';
import { useAuthStore } from '../auth/useAuthStore';
import { readSnapshot, writeSnapshot } from '../economy/querySnapshot';

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
export function writeSubscriptionSnapshot(sub: SubscriptionState | null | undefined): void {
  writeSnapshot(SUBSCRIPTION_SNAPSHOT_KEY, normalizeSubscription(sub));
}

/** GET the subscription and record it as the last known state. */
export async function fetchSubscription(): Promise<SubscriptionState | null> {
  const sub = (await getSubscription()).subscription;
  writeSubscriptionSnapshot(sub);
  return sub;
}

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
      return fetchSubscription();
    },
    staleTime: 30_000,
    enabled: (isAuthenticated && !isGuest) || devWebPro,
  });
}

export function useIsPro(): boolean {
  const { data } = useSubscription();
  return data?.isPro === true;
}

export function useSyncFromRevenueCat() {
  const qc = useQueryClient();
  return useMutation({
    retry: 2,
    mutationFn: async (customerInfo: CustomerInfo | null) => {
      const isPro = customerInfo
        ? customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined
        : await checkProEntitlement();
      const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
      return (await syncSubscription({ isPro, proExpiresAt })).subscription;
    },
    onSuccess: (sub) => {
      qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, sub);
      writeSubscriptionSnapshot(sub);
    },
  });
}
