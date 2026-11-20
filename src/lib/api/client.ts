// src/lib/api/client.ts
import { tokenStore } from '../auth/secureStore';
import { captureEvent } from '../posthog';
import { getApiBase } from '../../db/apiBase';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

let onUnauthorizedHandler: (() => void) | null = null;
export function setOnUnauthorized(handler: () => void): void {
  onUnauthorizedHandler = handler;
}

// Dedup guard: one fire per distinct token value. Replaces an earlier boolean
// flag that re-armed on ANY 2xx response — that re-arm fired the event 20x+
// per cold start when sync endpoints had mixed 200/401 outcomes against the
// same stale token. Comparing the token itself means: same bad token → silent,
// new bad token (rotation, sign-in) → one event.
let lastFiredAuthToken: string | null = null;
// Wall-clock ceiling on top of the per-token guard. The token guard alone
// allowed pathological retry storms (PostHog showed ~72k events / 30 days)
// when the server rotated tokens on every request via X-Auth-Refreshed-Token:
// every retry produced a new token → new "first 401" → new event. This caps
// the firing rate to ≤1 per AUTH_INVALID_MIN_INTERVAL_MS per app session,
// regardless of how many tokens get rotated.
const AUTH_INVALID_MIN_INTERVAL_MS = 120_000;
let lastFiredAuthInvalidAt = 0;

// Track when the last token rotation happened (via X-Auth-Refreshed-Token).
// Lets the analytics event surface "how old is this token" — distinguishes
// "rotation produced a bad token immediately" from "token was valid for hours
// then suddenly rejected" (e.g. server-side key rotation).
let lastTokenRotationAt = 0;

/** First few chars + length signature. Never the full token — that's PII /
 *  a session-grab risk in analytics. 'jwt' = JWT format (eyJ...), 'opaque' =
 *  anything else, 'empty' = empty string. */
function tokenSignature(token: string): { format: 'jwt' | 'opaque' | 'empty'; length: number } {
  if (!token) return { format: 'empty', length: 0 };
  if (token.startsWith('eyJ')) return { format: 'jwt', length: token.length };
  return { format: 'opaque', length: token.length };
}

// Write endpoints outside /api/sync/ that act on the session token's user
// (server: api/_shared/callerAuth.ts). They used to trust an `authId` in the
// body. The server still has a narrow tokenless path on grant-coins and
// register-code for app bundles from before 2026-11-20; this client never
// uses it — without a session there is nothing for these calls to do.
const SESSION_ONLY_PATHS = new Set<string>([
  '/api/users/ping',
  '/api/economy/grant-coins',
  '/api/referral/register-code',
  '/api/trading/trade',
]);

function requiresSession(path: string): boolean {
  return path.startsWith('/api/sync/') || SESSION_ONLY_PATHS.has(path.split('?')[0]);
}

