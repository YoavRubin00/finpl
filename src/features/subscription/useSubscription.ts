// src/features/subscription/useSubscription.ts
import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, syncSubscription, type SubscriptionState } from '../../lib/api/subscription';
import { checkProEntitlement, RC_ENTITLEMENT_PRO } from '../../services/revenueCat';
import type { CustomerInfo } from '../../services/revenueCat';
import { useAuthStore } from '../auth/useAuthStore';
import { primeSnapshot, readSnapshot, writeSnapshot } from '../economy/querySnapshot';
import { guardedQueryFn } from '../../lib/queryGuard';
import { createStoreProOverride, storeProOverServer } from './proOverrideCore';
import { withExpiryApplied } from './subscriptionSeedCore';

export const subscriptionQueryKey = ['subscription'] as const;

// ─── "The store says Pro" for this session (proOverrideCore.ts) ─────────────
// Set from a FRESH RevenueCat answer that lists the Pro entitlement (a
// purchase, a restore, the launch sync's fresh read), for the signed-in
// account, until the entitlement expires (24 h when it has none). Applied only
// to what the subscription query function returns (and the purchase
// re-reads), so a refetch never locks a paying user out while the server
// lags; the snapshot and the server keep the server's own answer. In memory
// only; cleared on sign-out and on the account wipe (lifecycle.ts).
const storePro = createStoreProOverride();

/** A fresh RevenueCat customer info for the signed-in account: sets the
 *  override when it lists Pro, ends it when it does not. Never throws: it runs
 *  inside purchase flows, right after the store has charged. */
export function noteStoreCustomerInfo(info: CustomerInfo | null | undefined): void {
  if (!info) return;
  try {
    const entitlement = info.entitlements?.active?.[RC_ENTITLEMENT_PRO];
    storePro.noteStoreAnswer(
      useAuthStore.getState().authId,
      entitlement ? { expirationDate: entitlement.expirationDate ?? null } : null,
      Date.now(),
    );
  } catch { /* display state only: a malformed answer changes nothing */ }
}

/** Sign-out / account wipe. */
export function clearStoreProOverride(): void {
  storePro.clear();
}

/** The subscription to show for a server answer: Pro while the store said so
 *  for this account (see above), the server's answer otherwise. */
export function withStoreProOverride(sub: SubscriptionState | null): SubscriptionState | null {
  return storePro.apply(sub, useAuthStore.getState().authId, Date.now());
}

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

/** The saved Pro state as the server would report it now (boot fix B3,
 *  subscriptionSeedCore.ts): a saved Pro whose expiry has passed reads as not
 *  Pro, so the cold start never seeds it as Pro. */
export function readSubscriptionSnapshot(): SubscriptionState | null {
  const saved = readSnapshot(SUBSCRIPTION_SNAPSHOT_KEY, isSubscriptionState)?.value ?? null;
  return saved ? withExpiryApplied(saved, Date.now()) : null;
}

/** Call with a server answer only. A value the store's override produced is
 *  saved as the server answer behind it, never as Pro. */
export function writeSubscriptionSnapshot(sub: SubscriptionState | null | undefined, forAuthId?: string): void {
  const serverAnswer = storePro.rawOf(sub) as SubscriptionState | null | undefined;
  writeSnapshot(SUBSCRIPTION_SNAPSHOT_KEY, normalizeSubscription(serverAnswer), forAuthId);
}

/** Load the saved Pro state from storage (AsyncStorage on devices). The cold
 *  boot waits for this (bounded) before deciding whether it can open at once. */
export function primeSubscriptionSnapshot(): Promise<void> {
  return primeSnapshot(SUBSCRIPTION_SNAPSHOT_KEY);
}

/** GET the subscription, guarded: a late answer never overwrites a newer write
 *  such as a purchase's answer (queryGuard), and only answers it keeps become
 *  the last known state (as the server sent them). */
const guardedSubscriptionRead = guardedQueryFn(
  subscriptionQueryKey,
  async () => (await getSubscription()).subscription,
  (sub, { authId }) => writeSubscriptionSnapshot(sub, authId),
);

/** The subscription query function (screens and the boot): the guarded read,
 *  with the store's fresh "Pro" kept on screen while the server lags. */
export const subscriptionQueryFn = async (): Promise<SubscriptionState | null> =>
  withStoreProOverride(await guardedSubscriptionRead());

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
      // The store's answer from a purchase, a restore or the paywall's login:
      // shown for this session even when the server below cannot confirm it
      // yet (noteStoreCustomerInfo). Without one there is nothing fresh.
      noteStoreCustomerInfo(customerInfo);
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
        // purchase it can still say "not Pro". Show the store's answer (not
        // saved as the last known state; the override keeps it through
        // refetches) and re-read the server shortly. Without an override
        // (no fresh customer info), it is marked with the server's answer
        // behind it, so it is never saved as Pro either (B10).
        const shown = withStoreProOverride(sub);
        qc.setQueryData<SubscriptionState | null>(
          subscriptionQueryKey,
          shown?.isPro === true ? shown : storeProOverServer(sub, rcExpiresAt),
        );
        recheckAfterPurchase(qc, 0);
        return;
      }
      qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, withStoreProOverride(sub));
    },
  });
}

/** Re-reads the server until it agrees with the store. The server's answer is
 *  saved as it is; on screen the store's "Pro" stays while its override is
 *  valid, so even the last re-read never locks a paying user out. */
function recheckAfterPurchase(qc: ReturnType<typeof useQueryClient>, attempt: number): void {
  const last = attempt >= PURCHASE_RECHECK_MS.length - 1;
  setTimeout(() => {
    void (async () => {
      try {
        const sub = (await getSubscription()).subscription;
        if (sub?.isPro === true || last) {
          qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, withStoreProOverride(sub));
          writeSubscriptionSnapshot(sub);
          return;
        }
      } catch { /* try again below */ }
      if (!last) recheckAfterPurchase(qc, attempt + 1);
    })();
  }, PURCHASE_RECHECK_MS[attempt]);
}
