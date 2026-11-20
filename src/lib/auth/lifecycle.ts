// src/lib/auth/lifecycle.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryKey } from '@tanstack/react-query';
import {
  configureRevenueCat,
  loginRevenueCatDetailed,
  logoutRevenueCat,
  getCustomerInfo,
  getFreshCustomerInfo,
  RC_ENTITLEMENT_PRO,
  type CustomerInfo,
} from '../../services/revenueCat';
import { tokenStore, backfillFlag } from './secureStore';
import { queryClient } from '../queryClient';
import { resetAllLocalStores, getLocalStorageKeys } from '../stores/registry';
import { resetLocalOnlyStores } from '../stores/localOnlyStores';
import { clearAllPersistedState, zustandStorage } from '../zustandStorage';
import { runBackfillV1 } from './backfill';
import { profileQueryKey, profileQueryFn } from '../../features/auth/useProfile';
import {
  economyQueryKey,
  economyQueryFn,
  economyPlaceholder,
  primeEconomySnapshot,
  writeEconomySnapshot,
  clearPendingGems,
} from '../../features/economy/useEconomy';
import {
  streakQueryKey,
  streakQueryFn,
  streakPlaceholder,
  primeStreakSnapshot,
  writeStreakSnapshot,
} from '../../features/economy/useStreak';
import {
  subscriptionQueryKey,
  subscriptionQueryFn,
  readSubscriptionSnapshot,
  writeSubscriptionSnapshot,
  primeSubscriptionSnapshot,
  noteStoreCustomerInfo,
  clearStoreProOverride,
  withStoreProOverride,
} from '../../features/subscription/useSubscription';
import { storeProOverServer } from '../../features/subscription/proOverrideCore';
import {
  fallsBackToStoreCache,
  showStoreCacheProIfNoServerAnswer,
  toEpochMs,
} from '../../features/subscription/subscriptionSeedCore';
import {
  fileIfStillSignedIn,
  resetSnapshotMemory,
  SNAPSHOT_STORAGE_KEYS,
} from '../../features/economy/querySnapshot';
import { whenHydrated } from '../stores/whenHydrated';
import { createSingleFlight, decideBootPath, TIMED_OUT, waitCapped, withTimeout } from './bootCore';
import { progressQueryKey, progressQueryFn } from '../../features/chapter-1-content/useProgress';
import { userStatsQueryKey, userStatsQueryFn } from '../../features/user-stats/useUserStats';
import { getProfile, type ProfileRow } from '../api/profile';
import { syncSubscription, type SubscriptionState } from '../api/subscription';
import type { Economy } from '../api/economy';
import type { StreakState } from '../api/streak';
import { ApiError } from '../api/client';
import { seedQueryData, serverAnswerSince } from '../queryGuard';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { captureEvent, forgetPersonDetails, identifyUser, resetUser } from '../posthog';
import { track } from '../analytics/events';

type ProfileLike = { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean };

/** The authentication channel used to obtain the JWT. Threaded into PostHog
 * `guest_converted_to_user` and `user_signed_in` for funnel analysis. */
export type SignInMethod = 'email' | 'google' | 'apple' | 'legacy';

/**
 * How long a cold start waits for the server before it goes on without it.
 * Only the boots that cannot render from saved state wait at all: a signed-in
 * user with a saved Pro state renders at once (path 'cached'). With the server
 * in Frankfurt each call takes ~0.3-0.7s and the boot reads run in parallel, so
 * a healthy network finishes in about a second; 3s leaves room for a slow
 * mobile network or a cold function, and caps the worst case (a hung request,
 * which RN's fetch never times out on its own) at a short, known wait.
 */
export const BOOT_NETWORK_TIMEOUT_MS = 3000;

/** RevenueCat's cached customer info is a local read; bounded anyway. */
const RC_CACHE_READ_TIMEOUT_MS = 500;

/**
 * Upper bound on waiting for the auth store to load from disk. On devices that
 * is AsyncStorage (src/lib/zustandStorage.ts), typically tens of ms. The root
 * layout renders nothing until this store has loaded anyway, so waiting here
 * costs no first-paint time; the cap only protects against a storage that
 * never answers. It used to be 1s with "MMKV: ~instant": a slower load was
 * then read as "no session" and could show a signed-in user the retry screen.
 * Past the cap the session is treated as unknown, never as signed out.
 */
const AUTH_HYDRATION_TIMEOUT_MS = 5000;

/**
 * Upper bound on loading the saved snapshots (Pro state, balance, streak) that
 * decide whether a signed-in user can open at once. Three small AsyncStorage
 * reads, started when this module loads (with the rest of the app's stores),
 * so usually done before the boot asks. 500ms covers a slow cold disk on a
 * low-end phone; past it the boot takes the network path (up to
 * BOOT_NETWORK_TIMEOUT_MS), which is slower but still correct.
 */
export const SNAPSHOT_PRIME_TIMEOUT_MS = 500;

