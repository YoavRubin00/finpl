// src/features/subscription/subscriptionSeedCore.ts
//
// What a cold start shows as the subscription before the server answers (boot
// fix round B, 20.11). Pure logic, no React Native imports, so
// scripts/test-subscription-fallback.ts runs it in Node; the app binds it in
// useSubscription.ts (the saved snapshot) and lifecycle.ts (RevenueCat's
// cached entitlement).
//
// B3: a saved snapshot is shown as the server would report it now. The server
// reports a Pro whose expiry has passed as not Pro (api/_shared/subscriptionSync.ts
// applyExpiry), but a snapshot saved while the expiry was still ahead kept
// saying Pro after it passed: until the server answered, and for the whole
// session offline (the subscription read pauses, the boot's server work fails).
//
// B2: with no server answer, RevenueCat's cached customer info is the last
// known Pro state on this device. It used to be read only when the cache held
// nothing at all, so a saved "not Pro" kept a paying user Free for a whole
// offline or failed launch: normal right after a purchase until the webhook
// lands, and for a renewed subscriber whose snapshot B3 now shows as lapsed.
// It may now also replace a SEED that is not Pro (stored with updatedAt 0),
// and goes in as a seed itself, so any later server answer replaces it. It
// never replaces a server answer and never downgrades.
import type { SubscriptionLike } from './proOverrideCore';

/** Postgres prints `2026-12-20 10:00:00+00`; Hermes only parses ISO. */
export function toEpochMs(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !value) return null;
  const iso = value.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * B3: the server's rule for an expired Pro, applied to a saved snapshot: Pro
 * whose expiry is at or before `nowMs` is shown as not Pro (everything else
 * kept). No expiry, or one that cannot be read, leaves it as it is (the server
 * does the same). Returns the same object when nothing changes.
 */
export function withExpiryApplied<T extends SubscriptionLike>(snap: T, nowMs: number): T {
  if (snap.isPro !== true) return snap;
  const expiresMs = toEpochMs(snap.proExpiresAt);
  if (expiresMs === null || expiresMs > nowMs) return snap;
  return { ...snap, isPro: false };
}

/** The part of react-query's QueryState read here. */
export interface CachedQueryStateLike {
  data: unknown;
  dataUpdatedAt: number;
}

/**
 * B2: may RevenueCat's cached Pro go in instead of what the cache holds? Only
 * while it holds no server answer: nothing at all, or a seed (stored with
 * updatedAt 0) that is not Pro. Never over a server answer (any other
 * updatedAt), never in place of a seed that already says Pro.
 */
export function mayShowStoreCachePro(state: CachedQueryStateLike | null | undefined): boolean {
  if (!state || state.data === undefined) return true;
  if (state.dataUpdatedAt !== 0) return false;
  const data = state.data as { isPro?: unknown } | null;
  return data?.isPro !== true;
}

/**
 * B2: whether the boot falls back to RevenueCat's cached Pro once its server
 * work has ended with `result`, on any path ('cached' included). Only after an
 * 'error' (no answer, the session still valid) of a launch with a saved
 * session: never after a sign-out ('auth_invalid') or a takeover
 * ('superseded'), and not for a launch with no saved session (nothing is
 * shown signed in until the server answers).
 */
export function fallsBackToStoreCache(result: string, hasSavedSession: boolean): boolean {
  return hasSavedSession && result === 'error';
}

/** What RevenueCat's cached customer info says about the Pro entitlement. */
export interface StoreProState {
  isPro: boolean;
  proExpiresAt: string | null;
}

export type StoreCacheFallbackResult =
  /** RevenueCat's cached Pro is in the cache now, as a seed. */
  | 'shown'
  /** The cache holds a server answer, or a seed that already says Pro: left as it is. */
  | 'kept'
  /** RevenueCat's cache does not list Pro, or could not be read in time. */
  | 'not_pro'
  /** A sign-in, a sign-out or a newer boot came in: nothing is written for this one. */
  | 'superseded';

/**
 * B2: shows RevenueCat's cached Pro while the cache holds no server answer.
 * Checks before the read and again after it (a server answer or a sign-out may
 * come in during it). Never rejects.
 */
export async function showStoreCacheProIfNoServerAnswer(deps: {
  cacheState: () => CachedQueryStateLike | null | undefined;
  /** RevenueCat's cached entitlement, read with a time limit by the caller; null when unknown. */
  readStoreCache: () => Promise<StoreProState | null>;
  /** Whether the boot (or session) this runs for is still the current one. */
  isCurrent: () => boolean;
  /** Puts the value in the cache as a seed (queryGuard seedQueryData). */
  seed: (value: SubscriptionLike) => void;
}): Promise<StoreCacheFallbackResult> {
  try {
    if (!deps.isCurrent()) return 'superseded';
    if (!mayShowStoreCachePro(deps.cacheState())) return 'kept';
    const store = await deps.readStoreCache().catch(() => null);
    if (!store || store.isPro !== true) return 'not_pro';
    if (!deps.isCurrent()) return 'superseded';
    if (!mayShowStoreCachePro(deps.cacheState())) return 'kept';
    deps.seed({ isPro: true, proExpiresAt: store.proExpiresAt, proSource: null });
    return 'shown';
  } catch {
    return 'not_pro';
  }
}
