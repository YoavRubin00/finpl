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
    try { captureEvent('auth_token_invalid', { endpoint: path }); } catch { /* swallow */ }
    // Only fire sign-out if a token was actually attempted and rejected.
    // No-token 401s mean the user is a guest who never authenticated —
    // signing them out here would clear their guest session and bounce
    // them back to onboarding mid-flow.
    if (token && onUnauthorizedHandler) onUnauthorizedHandler();
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