/** The saved state the cold boot needs before it can open at once. */
function primeBootSnapshots(): Promise<void> {
  return Promise.all([primeSubscriptionSnapshot(), primeEconomySnapshot(), primeStreakSnapshot()]).then(() => undefined);
}
// Start reading them now, in parallel with the stores loading, so the boot
// rarely has to wait. AsyncStorage answers in order, so this is cheap.
void primeBootSnapshots();

/** How long the waiting boot path waits for a sign-out already under way
 *  (RevenueCat logOut is a network call) before deciding what to render. */
const SIGN_OUT_WAIT_MS = 2000;

export type BootPath = 'cached' | 'network' | 'timeout' | 'no_token';
export type BootOutcome = 'signed_in' | 'signed_out' | 'retry';
/** How the boot's server work ended. See boot_network_settled in analytics/events.ts. */
export type BootNetworkResult = 'ok' | 'auth_invalid' | 'no_profile' | 'error' | 'superseded';

export interface BootResult {
  isAuthenticated: boolean;
  path: BootPath;
  outcome: BootOutcome;
  /**
   * Only with outcome 'retry' (a stored token, no saved session, no answer in
   * time): settles when the boot's server work ends. 'error' means the retry
   * screen should offer to try again; anything else means the app can go on.
   */
  settled?: Promise<BootNetworkResult>;
}

/**
 * Bumped by every boot attempt, sign-in, sign-out and abandonPendingBoot(). A
 * boot whose server work is still running applies its result (signIn,
 * identify, the RevenueCat sync) only while its generation is still current,
 * so a late answer can never sign back in a user who signed out, signed in
 * with another account, or chose to go on without signing in.
 */
let bootGeneration = 0;

/**
 * The user chose to go on without signing in (retry screen: a stored token
 * but no saved session on this device). Forgets the stored session the way a
 * sign-out does (token + backfill flag) but keeps local data. The boot still
 * running can then never sign this device in or out later (its 401 no longer
 * matches the stored token), and a later Google/Apple sign-in signs in
 * instead of linking to the abandoned account (useGoogleAuth / useAppleAuth
 * treat a stored token as "already signed in").
 */
export async function abandonPendingBoot(): Promise<void> {
  bootGeneration++;
  // A root layout that mounts again joins the launch's boot: give it this
  // outcome, not the retry screen again.
  bootFlight.replace({ isAuthenticated: false, path: 'network', outcome: 'signed_out' });
  await tokenStore.clear().catch(() => { /* non-fatal */ });
  await backfillFlag.reset().catch(() => { /* non-fatal */ });
}

/**
 * Reads the pre-JWT auth session left behind by an older build.
 * Existing users authenticated with a `syncToken` stored under `auth-store-v2`;
 * the new build uses a JWT in secure-store. Since 2026-11-13 the stored email
 * alone can't mint a JWT (email sign-in needs a mailed code), so this is only
 * used to count those users. Returns null if there is no such session.
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

/**
 * Whether the stored JWT's own expiry has passed, read locally without
 * verifying. Only used to keep such a token off the render-at-once path: the
 * server will reject it (30-day TTL, the user was away longer), so the boot
 * waits for that answer and goes straight to the sign-out instead of showing
 * the app for a moment first. A wrong device clock at worst makes a valid
 * token wait for the server (bounded); the sign-out itself still only comes
 * from the server's 401.
 */
function isTokenExpiredLocally(token: string): boolean {
  try {
    const part = token.split('.')[1];
    if (!part || typeof atob !== 'function') return false;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))) as { exp?: unknown };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Query cache: saved snapshots first, then the server, without losing newer
// local writes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Puts a saved last-known value in the cache for the first frame, as a seed
 * (queryGuard seedQueryData: updatedAt 0, so the boot read and any mounting
 * screen still ask the server and the server answer always replaces it).
 * Skipped when the cache already holds something (newer, or the dev override).
 */
function seedFromSnapshot<T extends object>(key: QueryKey, value: T | null | undefined): boolean {
  if (!value) return false;
  if (queryClient.getQueryData(key) !== undefined) return false;
  seedQueryData<T>(key, value);
  return true;
}

/**
 * A boot read through the query cache. The query functions are the screens'
 * own (each wrapped by queryGuard), so whoever starts the request, the boot or
 * a hook that mounted first, a late answer never overwrites a newer local
 * write, and snapshots are written only for kept answers, under the account
 * the request was made for.
 */
