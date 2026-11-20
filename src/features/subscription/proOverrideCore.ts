// src/features/subscription/proOverrideCore.ts
//
// "The store says Pro" for this session (economy fix round E5a, 20.11). Pure
// logic, no React Native imports, so scripts/test-pro-override.ts runs it in
// Node; the app binds it in useSubscription.ts.
//
// Since 2026-11-20 the server makes an account Pro only once RevenueCat
// confirms it (or its webhook lands), so right after a purchase, or on a launch
// where the store says Pro and the server lags, the server can still answer
// "not Pro". The app showed the store's answer by writing it into the cache
// once, and the next refetch (30 s later, a reconnect, a foreground) wrote the
// server's "not Pro" back and locked a paying user out.
//
// The override is set from a FRESH RevenueCat answer that lists the
// entitlement, for the signed-in account only, and lasts until the
// entitlement's expiry (24 h when it has none). It is applied to what the
// subscription query function returns, never to what is saved: an overridden
// value carries the server's own answer (overriddenServerAnswer, a plain field
// so it survives react-query's structural sharing, which may store a copy),
// the snapshot saves that (rawOf), and the server stays the only writer of
// Pro. A fresh answer without the entitlement, a sign-out or an account wipe
// ends it.

/** Same shape as src/lib/api/subscription.ts SubscriptionState. */
export interface SubscriptionLike {
  isPro: boolean | null;
  proExpiresAt: string | null;
  proSource: string | null;
}

/** What apply() shows instead of the server's "not Pro". */
export interface OverriddenSubscription extends SubscriptionLike {
  isPro: true;
  /** App-side only: the server answer this value stands in for (null = no row). */
  overriddenServerAnswer: SubscriptionLike | null;
}

/** The part of a RevenueCat entitlement this module reads. */
export interface StoreEntitlementLike {
  expirationDate?: string | null;
}

/** Validity of an override whose entitlement has no expiry (lifetime, or unknown). */
export const NO_EXPIRY_OVERRIDE_MS = 24 * 60 * 60 * 1000;

export interface StoreProOverrideState {
  authId: string;
  untilMs: number;
  /** The entitlement's expiry as RevenueCat gave it (shown as proExpiresAt). */
  expirationDate: string | null;
}

export interface StoreProOverride {
  /**
   * A fresh RevenueCat answer for the signed-in account: `entitlement` is the
   * Pro entitlement it lists as active, or null when it lists none (which
   * ends the override). Nothing is set without an account.
   */
  noteStoreAnswer(authId: string | null, entitlement: StoreEntitlementLike | null | undefined, nowMs: number): void;
  clear(): void;
  /**
   * The subscription to show for this server answer: Pro while a valid
   * override exists for this account, the answer itself otherwise. A server
   * answer that already says Pro is returned as it is. Idempotent: applied
   * to a value it produced, it works from the server answer inside.
   */
  apply<T extends SubscriptionLike>(sub: T | null, authId: string | null, nowMs: number): T | OverriddenSubscription | SubscriptionLike | null;
  /** The server answer behind a value apply() returned (the value itself when
   *  it was not overridden), so a snapshot never saves the override. */
  rawOf<T extends SubscriptionLike>(value: T | null | undefined): T | SubscriptionLike | null | undefined;
  /** For tests and diagnostics. */
  peek(): Readonly<StoreProOverrideState> | null;
}

function serverAnswerOf<T extends SubscriptionLike>(value: T | null | undefined): T | SubscriptionLike | null | undefined {
  if (value && typeof value === 'object' && 'overriddenServerAnswer' in value) {
    return (value as unknown as OverriddenSubscription).overriddenServerAnswer;
  }
  return value;
}

/** RevenueCat dates are ISO strings; anything unparseable counts as none. */
export function parseStoreDate(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function createStoreProOverride(): StoreProOverride {
  let state: StoreProOverrideState | null = null;

  return {
    noteStoreAnswer(authId, entitlement, nowMs) {
      if (!entitlement) {
        // The store says "not Pro" now: whatever it said before no longer holds.
        state = null;
        return;
      }
      if (!authId) return;
      const expiresMs = parseStoreDate(entitlement.expirationDate ?? null);
      const untilMs = expiresMs ?? nowMs + NO_EXPIRY_OVERRIDE_MS;
      if (untilMs <= nowMs) {
        // Listed as active but already past its expiry (a stale copy): no override.
        state = null;
        return;
      }
      state = { authId, untilMs, expirationDate: expiresMs === null ? null : (entitlement.expirationDate ?? null) };
    },

    clear() {
      state = null;
    },

    apply(value, authId, nowMs) {
      const server = serverAnswerOf(value) ?? null;
      if (!state || !authId || state.authId !== authId) return server;
      if (nowMs >= state.untilMs) {
        state = null;
        return server;
      }
      if (server?.isPro === true) return server;
      const shown: OverriddenSubscription = {
        isPro: true,
        proExpiresAt: state.expirationDate,
        proSource: server?.proSource ?? null,
        overriddenServerAnswer: server,
      };
      return shown;
    },

    rawOf(value) {
      return serverAnswerOf(value);
    },

    peek() {
      return state;
    },
  };
}
