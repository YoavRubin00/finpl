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
import { captureEvent, identifyUser, resetUser } from '../posthog';

type ProfileLike = { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean };

/** The authentication channel used to obtain the JWT. Threaded into PostHog
 * `guest_converted_to_user` and `user_signed_in` for funnel analysis. */
export type SignInMethod = 'email' | 'google' | 'apple' | 'legacy';

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

export async function signInWithProfile(profile: ProfileLike, token: string, method: SignInMethod = 'email'): Promise<void> {
  // Capture pre-signIn guest state — useAuthStore.signIn() flips isGuest to
  // false, so we must read it now to detect a guest→registered conversion.
  // The May-21 auth refactor dropped the original `guest_converted_to_user`
  // emission; this restores it for the Google/Apple/Email-login paths.
  // (Email-registration via RegisterScreen calls convertGuestToUser, which
  // emits the same event with method:'email' — kept separate so both paths
  // land on the same PostHog event without double-counting.)
  const wasGuest = useAuthStore.getState().isGuest === true;

  await tokenStore.set(token);

  configureRevenueCat(profile.id);

  // RevenueCat login is a native round-trip independent of the server prefetch,
  // so run them concurrently instead of serially — this serial chain was the
  // single largest blocker on sign-in / cold boot. Backfill must finish before
  // prefetchAll (so the prefetch reads migrated data), so it stays sequenced
  // with prefetch on its own branch.
  const rcLogin = loginRevenueCat(profile.id).then(
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

  const serverHydrate = (async () => {
    if (!(await backfillFlag.isDone())) {
      try {
        await runBackfillV1();
        await backfillFlag.markDone();
      } catch (e) {
        if (__DEV__) console.warn('[backfill] failed:', e);
      }
    }
    await prefetchAll();
  })();

  await Promise.all([rcLogin, serverHydrate]);

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
    hasCompletedOnboarding: profile.hasCompletedOnboarding,
  });

  // Identify the user in PostHog so all subsequent events land on a stable
  // distinct_id — and so the anon distinct_id from before sign-in is merged
  // into this identity. Without this call, ordered funnels that span the
  // sign-in boundary (e.g. guest_mode_entered -> purchase_completed) return 0
  // because the events live on two unlinked anonymous IDs. The May-21 auth
  // refactor dropped the only call site to identifyUser; this restores it.
  // Pull the freshest subscription snapshot from the React Query cache (just
  // populated by prefetchAll above) so PostHog person properties carry the
  // is_pro flag from sign-in onward. Without it every DAU / retention query
  // collapses Pro and Free users into one segment.
  const subscriptionData = queryClient.getQueryData<{ isPro?: boolean }>(subscriptionQueryKey);
  identifyUser(profile.id, {
    email: profile.email,
    displayName: profile.displayName,
    auth_method: method,
    is_pro: subscriptionData?.isPro === true,
    is_guest: false,
  });

  // `user_signed_in` is what the dashboard's Activation Funnel keys off
  // (step 3: Application Installed -> Application Opened -> user_signed_in).
  // The event was dropped in the May-21 auth refactor (no call site in code
  // for 7 days; the 116 residue events in PostHog are from before). Restoring
  // it here covers every sign-in path that flows through signInWithProfile:
  // Google, Apple, email-login (LoginScreen), in-onboarding email, and the
  // legacy session migration.
  captureEvent('user_signed_in', { method });

  // Fire the guest-conversion event AFTER identify so PostHog sees it on the
  // identified distinct_id, which keeps the funnel chain intact. Skip for
  // `email` method — RegisterScreen's convertGuestToUser already fired it on
  // the same store transition; firing here too would double-count.
  if (wasGuest && method !== 'email') {
    captureEvent('guest_converted_to_user', { method });
  }

  // Push the device's RevenueCat entitlement state to the server, then let the
  // subscription query refetch. Fire-and-forget AFTER prefetch so its invalidate
  // can't race the prefetch's getSubscription, and so a slow native RC read never
  // blocks the first render. (Web has no RC SDK — syncRevenueCatToServer no-ops.)
  void syncRevenueCatToServer().catch((err: unknown) => {
    captureEvent('rc_server_sync_failed', { reason: err instanceof Error ? err.message : String(err) });
  });
}