function bootFetch<T>(key: QueryKey, queryFn: () => Promise<T>, opts?: { failFast?: boolean }): Promise<T> {
  return queryClient.fetchQuery<T>({
    queryKey: key,
    queryFn,
    // The profile read decides whether the session is valid, so it answers at
    // once like the plain request it replaces: no retries, and an error even
    // when react-query thinks the device is offline (instead of pausing).
    ...(opts?.failFast ? { retry: false, networkMode: 'always' as const } : {}),
  }).catch((err: unknown) => {
    captureEvent('hydration_failed', {
      queryKey: JSON.stringify(key),
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });
}

/** The server reads behind the first screens. All of them run at once.
 *  Settles when every read has settled; never rejects. */
function fetchServerState(opts: { includeProfile: boolean }): Promise<void> {
  const reads: Promise<unknown>[] = [
    bootFetch(economyQueryKey, economyQueryFn),
    bootFetch(streakQueryKey, streakQueryFn),
    bootFetch(subscriptionQueryKey, subscriptionQueryFn),
    bootFetch(progressQueryKey, progressQueryFn),
    bootFetch(userStatsQueryKey, userStatsQueryFn),
  ];
  if (opts.includeProfile) reads.push(bootFetch(profileQueryKey, profileQueryFn));
  return Promise.all(reads.map((p) => p.catch(() => undefined))).then(() => undefined);
}

/**
 * The subscription the server reported during this boot/sign-in, read from the
 * cache so it doesn't matter who made the request: the root layout's useIsPro()
 * hook usually starts it at mount and the boot's read joins it, so the boot's
 * own query function never runs (boot review 20.11: that left the RevenueCat
 * sync without a server answer, so it never ran on a cold start).
 */
function serverSubscriptionSince(sinceMs: number): SubscriptionState | null | undefined {
  return serverAnswerSince<SubscriptionState | null>(subscriptionQueryKey, sinceMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat
// ─────────────────────────────────────────────────────────────────────────────

function loginRevenueCatAndReport(userId: string): Promise<void> {
  return loginRevenueCatDetailed(userId).then(
    ({ customerInfo, switched }) => {
      // Only a real identity switch is a login. A returning user's cold start
      // configures RevenueCat with the saved id, so nothing switches there.
      if (!switched) return;
      const hasEntitlements = customerInfo
        ? Object.keys(customerInfo.entitlements.active).length > 0
        : false;
      captureEvent('rc_login_succeeded', { hasEntitlements });
    },
    (err: unknown) => {
      captureEvent('rc_login_failed', { reason: err instanceof Error ? err.message : String(err) });
    },
  );
}

function rcProState(info: CustomerInfo): { isPro: boolean; proExpiresAt: string | null } {
  const pro = info.entitlements.active[RC_ENTITLEMENT_PRO];
  return { isPro: pro !== undefined, proExpiresAt: pro?.expirationDate ?? null };
}

/**
 * Would POSTing this RevenueCat state change what the server reports?
 * Since 2026-11-20 the server ignores the device's expiry while it reports Pro
 * (RevenueCat's webhook keeps it), and never lets the device remove a Pro it
 * granted itself (pro_source other than 'store': promotional / manual / gift),
 * so those POSTs would change nothing — skip them instead of sending one on
 * every launch.
 */
function matchesServer(rc: { isPro: boolean; proExpiresAt: string | null }, server: SubscriptionState | null): boolean {
  const serverPro = server?.isPro === true;
  if (rc.isPro && serverPro) return true;
  if (!rc.isPro && serverPro && isServerGrantedPro(server)) return true;
  if (rc.isPro !== serverPro) return false;
  // Both not Pro: the server already reports what the POST would say.
  return true;
}

function isServerGrantedPro(server: SubscriptionState | null): boolean {
  if (!server?.isPro || !server.proSource || server.proSource === 'store') return false;
  const exp = toEpochMs(server.proExpiresAt);
  return exp === null ? server.proExpiresAt == null : exp > Date.now();
}

/**
 * Pushes the device's RevenueCat entitlement to the server, only when it
 * differs from what the server just reported (most launches it doesn't, so
 * there is no request at all), and stores the POST's answer directly instead
 * of invalidating and fetching it again.
 *
 * The device copy from getCustomerInfo() can be stale, so a mismatch is
 * confirmed with a fresh RevenueCat answer before anything is written: a stale
 * copy must never change the server's Pro state. Unknown (no SDK, no answer)
 * means no write.
 */
async function syncRevenueCatToServer(serverSub: SubscriptionState | null, gen: number): Promise<void> {
  // RevenueCat is native-only. On web there is no SDK; the DB is the source of
  // truth there and the app only reads subscription state.
  if (Platform.OS === 'web') return;

  const cachedInfo = await getCustomerInfo();
  if (!cachedInfo || matchesServer(rcProState(cachedInfo), serverSub)) return;

  const freshInfo = await getFreshCustomerInfo();
  if (!freshInfo) return;
  // The store's fresh answer stays on screen for this session, through
  // refetches, while the server lags (or ends when the store says not Pro).
  if (gen === bootGeneration) noteStoreCustomerInfo(freshInfo);
  const fresh = rcProState(freshInfo);
  if (matchesServer(fresh, serverSub)) return;
  if (gen !== bootGeneration) return;

  const res = await syncSubscription(fresh);
  if (gen !== bootGeneration) return; // signed out meanwhile: don't touch the next session's cache
  writeSubscriptionSnapshot(res.subscription);
  // What is shown goes through the store's override (noted above from the
  // fresh answer), never as a raw {isPro:true} (boot fix B10, 20.11): a raw
  // value carried no trace of the server's answer, so a later write from the
  // cache (a re-sign-in in the same process) could save it as the account's Pro.
  const shown = withStoreProOverride(res.subscription);
  if (fresh.isPro && res.subscription?.isPro !== true) {
    // The server makes an account Pro only when RevenueCat confirms it or its
    // webhook has landed (2026-11-20), so it can lag the store. The store's
    // fresh answer is shown for this session; the server's answer stays the
    // saved state, and the next launch asks again. Should no override apply
    // (none could be set), the store's answer is still shown, marked with the
    // server's answer behind it, so it is never saved either.
    queryClient.setQueryData<SubscriptionState | null>(
      subscriptionQueryKey,
      shown?.isPro === true ? shown : storeProOverServer(res.subscription, fresh.proExpiresAt),
    );
    captureEvent('rc_server_pro_unconfirmed', { has_server_row: res.subscription !== null });
    return;
  }
  queryClient.setQueryData<SubscriptionState | null>(subscriptionQueryKey, shown);
}

function startRevenueCatSync(serverSub: SubscriptionState | null | undefined, gen: number): void {
  // No server answer this time (failed or never asked): nothing reliable to
  // compare with, so no write.
  if (serverSub === undefined) return;
  void syncRevenueCatToServer(serverSub, gen).catch((err: unknown) => {
    captureEvent('rc_server_sync_failed', { reason: err instanceof Error ? err.message : String(err) });
  });
}

/**
 * The reads of a sign-in (or of a boot with no saved session) ran before the
 * auth store had this account's authId, so their query functions could not
 * file a snapshot. Record the server's answers since the sign-in (boot) began
 * now, under the new account, while it is still the signed-in one, so the
 * next cold start can open at once with the right Pro state and, with
 * `wallet`, the right balance and streak (boot fix B7, 20.11: only the
 * subscription was filed, and that next launch showed 0 coins and a 0 streak
 * until the server answered). The writers keep the server's own answers: the
 * answer behind the store's Pro override, the balance without bought gems
 * still pending.
 */
function snapshotForNewSession(authId: string, gen: number, startedAt: number, opts: { wallet: boolean }): void {
  if (gen !== bootGeneration) return;
  const current = useAuthStore.getState().authId;
  fileIfStillSignedIn(serverSubscriptionSince(startedAt), authId, current, writeSubscriptionSnapshot);
  if (!opts.wallet) return;
  fileIfStillSignedIn(serverAnswerSince<Economy | null>(economyQueryKey, startedAt), authId, current, writeEconomySnapshot);
  fileIfStillSignedIn(serverAnswerSince<StreakState | null>(streakQueryKey, startedAt), authId, current, writeStreakSnapshot);
}

/**
 * A signed-in user whose server gave no subscription answer (offline, a
 * failed or slow boot): RevenueCat's own cached customer info is the last
 * known Pro state on this device. It goes in while the cache holds no server
 * answer, i.e. nothing, or a saved seed that is not Pro (boot fix B2, 20.11:
 * before, any saved seed blocked it, so a saved "not Pro" kept a paying user
 * Free all launch). Only ever to show Pro, never over a server answer, never a
 * downgrade; it goes in as a seed, so the first server answer replaces it.
 * Bounded: RevenueCat's cache is a local read, capped anyway. See
 * subscriptionSeedCore.ts.
 */
async function seedProFromStoreCache(gen: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await showStoreCacheProIfNoServerAnswer({
    cacheState: () => queryClient.getQueryState(subscriptionQueryKey),
    readStoreCache: async () => {
      const info = await withTimeout(getCustomerInfo().catch(() => null), RC_CACHE_READ_TIMEOUT_MS);
      return info === TIMED_OUT || !info ? null : rcProState(info);
    },
    // A sign-in, a sign-out or a newer boot since: not this boot's to show.
    isCurrent: () => gen === bootGeneration,
    seed: (value) => { seedQueryData<SubscriptionState>(subscriptionQueryKey, value); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign in / sign out
// ─────────────────────────────────────────────────────────────────────────────

export async function signInWithProfile(profile: ProfileLike, token: string, method: SignInMethod = 'email'): Promise<void> {
  // Capture pre-signIn guest state — useAuthStore.signIn() flips isGuest to
  // false, so we must read it now to detect a guest→registered conversion.
  // The May-21 auth refactor dropped the original `guest_converted_to_user`
  // emission; this restores it for the Google/Apple/Email-login paths.
  // (Email-registration via RegisterScreen calls convertGuestToUser, which
  // emits the same event with method:'email' — kept separate so both paths
  // land on the same PostHog event without double-counting.)
  const wasGuest = useAuthStore.getState().isGuest === true;

  // A cold boot still finishing in the background must not apply its older
  // session over this one.
  const gen = ++bootGeneration;
  const startedAt = Date.now();

  await tokenStore.set(token);

  configureRevenueCat(profile.id);

  // RevenueCat login is a native round-trip independent of the server reads,
  // so run them concurrently instead of serially — this serial chain was the
  // single largest blocker on sign-in / cold boot. Backfill must finish before
  // the reads (so they read migrated data), so it stays sequenced with them.
  const rcLogin = loginRevenueCatAndReport(profile.id);

  const serverHydrate = (async () => {
    if (!(await backfillFlag.isDone())) {
      try {
        await runBackfillV1();
        await backfillFlag.markDone();
      } catch (e) {
        if (__DEV__) console.warn('[backfill] failed:', e);
      }
    }
    await fetchServerState({ includeProfile: true });
  })();

  await Promise.all([rcLogin, serverHydrate]);

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
    hasCompletedOnboarding: profile.hasCompletedOnboarding,
  });
  const serverSub = serverSubscriptionSince(startedAt);
  snapshotForNewSession(profile.authId, gen, startedAt, { wallet: true });

  // Identify the user in PostHog so all subsequent events land on a stable
  // distinct_id — and so the anon distinct_id from before sign-in is merged
  // into this identity. Without this call, ordered funnels that span the
  // sign-in boundary (e.g. guest_mode_entered -> purchase_completed) return 0
  // because the events live on two unlinked anonymous IDs. The May-21 auth
  // refactor dropped the only call site to identifyUser; this restores it.
  // Pull the freshest subscription snapshot from the React Query cache (just
  // populated above) so PostHog person properties carry the is_pro flag from
  // sign-in onward. Without it every DAU / retention query collapses Pro and
  // Free users into one segment.
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

  // Push the device's RevenueCat entitlement state to the server when it
  // differs. Fire-and-forget AFTER the reads so it compares against the
  // server's fresh answer, and so a slow native RC read never blocks.
  startRevenueCatSync(serverSub, gen);
}

/** Removes the saved snapshots (SNAPSHOT_STORAGE_KEYS) from the storage the
 *  snapshot store writes them to. Never rejects. */
async function removeSavedSnapshots(): Promise<void> {
  await Promise.all(SNAPSHOT_STORAGE_KEYS.map((key) =>
    Promise.resolve()
      .then(() => zustandStorage.removeItem(key))
      .catch(() => { /* non-fatal */ }),
  ));
}

// In-flight guard: prefetchAll's 6 parallel 401s used to fan out to 6 concurrent
// signOut() calls, each firing rc_logout_failed + sign_out_completed. Now any
// caller arriving while a sign-out is running just awaits the same promise.
let signOutInFlight: Promise<void> | null = null;

export async function signOut(): Promise<void> {
  // A boot or sign-in still finishing must not sign this session back in.
  bootGeneration++;

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
      // In-memory display state of this session: bought gems shown while the
      // server confirms them, the store's "Pro" while the server lags.
      clearPendingGems();
      clearStoreProOverride();
      resetAllLocalStores();
      // Saved snapshots held in memory (keyed by authId, so never readable by
      // the next account, but nothing of this account should stay loaded).
      resetSnapshotMemory();
      // ...and on disk (boot fix B7, 20.11): each one carries the account's
      // email (its authId) with its balance, Pro state or streak, and the next
      // sign-in writes fresh ones. Before the auth store is cleared, so an app
      // killed half-way leaves none behind.
      await removeSavedSnapshots();

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

/** How long the wipe waits for RevenueCat's logOut (a network call) at the end. */
const WIPE_RC_LOGOUT_WAIT_MS = 3000;

/**
 * After the server deleted the account (POST /api/account/delete answered
 * 200), or for a guest's device-only deletion: forget the session and wipe
 * everything the account left on this device. Unlike signOut() it removes ALL
 * persisted state (the app then starts like a fresh install, on the welcome
 * screen) and cancels scheduled local notifications. Never throws.
 *
 * Order matters if the app is killed half-way (review 20.11): the saved
 * "signed in" state goes first, on disk too, so a relaunch can never come up
 * as a signed-in account that no longer exists; then the session; then
 * everything else local; the network (RevenueCat) comes last, so nothing
 * local waits on it.
 */
export async function wipeDeviceForDeletedAccount(scope: 'account' | 'guest'): Promise<void> {
  // A boot or sign-in still finishing must not sign this session back in.
  bootGeneration++;

  // 1. Signed out, in memory and on disk. clear() makes persist write the
  //    signed-out state; removing the key afterwards runs after that write
  //    (storage answers in order), so when this returns the disk agrees.
  useAuthStore.getState().clear();
  const authKey = useAuthStore.persist.getOptions().name;
  if (authKey) await Promise.resolve(zustandStorage.removeItem(authKey)).catch(() => { /* non-fatal */ });

  // 2. The session: nothing still running can use it, and client.ts only
  //    stores a refreshed token while the token it sent is still the stored one.
  await tokenStore.clear().catch(() => { /* non-fatal */ });
  await backfillFlag.reset().catch(() => { /* non-fatal */ });

  // 3. Everything else, with no network call before it: server answers held
  //    in memory, every registered store, the saved boot snapshots held in
  //    memory, the persisted stores outside the registry (net worth, holdings,
  //    financial profile, ...), then every persisted key except the few that
  //    describe the device rather than the account.
  queryClient.clear();
  clearPendingGems();
  clearStoreProOverride();
  resetAllLocalStores();
  resetSnapshotMemory();
  await resetLocalOnlyStores();
  await clearAllPersistedState().catch(() => { /* non-fatal */ });

  // 4. Reminders scheduled for this user.
  if (Platform.OS !== 'web') {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch { /* non-fatal */ }
  }

  // 5. Blank the email and name on the deleted person in PostHog, detach the
  //    device from that person, then count the deletion on the new anonymous
  //    id (no person properties).
  if (scope === 'account') forgetPersonDetails();
  resetUser();
  captureEvent('account_deleted', { scope });

  // 6. RevenueCat back to an anonymous customer on this device, bounded so the
  //    "deleting" screen never hangs on it. This does NOT cancel an App Store /
  //    Google Play subscription: only the user can, in the store (the
  //    confirmation dialog says so).
  await withTimeout(logoutRevenueCat().catch(() => { /* non-fatal: already anonymous */ }), WIPE_RC_LOGOUT_WAIT_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cold boot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The boot's server work: check the token (profile), run a pending backfill,
 * read the first screens' data, identify RevenueCat, then confirm the session
 * in the auth store and PostHog and sync RevenueCat to the server.
 */
async function hydrateSession(
  gen: number,
  backfillDone: boolean,
  bootToken: string,
  startedAt: number,
  /** A signed-in session was saved on this device when the boot began. */
  hadSession: boolean,
): Promise<BootNetworkResult> {
  let reads: Promise<void> | null = null;
  let profile: ProfileRow | null;
  try {
    if (backfillDone) {
      // Everything at once: the reads don't need the profile, and reading the
      // profile through the query cache means it is fetched once, not twice.
      reads = fetchServerState({ includeProfile: false });
      profile = await bootFetch(profileQueryKey, profileQueryFn, { failFast: true });
    } else {
      profile = (await getProfile()).profile;
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return endRejectedSession(bootToken);
    // A sign-out during the boot (another request's 401) clears the cache,
    // which cancels this read: that is a signed-out session, not a network error.
    if (await sessionEndedDuringBoot()) return 'auth_invalid';
    if (__DEV__) console.warn('[boot] profile fetch failed:', err);
    return 'error';
  }
  // A newer boot, a sign-in or a sign-out took over while we waited: nothing
  // below is ours to do any more (no backfill upload, no RevenueCat login for
  // this account after another one's).
  if (gen !== bootGeneration) return 'superseded';
  if (!profile) return 'no_profile';

  if (!backfillDone) {
    // Backfill must finish before the reads so they read migrated data.
    let uploaded = false;
    let failed = false;
    try {
      uploaded = await runBackfillV1();
      await backfillFlag.markDone();
    } catch (e) {
      failed = true;
      if (__DEV__) console.warn('[backfill] failed at boot:', e);
    }
    // Nothing was uploaded: the profile fetched above is still the server's,
    // so seed it instead of fetching it again. After an upload the backfill
    // stored the new profile itself; after a failed one, read it fresh.
    if (gen !== bootGeneration) return 'superseded';
    if (!uploaded && !failed) queryClient.setQueryData(profileQueryKey, profile);
    reads = fetchServerState({ includeProfile: true });
  }

  const rcLogin = loginRevenueCatAndReport(profile.id);
  await Promise.all([rcLogin, reads]);

  // A newer boot, a sign-in or a sign-out took over while we waited.
  if (gen !== bootGeneration) return 'superseded';
  if (!(await tokenStore.get())) return 'auth_invalid';
  if (gen !== bootGeneration) return 'superseded';

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
  });
  const serverSub = serverSubscriptionSince(startedAt);
  // Covers a boot with no saved session, whose reads ran before the auth store
  // had an authId; for a saved session the query functions already filed them
  // (the subscription is filed again either way, as before).
  snapshotForNewSession(profile.authId, gen, startedAt, { wallet: !hadSession });

  // Re-identify on every cold boot of an authenticated session so PostHog
  // continues attributing this device's events to the same user instead of
  // creating a new anonymous identity each launch. Refresh is_pro from the
  // freshly-read subscription cache — keeps Pro/Free segmentation accurate
  // across app restarts.
  const cachedSubscription = queryClient.getQueryData<{ isPro?: boolean }>(subscriptionQueryKey);
  identifyUser(profile.id, {
    email: profile.email,
    displayName: profile.displayName,
    auth_method: 'token-restore',
    is_pro: cachedSubscription?.isPro === true,
    is_guest: false,
  });

  startRevenueCatSync(serverSub, gen);
  return 'ok';
}

/**
 * Whether the session this boot started with ended during it: a sign-out ran
 * or is running (another request's 401, the user). Waits a bounded time for a
 * sign-out already under way. A rotated token (X-Auth-Refreshed-Token) is
 * still the same session, so only a missing token counts.
 */
async function sessionEndedDuringBoot(): Promise<boolean> {
  if (signOutInFlight) {
    const waited = await withTimeout(signOutInFlight.catch(() => undefined), SIGN_OUT_WAIT_MS);
    if (waited === TIMED_OUT) return true; // still running: the session is ending
  }
  const stored = await tokenStore.get().catch(() => 'unreadable');
  return !stored;
}

/**
 * The server answered 401 for the boot's token. Sign out only while that
 * token is still the stored session (client.ts follows the same rule): after
 * "continue without signing in" or a sign-in with another account, a late 401
 * for the old token must not wipe what the user did since.
 */
async function endRejectedSession(bootToken: string): Promise<BootNetworkResult> {
  const stored = await tokenStore.get().catch(() => null);
  if (stored === bootToken) {
    // client.ts may already have started this sign-out; signOut() joins it.
    await signOut().catch(() => { /* swallow */ });
    return 'auth_invalid';
  }
  // Already signed out (client.ts finished first), or another session now.
  return stored === null ? 'auth_invalid' : 'superseded';
}

/** How long the boot waited for local storage, for boot_completed. */
interface BootWaits {
  attempt: number;
  auth: { ms: number; capped: boolean };
  /** null when the boot did not need the snapshots (no token). */
  prime: { ms: number; capped: boolean } | null;
}

function finishBoot(
  startedAt: number,
  waits: BootWaits,
  path: BootPath,
  outcome: BootOutcome,
  isAuthenticated: boolean,
  settled?: Promise<BootNetworkResult>,
): BootResult {
  try {
    track({
      name: 'boot_completed',
      props: {
        ms: Date.now() - startedAt,
        path,
        outcome,
        attempt: waits.attempt,
        auth_hydration_ms: waits.auth.ms,
        auth_hydration_capped: waits.auth.capped,
        snapshot_prime_ms: waits.prime?.ms ?? null,
        snapshot_prime_capped: waits.prime?.capped ?? null,
      },
    });
  } catch { /* non-fatal */ }
  return { isAuthenticated, path, outcome, settled };
}

/** Whether a signed-in session is saved on this device. While the auth store
 *  has not loaded (past its cap) the answer is unknown, taken as "yes" so a
 *  signed-in user is never shown the retry screen; the layout still waits for
 *  the store before rendering routes. */
function sessionSavedOrUnknown(): boolean {
  if (!useAuthStore.persist.hasHydrated()) return true;
  const auth = useAuthStore.getState();
  return auth.isAuthenticated && !auth.isGuest && auth.userId !== null;
}

const bootFlight = createSingleFlight<BootResult>();
let bootAttempts = 0;

/**
 * Cold start. Resolves when the loading screen may go away.
 *
 * - No token (guest, signed out, fresh install): nothing to wait for.
 * - Signed-in user with saved state (session, last known Pro state, backfill
 *   done, token not past its own expiry): resolves at once and the server
 *   work finishes in the background
 *   ('cached'). The first frame shows the saved values: Pro from the last
 *   server answer, wallet and streak from their snapshots, progress from the
 *   local completion store.
 * - Otherwise waits for the server, at most BOOT_NETWORK_TIMEOUT_MS. Past
 *   that, a saved session goes on with saved state ('timeout'); a token with
 *   no saved session gets outcome 'retry' (the layout shows a retry screen
 *   instead of an endless loader) while the work continues.
 *
 * Correctness does not depend on the path: only a definite server answer
 * changes Pro state (a timeout or an error never downgrades), only a 401 signs
 * out, late answers never overwrite newer local writes (guardedQueryFn), and
 * the gates in the root layout (terms, force update, minors) render the same
 * way on every path.
 *
 * One boot per launch: a second call (the root layout can mount twice at
 * launch) joins the boot already running or finished and gets its result;
 * boot_completed fires once. `fresh` starts a genuinely new attempt (the retry
 * screen's button).
 */
export function bootFromToken(opts?: { fresh?: boolean }): Promise<BootResult> {
  return bootFlight.run(() => runBoot(++bootAttempts), opts);
}

async function runBoot(attempt: number): Promise<BootResult> {
  const startedAt = Date.now();
  const gen = ++bootGeneration;

  // Local storage first, all at once: the token (secure store), the auth store
  // and the saved snapshots (AsyncStorage on devices). Only the first two
  // decide anything for a launch with no token, so the snapshots are awaited
  // only when there is one.
  const primeWait = waitCapped(primeBootSnapshots(), SNAPSHOT_PRIME_TIMEOUT_MS);
  const [tokenRead, authWait] = await Promise.all([
    tokenStore.get().then(
      (t) => ({ token: t, failed: false }),
      () => ({ token: null, failed: true }),
    ),
    whenHydrated(useAuthStore, AUTH_HYDRATION_TIMEOUT_MS),
  ]);
  const { token, failed: tokenReadFailed } = tokenRead;
  const waits: BootWaits = { attempt, auth: authWait, prime: null };

  const auth = useAuthStore.getState();
  const savedUserId = auth.isAuthenticated && !auth.isGuest ? auth.userId : null;

  // Configure RevenueCat with the saved user id when there is one, so a
  // returning user is identified from the start and Purchases.logIn only runs
  // when the id really changes (it used to run, and fire rc_login_succeeded,
  // on every cold start after an anonymous configure in the root layout).
  configureRevenueCat((token || tokenReadFailed) ? savedUserId ?? undefined : undefined);

  // No JWT yet. Two kinds of stored sessions used to be re-minted here from
  // the email alone (POST /api/auth/verify {provider:'email', email}):
  //   - a pre-JWT session from an older build (`auth-store-v2`), and
  //   - an email "ghost": local isAuthenticated with no JWT, left by the old
  //     register flow that signed in locally before the server call.
  // That request is exactly what let anyone take over any email account, and
  // since 2026-11-13 the server refuses it without a mailed code. There is no
  // silent path left: these users sign in again with a code. Ghosts keep their
  // local state (as when the heal used to fail); the events count them.
  if (!token) {
    if (!tokenReadFailed) {
      // Counting only: never hold a fresh install's first paint for it.
      void readLegacyAuthSession().then((legacy) => {
        if (legacy) {
          captureEvent('legacy_session_needs_code');
        } else if (auth.isAuthenticated && !auth.isGuest && auth.email) {
          captureEvent('ghost_session_needs_code');
        }
      });
    }
    return finishBoot(startedAt, waits, 'no_token', 'signed_out', false);
  }

  const [backfillDone, primeWaited] = await Promise.all([backfillFlag.isDone().catch(() => false), primeWait]);
  waits.prime = primeWaited;
  const hasSession = savedUserId !== null;

  // Saved last-known values for the first frame (see seedFromSnapshot), read
  // after the prime above: on devices nothing is readable before it.
  // Snapshots are keyed by the saved authId, so another account's never show.
  const proKnown = hasSession && readSubscriptionSnapshot() !== null;
  if (hasSession) {
    seedFromSnapshot(subscriptionQueryKey, readSubscriptionSnapshot());
    seedFromSnapshot(economyQueryKey, economyPlaceholder());
    seedFromSnapshot(streakQueryKey, streakPlaceholder());
  }

  const cached = decideBootPath({
    hasSession,
    proKnown,
    backfillDone,
    tokenExpired: isTokenExpiredLocally(token),
  }) === 'cached';
  let path: 'cached' | 'network' | 'timeout' = cached ? 'cached' : 'network';

  const hydration: Promise<BootNetworkResult> = hydrateSession(gen, backfillDone, token, startedAt, hasSession)
    .catch((): BootNetworkResult => 'error')
    .then((result) => {
      try {
        track({ name: 'boot_network_settled', props: { ms: Date.now() - startedAt, path, result } });
      } catch { /* non-fatal */ }
      return result;
    });

  // B2: whenever the server work ends in 'error', on any path (the 'cached'
  // one has rendered long before), a saved session whose subscription is still
  // the saved non-Pro seed shows RevenueCat's cached Pro instead. The paths
  // that wait below also run it before their first frame.
  void hydration
    .then((result) => (fallsBackToStoreCache(result, hasSession) ? seedProFromStoreCache(gen) : undefined))
    .catch(() => { /* non-fatal */ });

  if (cached) return finishBoot(startedAt, waits, 'cached', 'signed_in', true);

  const raced = await withTimeout(hydration, BOOT_NETWORK_TIMEOUT_MS);
  // Re-read now: if the auth store loaded only after its cap, it has a say.
  const saved = hasSession || sessionSavedOrUnknown();

  if (raced === TIMED_OUT) {
    path = 'timeout';
    if (saved) {
      // Another request's 401 may have signed the user out meanwhile (an
      // expired token): render that, not the old session.
      if (await sessionEndedDuringBoot()) return finishBoot(startedAt, waits, 'timeout', 'signed_out', false);
      if (hasSession) await seedProFromStoreCache(gen);
      return finishBoot(startedAt, waits, 'timeout', 'signed_in', true);
    }
    return finishBoot(startedAt, waits, 'timeout', 'retry', false, hydration);
  }

  if (raced === 'ok') {
    if (hasSession) await seedProFromStoreCache(gen); // no-op unless the subscription read failed
    return finishBoot(startedAt, waits, 'network', 'signed_in', true);
  }
  if (raced === 'auth_invalid') return finishBoot(startedAt, waits, 'network', 'signed_out', false);
  // 'error' | 'no_profile' | 'superseded': not a definite sign-out, so a saved
  // session goes on with saved state, as before, unless a sign-out ran
  // during the boot.
  if (saved) {
    if (await sessionEndedDuringBoot()) return finishBoot(startedAt, waits, 'network', 'signed_out', false);
    if (hasSession) await seedProFromStoreCache(gen);
    return finishBoot(startedAt, waits, 'network', 'signed_in', true);
  }
  if (raced === 'error') return finishBoot(startedAt, waits, 'network', 'retry', false, hydration);
  return finishBoot(startedAt, waits, 'network', 'signed_out', false);
}
