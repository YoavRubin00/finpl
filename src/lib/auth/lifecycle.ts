// src/lib/auth/lifecycle.ts
import { Platform } from 'react-native';
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
import { verifyEmail } from '../api/auth';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { captureEvent } from '../posthog';

type ProfileLike = { id: string; authId: string; displayName: string | null; email: string | null };

/**
 * Reads the pre-JWT auth session left behind by an older build.
 * Existing users authenticated with a `syncToken` stored under `auth-store-v2`;
 * the new build uses a JWT in secure-store. On first launch they have no JWT,
 * so we recover their email from the old store and re-mint a JWT seamlessly.
 * Returns null if there is no recoverable authenticated session.
 */
async function readLegacyAuthSession(): Promise<{ email: string; displayName: string | null } | null> {
  try {
    const raw = await AsyncStorage.getItem('auth-store-v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const state = (typeof parsed.state === 'object' && parsed.state !== null
      ? parsed.state
      : parsed) as Record<string, unknown>;
    if (state.isAuthenticated === true && typeof state.email === 'string' && state.email) {
      return {
        email: state.email,
        displayName: typeof state.displayName === 'string' ? state.displayName : null,
      };
    }
  } catch {
    /* corrupt/absent — treat as no legacy session */
  }
  return null;
}

function makePrefetchFn<T>(queryKey: readonly unknown[], fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      captureEvent('hydration_failed', {
        queryKey: JSON.stringify(queryKey),
        reason: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

async function prefetchAll(): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: profileQueryKey, queryFn: makePrefetchFn(profileQueryKey, async () => (await getProfile()).profile) }),
    queryClient.prefetchQuery({ queryKey: economyQueryKey, queryFn: makePrefetchFn(economyQueryKey, async () => (await getEconomy()).economy) }),
    queryClient.prefetchQuery({ queryKey: streakQueryKey, queryFn: makePrefetchFn(streakQueryKey, async () => (await getStreak()).streak) }),
    queryClient.prefetchQuery({ queryKey: subscriptionQueryKey, queryFn: makePrefetchFn(subscriptionQueryKey, async () => (await getSubscription()).subscription) }),
    queryClient.prefetchQuery({ queryKey: progressQueryKey, queryFn: makePrefetchFn(progressQueryKey, async () => (await getProgress()).progress) }),
    queryClient.prefetchQuery({ queryKey: userStatsQueryKey, queryFn: makePrefetchFn(userStatsQueryKey, async () => (await getUserStats()).userStats) }),
  ]);
}

async function syncRevenueCatToServer(): Promise<void> {
  // RevenueCat is native-only. On web there is no SDK, so getCustomerInfo()
  // returns null → this would POST isPro:false and clobber the server's real
  // subscription state on every web sign-in. Skip entirely on web; there the
  // DB is the source of truth and the app only reads subscription state.
  if (Platform.OS === 'web') return;

  const customerInfo = await getCustomerInfo();
  const isPro = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
  const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
  await syncSubscription({ isPro, proExpiresAt });
  await queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
}

export async function signInWithProfile(profile: ProfileLike, token: string): Promise<void> {
  await tokenStore.set(token);

  configureRevenueCat(profile.id);
  await loginRevenueCat(profile.id).then(
    (customerInfo) => {
      const hasEntitlements = customerInfo
        ? Object.keys(customerInfo.entitlements.active).length > 0
        : false;
      captureEvent('rc_login_succeeded', { hasEntitlements });
    },
    (err: unknown) => {
      captureEvent('rc_login_failed', { reason: err instanceof Error ? err.message : String(err) });
    },
  );

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
  try {
    try {
      await logoutRevenueCat();
    } catch (err) {
      captureEvent('rc_logout_failed', { reason: err instanceof Error ? err.message : String(err) });
    }

    queryClient.clear();
    resetAllLocalStores();

    const keys = getLocalStorageKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys).catch(() => { /* swallow */ });
    }

    await tokenStore.clear();
    await backfillFlag.reset();

    useAuthStore.getState().clear();

    captureEvent('sign_out_completed');
  } catch (err) {
    captureEvent('sign_out_failed', {
      step: 'unknown',
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function bootFromToken(): Promise<{ isAuthenticated: boolean }> {
  const token = await tokenStore.get();

  // No JWT yet. Before sending the user to the login screen, check for a
  // pre-JWT session from an older build and migrate it seamlessly. Email login
  // is passwordless, so re-minting a JWT from the stored email is transparent.
  // signInWithProfile runs the one-time backfill, so local-only data is pushed
  // to the server during this migration — no data loss, no forced re-login.
  if (!token) {
    const legacy = await readLegacyAuthSession();
    if (legacy) {
      try {
        captureEvent('legacy_session_migration_started');
        const res = await verifyEmail(legacy.email, legacy.displayName);
        if (res?.ok && res.profile && res.token) {
          await signInWithProfile(res.profile, res.token);
          captureEvent('legacy_session_migration_succeeded');
          return { isAuthenticated: true };
        }
      } catch (e) {
        captureEvent('legacy_session_migration_failed', {
          reason: e instanceof Error ? e.message : String(e),
        });
        if (__DEV__) console.warn('[boot] legacy session migration failed:', e);
      }
    }
    return { isAuthenticated: false };
  }

  let profile;
  try {
    profile = (await getProfile()).profile;
  } catch (e) {
    if (__DEV__) console.warn('[boot] profile fetch failed:', e);
    return { isAuthenticated: false };
  }
  if (!profile) return { isAuthenticated: false };

  configureRevenueCat(profile.id);
  await loginRevenueCat(profile.id).then(
    (customerInfo) => {
      const hasEntitlements = customerInfo
        ? Object.keys(customerInfo.entitlements.active).length > 0
        : false;
      captureEvent('rc_login_succeeded', { hasEntitlements });
    },
    (err: unknown) => {
      captureEvent('rc_login_failed', { reason: err instanceof Error ? err.message : String(err) });
    },
  );

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
