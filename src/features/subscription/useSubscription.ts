// src/features/subscription/useSubscription.ts
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
  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: async () => (await getSubscription()).subscription,
    staleTime: 30_000,
    enabled: isAuthenticated && !isGuest,
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
