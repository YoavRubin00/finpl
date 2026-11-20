// src/features/the-bridge/bridgeRedeemCore.ts
//
// What an answer of POST /api/bridge/redeem means, the one retry when the
// outcome is unknown, and the ids still waiting for a definite answer
// (economy fix round E6a/E6b, 20.11). Pure logic, no React Native imports, so
// scripts/test-bridge-redeem-client.ts runs it in Node; useBridgeStore.ts
// uses it.
//
// The server deducts the cost and records the redemption in one statement,
// once per account and benefit: a repeated request answers alreadyRedeemed
// and deducts nothing. So when the answer is lost after the server committed
// (no network, a body that is not JSON, a 5xx, a request that never answers),
// sending the same request again is safe and tells the app what happened.
// Still unknown after that: the benefit id is kept as "pending", and the
// Bridge lets the next tap reach the server even when the balance on screen
// (already lowered by the lost deduction) looks too small.

/** One attempt never waits longer than this (React Native's fetch has no timeout). */
export const REDEEM_ATTEMPT_TIMEOUT_MS = 15_000;
/** Pause before the one retry, so a network blip has a moment to pass. */
export const REDEEM_RETRY_DELAY_MS = 600;

export type RedeemOutcome<T> =
  | { kind: 'redeemed'; answer: T }
  /** 409: the server balance does not cover the cost (body carries the server economy). */
  | { kind: 'insufficient'; body: unknown }
  /** 404: unknown benefit, or no profile. */
  | { kind: 'not_available' }
  /** 401: no session, or the session was rejected. */
  | { kind: 'signed_out' }
  /** Any other 4xx: refused, nothing done. */
  | { kind: 'refused'; status: number }
  /** No answer we can read: the server may or may not have redeemed. */
  | { kind: 'unknown' };

export type RedeemOutcomeKind = RedeemOutcome<unknown>['kind'];

export const TIMED_OUT = Symbol('redeem-timed-out');

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

function httpStatus(err: unknown): number | null {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : null;
}

/** What a failed request means. The shared client throws ApiError (with
 *  `status` and `body`) for HTTP errors; anything without a status is a
 *  network failure or a body that is not JSON. */
export function classifyRedeemError(err: unknown): Exclude<RedeemOutcome<never>, { kind: 'redeemed' }> {
  const status = httpStatus(err);
  if (status === null || status >= 500) return { kind: 'unknown' };
  if (status === 409) return { kind: 'insufficient', body: (err as { body?: unknown }).body ?? null };
  if (status === 404) return { kind: 'not_available' };
  if (status === 401) return { kind: 'signed_out' };
  return { kind: 'refused', status };
}

/** A 2xx body that really says "redeemed" ({ ok: true, redeemed: true }). */
export function isRedeemAnswer(v: unknown): v is { ok: true; redeemed: true; alreadyRedeemed?: unknown; economy?: unknown } {
  if (!v || typeof v !== 'object') return false;
  const a = v as { ok?: unknown; redeemed?: unknown };
  return a.ok === true && a.redeemed === true;
}

export interface RedeemAttemptOptions {
  timeoutMs?: number;
  retryDelayMs?: number;
}

/**
 * Sends the request; when the outcome is unknown, sends the same request once
 * more after a short pause. A definite answer (success, 409, 404, 401, other
 * 4xx) is never repeated.
 */
export async function runRedeemAttempts<T>(
  send: () => Promise<unknown>,
  isAnswer: (v: unknown) => v is T,
  opts: RedeemAttemptOptions = {},
): Promise<{ outcome: RedeemOutcome<T>; attempts: number }> {
  const timeoutMs = opts.timeoutMs ?? REDEEM_ATTEMPT_TIMEOUT_MS;
  const retryDelayMs = opts.retryDelayMs ?? REDEEM_RETRY_DELAY_MS;
  const once = async (): Promise<RedeemOutcome<T>> => {
    try {
      const answer = await withDeadline(send(), timeoutMs);
      if (answer === TIMED_OUT || !isAnswer(answer)) return { kind: 'unknown' };
      return { kind: 'redeemed', answer };
    } catch (err) {
      return classifyRedeemError(err);
    }
  };
  const first = await once();
  if (first.kind !== 'unknown') return { outcome: first, attempts: 1 };
  if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  return { outcome: await once(), attempts: 2 };
}

/**
 * The pending ids after an outcome for `benefitId`: an answer that says what
 * happened to the redemption (redeemed now or before, not enough coins, no
 * such benefit) ends its pending state; an unknown one starts it; a 401 or
 * another refusal says nothing about an earlier lost request, so the list
 * stays as it is.
 */
export function nextPendingRedeemIds(ids: readonly string[] | null | undefined, benefitId: string, kind: RedeemOutcomeKind): string[] {
  const list = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  switch (kind) {
    case 'redeemed':
    case 'insufficient':
    case 'not_available':
      return list.filter((x) => x !== benefitId);
    case 'unknown':
      return list.includes(benefitId) ? list : [...list, benefitId];
    default:
      return list;
  }
}