async function request<TBody, TResponse>(
  method: 'GET' | 'POST',
  path: string,
  body?: TBody,
): Promise<TResponse> {
  const token = await tokenStore.get();

  // Every /api/sync/* route is Bearer-only on the server (withAuth), and so are
  // the SESSION_ONLY_PATHS for this client, so a tokenless call (guest session)
  // can only ever get 401 "Missing Authorization header". Answer that locally
  // instead of spending a request: guests were firing a guaranteed-401 streak
  // tick on every foreground, a session-time POST on every background and an
  // economy POST per reward.
  // Callers see exactly what the server would have produced (ApiError 401,
  // same body), and — as before for a tokenless 401 — no auth_token_invalid
  // event and no onUnauthorized sign-out.
  if (!token && requiresSession(path)) {
    throw new ApiError('Unauthorized', 401, { error: 'Missing Authorization header' });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const base = getApiBase();
  const url = base ? `${base}${path}` : path;

  if (__DEV__) {
    // Diagnostic: surfaces the resolved base URL (catches .env.local overriding
    // .env) and whether a Bearer token was attached, for every request.
    // eslint-disable-next-line no-console
    console.log(`[api] → ${method} ${url} (auth: ${token ? 'bearer' : 'NONE'})`);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const refreshed = res.headers.get('X-Auth-Refreshed-Token');
  if (refreshed) {
    // Only rotate the session this request was sent with (20.11): a response
    // that lands after a sign-out, a sign-in with another account, or
    // "continue without signing in" must not store its token again.
    const stored = await tokenStore.get().catch(() => null);
    if (token && stored === token) {
      await tokenStore.set(refreshed);
      lastTokenRotationAt = Date.now();
    }
  }

  if (res.status === 401) {
    // Read the body so the actual reason ("Missing Authorization header" vs
    // "Invalid or expired token") is no longer discarded — that distinction
    // tells us whether the token wasn't sent or was rejected.
    const errText = await res.text().catch(() => '');
    let errBody: unknown = null;
    try { errBody = errText ? JSON.parse(errText) : null; } catch { /* non-JSON */ }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[api] ✗ 401 ${method} ${url} — ${errText || '(empty body)'} (token sent: ${token ? 'yes' : 'no'})`);
    }
    // Only fire when an actual token was rejected (not for guest 401s — those
    // are "missing auth" not "invalid token"), only once per distinct token
    // value, AND with a wall-clock ceiling so rotating-token retry storms
    // can't inflate the count. Guest sessions that hit auth-required
    // endpoints used to inflate the event count without representing a real
    // session failure.
    if (token && token !== lastFiredAuthToken) {
      lastFiredAuthToken = token;
      const now = Date.now();
      if (now - lastFiredAuthInvalidAt >= AUTH_INVALID_MIN_INTERVAL_MS) {
        lastFiredAuthInvalidAt = now;
        // Surface enough context to diagnose the 132-user spike PostHog
        // surfaced 2026-06-05. error_message distinguishes "expired" vs
        // "invalid signature" vs other server reasons. token_length +
        // token_format catch truncation / wrong-provider bugs. Token
        // value itself is NEVER logged. ms_since_token_rotated tells us
        // if the bad token came from a recent rotation or was stale.
        const errMessage = (() => {
          if (errBody && typeof errBody === 'object' && 'error' in errBody) {
            const e = (errBody as { error?: unknown }).error;
            if (typeof e === 'string') return e.slice(0, 200);
          }
          return errText.slice(0, 200);
        })();
        const sig = tokenSignature(token);
        try {
          captureEvent('auth_token_invalid', {
            endpoint: path,
            method,
            error_message: errMessage,
            token_length: sig.length,
            token_format: sig.format,
            ms_since_token_rotated: lastTokenRotationAt > 0 ? now - lastTokenRotationAt : null,
          });
        } catch { /* swallow */ }
      }
      // onUnauthorizedHandler still fires every time so the UI sign-out path
      // (handler in lifecycle.ts) reacts immediately to ANY rejected token —
      // analytics rate-limit isn't business logic. But only while the rejected
      // token is still the stored session (20.11): a late 401 for a token the
      // app already dropped ("continue without signing in", a sign-in with
      // another account, a rotation) must not sign out whoever uses the app now.
      if (onUnauthorizedHandler) {
        const stored = await tokenStore.get().catch(() => null);
        if (stored === token) onUnauthorizedHandler();
      }
    }
    throw new ApiError('Unauthorized', 401, errBody);
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[api] ✗ ${res.status} ${method} ${url}`, parsed);
    }
    throw new ApiError(parsed?.error ?? `HTTP ${res.status}`, res.status, parsed);
  }
  return parsed as TResponse;
}

export const api = {
  get: <TResponse>(path: string) => request<undefined, TResponse>('GET', path),
  post: <TBody, TResponse>(path: string, body: TBody) =>
    request<TBody, TResponse>('POST', path, body),
};
