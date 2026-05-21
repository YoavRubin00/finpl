// src/lib/auth/lifecycle.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configureRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getCustomerInfo,
  RC_ENTITLEMENT_PRO,
} from '../../services/revenueCat';
import { tokenStore, backfillFlag } from './secureStore';
import { queryClient } from '../queryClient';
import { resetAllLocalStores, getLocalStorageKeys } from '../stores/registry';
import { runBackfillV1 } from './backfill';
import { profileQueryKey } from '../../features/auth/useProfile';
import { economyQueryKey } from '../../features/economy/useEconomy';
import { streakQueryKey } from '../../features/economy/useStreak';
import { subscriptionQueryKey } from '../../features/subscription/useSubscription';
import { progressQueryKey } from '../../features/chapter-1-content/useProgress';
import { userStatsQueryKey } from '../../features/user-stats/useUserStats';
import { getProfile } from '../api/profile';
import { getEconomy } from '../api/economy';
import { getStreak } from '../api/streak';
import { getSubscription, syncSubscription } from '../api/subscription';
import { getProgress } from '../api/progress';
import { getUserStats } from '../api/userStats';
import { useAuthStore } from '../../features/auth/useAuthStore';

type ProfileLike = { id: string; authId: string; displayName: string | null; email: string | null };

async function prefetchAll(): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: profileQueryKey, queryFn: async () => (await getProfile()).profile }),
    queryClient.prefetchQuery({ queryKey: economyQueryKey, queryFn: async () => (await getEconomy()).economy }),
    queryClient.prefetchQuery({ queryKey: streakQueryKey, queryFn: async () => (await getStreak()).streak }),
    queryClient.prefetchQuery({ queryKey: subscriptionQueryKey, queryFn: async () => (await getSubscription()).subscription }),
    queryClient.prefetchQuery({ queryKey: progressQueryKey, queryFn: async () => (await getProgress()).progress }),
    queryClient.prefetchQuery({ queryKey: userStatsQueryKey, queryFn: async () => (await getUserStats()).userStats }),
  ]);
}

async function syncRevenueCatToServer(): Promise<void> {
  const customerInfo = await getCustomerInfo();
  const isPro = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
  const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
  await syncSubscription({ isPro, proExpiresAt });
  await queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
}

export async function signInWithProfile(profile: ProfileLike, token: string): Promise<void> {
  await tokenStore.set(token);

  configureRevenueCat(profile.id);
  await loginRevenueCat(profile.id).catch(() => { /* soft */ });

  if (!(await backfillFlag.isDone())) {
    try {
      await runBackfillV1();
      await backfillFlag.markDone();
    } catch (e) {
      if (__DEV__) console.warn('[backfill] failed:', e);
    }
  }

  await prefetchAll();
  await syncRevenueCatToServer();

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
  });
}

export async function signOut(): Promise<void> {
  try { await logoutRevenueCat(); } catch { /* swallow */ }

  queryClient.clear();
  resetAllLocalStores();

  const keys = getLocalStorageKeys();
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys).catch(() => { /* swallow */ });
  }

  await tokenStore.clear();
  await backfillFlag.reset();

  useAuthStore.getState().clear();
}

export async function bootFromToken(): Promise<{ isAuthenticated: boolean }> {
  const token = await tokenStore.get();
  if (!token) return { isAuthenticated: false };

  let profile;
  try {
    profile = (await getProfile()).profile;
  } catch (e) {
    if (__DEV__) console.warn('[boot] profile fetch failed:', e);
    return { isAuthenticated: false };
  }
  if (!profile) return { isAuthenticated: false };

  configureRevenueCat(profile.id);
  await loginRevenueCat(profile.id).catch(() => { /* soft */ });

  if (!(await backfillFlag.isDone())) {
    try {
      await runBackfillV1();
      await backfillFlag.markDone();
    } catch (e) {
      if (__DEV__) console.warn('[backfill] failed at boot:', e);
    }
  }

  await prefetchAll();
  await syncRevenueCatToServer();

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
  });

  return { isAuthenticated: true };
}
