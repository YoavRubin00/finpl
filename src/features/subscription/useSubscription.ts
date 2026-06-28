// src/features/subscription/useSubscription.ts
import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, syncSubscription, type SubscriptionState } from '../../lib/api/subscription';
import { checkProEntitlement, RC_ENTITLEMENT_PRO } from '../../services/revenueCat';
import type { CustomerInfo } from '../../services/revenueCat';
import { useAuthStore } from '../auth/useAuthStore';

export const subscriptionQueryKey = ['subscription'] as const;

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
      if (devWebPro) return { isPro: true, proExpiresAt: null } as SubscriptionState;
      return (await getSubscription()).subscription;
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
    mutationFn: async (customerInfo: CustomerInfo | null) => {
      const isPro = customerInfo
        ? customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined
        : await checkProEntitlement();
      const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
      return (await syncSubscription({ isPro, proExpiresAt })).subscription;
    },
    onSuccess: (sub) => {
      qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, sub);
    },
  });
}