// In-flight guard: prefetchAll's 6 parallel 401s used to fan out to 6 concurrent
// signOut() calls, each firing rc_logout_failed + sign_out_completed. Now any
// caller arriving while a sign-out is running just awaits the same promise.
let signOutInFlight: Promise<void> | null = null;

export async function signOut(): Promise<void> {
  if (signOutInFlight) return signOutInFlight;

  // Idempotent early-exit: nothing to sign out from. Without this guard, a
  // repeated invocation after the first successful sign-out would still call
  // RevenueCat.logOut() — which throws when already anonymous and emitted
  // rc_logout_failed thousands of times per user (3,793x observed in PostHog).
  const existingToken = await tokenStore.get();
  const authStillSignedIn = useAuthStore.getState().isAuthenticated;
  if (!existingToken && !authStillSignedIn) return;

  signOutInFlight = (async () => {
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

      // Detach the identified user from PostHog so the next session starts
      // anonymous instead of continuing to attribute events to the signed-out
      // identity. Without reset, the anonymous events captured before the
      // next sign-in would merge back into the previous user's profile.
      resetUser();

      captureEvent('sign_out_completed');
    } catch (err) {
      captureEvent('sign_out_failed', {
        step: 'unknown',
        reason: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      signOutInFlight = null;
    }
  })();
  return signOutInFlight;
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
          await signInWithProfile(res.profile, res.token, 'legacy');
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

    // Ghost-session heal. The email-registration path (convertGuestToUser)
    // marks the auth store `isAuthenticated` WITHOUT minting a JWT or creating
    // a server profile row. Such a user is a "ghost": every /api/sync/economy
    // call 401s (no JWT) so nothing persists, and the balance resets to 0 on
    // every cold start. 28% of email signups were stranded this way (incident
    // 2026-06-16). If the persisted store still claims a signed-in email user
    // but we have no JWT (and it wasn't an old `auth-store-v2` legacy session
    // handled above), re-mint here: verifyEmail creates/finds the row by email
    // and returns a JWT, after which the economy endpoints work normally.
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated && !auth.isGuest && auth.email) {
      try {
        captureEvent('ghost_session_heal_started');
        const res = await verifyEmail(auth.email, auth.displayName ?? null);
        if (res?.ok && res.profile && res.token) {
          await signInWithProfile(res.profile, res.token, 'email');
          captureEvent('ghost_session_heal_succeeded');
          return { isAuthenticated: true };
        }
      } catch (e) {
        captureEvent('ghost_session_heal_failed', {
          reason: e instanceof Error ? e.message : String(e),
        });
        if (__DEV__) console.warn('[boot] ghost session heal failed:', e);
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

  // RevenueCat login is a native round-trip independent of the server prefetch,
  // so run them concurrently instead of serially (same optimization as
  // signInWithProfile). Backfill stays sequenced before prefetchAll so the
  // prefetch reads migrated data.
  const rcLogin = loginRevenueCat(profile.id).then(
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

  const serverHydrate = (async () => {
    if (!(await backfillFlag.isDone())) {
      try {
        await runBackfillV1();
        await backfillFlag.markDone();
      } catch (e) {
        if (__DEV__) console.warn('[backfill] failed at boot:', e);
      }
    }
    await prefetchAll();
  })();

  await Promise.all([rcLogin, serverHydrate]);

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
  });

  // Re-identify on every cold boot of an authenticated session so PostHog
  // continues attributing this device's events to the same user instead of
  // creating a new anonymous identity each launch. Refresh is_pro from the
  // freshly-prefetched subscription cache — keeps Pro/Free segmentation
  // accurate across app restarts.
  const cachedSubscription = queryClient.getQueryData<{ isPro?: boolean }>(subscriptionQueryKey);
  identifyUser(profile.id, {
    email: profile.email,
    displayName: profile.displayName,
    auth_method: 'token-restore',
    is_pro: cachedSubscription?.isPro === true,
    is_guest: false,
  });

  // Push the device's RevenueCat entitlement state to the server, then let the
  // subscription query refetch. Fire-and-forget AFTER prefetch so its invalidate
  // can't race the prefetch's getSubscription, and so a slow native RC read never
  // blocks the first render. (Web has no RC SDK — syncRevenueCatToServer no-ops.)
  void syncRevenueCatToServer().catch((err: unknown) => {
    captureEvent('rc_server_sync_failed', { reason: err instanceof Error ? err.message : String(err) });
  });

  return { isAuthenticated: true };
}
