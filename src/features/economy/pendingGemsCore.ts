// src/features/economy/pendingGemsCore.ts
//
// Bought gems shown before the server has them (economy fix round E2b, 20.11).
// Pure logic, no React Native imports, so scripts/test-pending-gems.ts runs it
// in Node; the app binds it in useEconomy.ts.
//
// Since 2026-11-20 the server credits purchased gems only from the RevenueCat
// webhook (a purchase-sized gem delta from the app is dropped), and the
// webhook usually lands a few seconds after the store sheet closes. Every
// server answer written into the cache before that (the starter pack's own
// coin POST, the re-reads after the purchase, any reward) replaced the balance
// and took the bought gems off the screen again. The overlay keeps them on
// screen, as PENDING:
//
//   shown gems = server gems + min(bought, target - server gems)
//
// `target` is the gem balance the server should report once every pending
// purchase is credited: the balance at the first purchase, plus each bought
// amount, plus every gem change the app sent since (a reward, a spend). The
// pending part travels with the cached value (`pendingGems`), so whoever
// writes the cache by spreading the old value keeps it consistent, and it is
// never spendable (spendableGems).
//
// It ends when a server answer includes the purchases, i.e. what is still
// missing is smaller than the smallest pending purchase (the webhook credits
// whole purchases, so a smaller gap is the server's own handling of another
// delta, such as a capped reward), or once the window has passed (3 minutes
// after the last purchase). Kept in memory only: a relaunch shows the server.

/** The part of the cached economy this module reads and writes. */
export interface GemsCarrier {
  gems: number | null;
  /** App-side only, never sent by the server: how much of `gems` is bought
   *  gems the server has not credited yet (shown, not spendable). */
  pendingGems?: number;
}

/** How long bought gems are shown before the server confirms them. */
export const PENDING_GEMS_WINDOW_MS = 3 * 60_000;

/** Shown when a gem spend needs bought gems the server has not confirmed yet.
 *  Plain Hebrew, no em-dashes. */
export const PENDING_GEMS_COPY = {
  title: 'היהלומים שקניתם בדרך',
  body: 'עוד כמה רגעים אפשר יהיה להשתמש בהם.',
} as const;

/**
 * Re-reads of the server balance after a purchase (ms after it). The last one
 * runs just after the window, so it shows the server's balance as it is.
 */
export const PENDING_GEMS_REREAD_MS: readonly number[] = [5_000, 20_000, 60_000, PENDING_GEMS_WINDOW_MS + 1_000];

export interface PendingGemsState {
  authId: string;
  target: number;
  /** Each pending purchase, in gems (credited whole by the webhook). */
  purchases: number[];
  expiresAt: number;
}

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function pendingPart(value: GemsCarrier | null | undefined): number {
  const p = value?.pendingGems;
  return finite(p) && p > 0 ? p : 0;
}

/** The gems of a cached value without the pending part (the server's view). */
export function rawGems(value: GemsCarrier | null | undefined): number {
  const gems = finite(value?.gems) ? (value!.gems as number) : 0;
  return gems - pendingPart(value);
}

/** Gems the user may spend: what is shown minus bought gems still pending. */
export function spendableGems(value: GemsCarrier | null | undefined): number {
  return Math.max(0, rawGems(value));
}

/**
 * Whether a gem spend of `cost` may go ahead (boot fix B9, 20.11): 'ok' when
 * the gems the server has cover it (spendableGems); 'pending' when only the
 * bought gems still on their way would (say so with PENDING_GEMS_COPY, don't
 * send the user to buy more); 'short' when even the shown gems don't.
 */
export type GemSpendCheck = 'ok' | 'pending' | 'short';

export function checkGemSpend(value: GemsCarrier | null | undefined, cost: number): GemSpendCheck {
  if (spendableGems(value) >= cost) return 'ok';
  const shown = finite(value?.gems) ? (value!.gems as number) : 0;
  return shown >= cost ? 'pending' : 'short';
}

/** The value without any pending part, i.e. the server's view (the same
 *  object when it has none). What a snapshot saves (useEconomy.ts). */
export function withoutPendingGems<T extends GemsCarrier>(value: T): T {
  if (value.pendingGems === undefined) return value;
  const copy: T = { ...value, gems: rawGems(value) };
  delete (copy as GemsCarrier).pendingGems;
  return copy;
}

export interface PendingGems {
  /**
   * A store purchase of `gems` just completed for this account. `current` is
   * what the cache shows now (its pending part is ignored). Returns false when
   * nothing was recorded (no account, nothing bought).
   */
  recordPurchase(authId: string | null, gems: number, current: GemsCarrier | null | undefined, nowMs: number): boolean;
  /** The app sent this gem change to the server (a reward, a spend). */
  noteDelta(gemsDelta: number | null | undefined): void;
  /**
   * The value to put in the cache for this answer (a server answer, or the
   * cached value itself): the pending gems on top while the server still lacks
   * them, none otherwise. Idempotent. Ends the pending state once the server
   * has the purchases, the window has passed, or the account changed.
   */
  apply<T extends GemsCarrier>(value: T | null | undefined, authId: string | null, nowMs: number): T | null | undefined;
  /** Ends the pending state when its window has passed. True when it did. */
  expireIfDue(nowMs: number): boolean;
  clear(): void;
  /** For tests and diagnostics. */
  peek(): Readonly<PendingGemsState> | null;
}

export function createPendingGems(windowMs: number = PENDING_GEMS_WINDOW_MS): PendingGems {
  let state: PendingGemsState | null = null;

  return {
    recordPurchase(authId, gems, current, nowMs) {
      if (!authId || !finite(gems) || gems <= 0) return false;
      const bought = Math.round(gems);
      if (state && state.authId === authId && nowMs < state.expiresAt) {
        state = {
          authId,
          target: state.target + bought,
          purchases: [...state.purchases, bought],
          expiresAt: nowMs + windowMs,
        };
      } else {
        state = { authId, target: rawGems(current) + bought, purchases: [bought], expiresAt: nowMs + windowMs };
      }
      return true;
    },

    noteDelta(gemsDelta) {
      if (!state || !finite(gemsDelta) || gemsDelta === 0) return;
      state = { ...state, target: state.target + Math.round(gemsDelta) };
    },

    apply(value, authId, nowMs) {
      if (!value) return value;
      const base = withoutPendingGems(value);
      if (!state) return base;
      if (!authId || state.authId !== authId || nowMs >= state.expiresAt) {
        state = null;
        return base;
      }
      const raw = rawGems(value);
      const missing = state.target - raw;
      if (missing < Math.min(...state.purchases)) {
        // The server has the purchases (or more): nothing to add any more.
        state = null;
        return base;
      }
      const bought = state.purchases.reduce((sum, g) => sum + g, 0);
      const shown = Math.min(bought, missing);
      return { ...base, gems: raw + shown, pendingGems: shown };
    },

    expireIfDue(nowMs) {
      if (state && nowMs >= state.expiresAt) {
        state = null;
        return true;
      }
      return false;
    },

    clear() {
      state = null;
    },

    peek() {
      return state;
    },
  };
}
