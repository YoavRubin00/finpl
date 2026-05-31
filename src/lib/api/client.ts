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

async function request<TBody, TResponse>(
  method: 'GET' | 'POST',
  path: string,
  body?: TBody,
): Promise<TResponse> {
  const token = await tokenStore.get();
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
    await tokenStore.set(refreshed);
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
        try { captureEvent('auth_token_invalid', { endpoint: path }); } catch { /* swallow */ }
      }
      // onUnauthorizedHandler still fires every time so the UI sign-out path
      // (handler in lifecycle.ts) reacts immediately to ANY rejected token —
      // analytics rate-limit isn't business logic.
      if (onUnauthorizedHandler) onUnauthorizedHandler();
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
