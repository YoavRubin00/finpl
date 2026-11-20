// src/lib/auth/accountDeletionCore.ts
//
// The decision logic of "delete my account" (src/lib/auth/accountDeletion.ts),
// with no React Native imports so scripts/test-account-deletion-client.ts can
// run it in Node.

/** One attempt never waits longer than this (RN's fetch has no timeout). */
export const DELETE_ATTEMPT_TIMEOUT_MS = 15_000;

export type AttemptOutcome = 'deleted' | 'session_expired' | 'refused' | 'unknown';

export const TIMED_OUT = Symbol('timed-out');

export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
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

/**
 * What one answer (or failure) of POST /api/account/delete means.
 * Only an explicit { ok: true } is a success: an empty or unexpected 2xx body
 * (a proxy, a captive portal) proves nothing. The shared client throws
 * ApiError (with `status`) for HTTP errors; anything without a status (no
 * network, a body that isn't JSON) or a timeout means the server may or may
 * not have deleted the account.
 */
export function classifyDeleteAttempt(result: { answer: unknown } | { error: unknown }): AttemptOutcome {
  if ('answer' in result) {
    const answer = result.answer;
    if (answer === TIMED_OUT) return 'unknown';
    return answer !== null && typeof answer === 'object' && (answer as { ok?: unknown }).ok === true ? 'deleted' : 'unknown';
  }
  const status = httpStatus(result.error);
  if (status === 401) return 'session_expired'; // session rejected: nothing deleted
  if (status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429) return 'refused';
  return 'unknown';
}

/**
 * Sends the request; when the outcome is unknown, sends it once more at once.
 * The endpoint is idempotent, so a "deleted" answer that was lost comes back
 * as "already deleted" (also { ok: true }).
 */
export async function runDeleteAttempts(
  send: () => Promise<unknown>,
  timeoutMs: number = DELETE_ATTEMPT_TIMEOUT_MS,
): Promise<{ outcome: AttemptOutcome; attempts: number }> {
  const once = async (): Promise<AttemptOutcome> => {
    try {
      return classifyDeleteAttempt({ answer: await withDeadline(send(), timeoutMs) });
    } catch (error) {
      return classifyDeleteAttempt({ error });
    }
  };
  const first = await once();
  if (first !== 'unknown') return { outcome: first, attempts: 1 };
  return { outcome: await once(), attempts: 2 };
}
