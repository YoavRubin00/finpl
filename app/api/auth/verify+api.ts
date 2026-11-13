// POST /api/auth/verify — exchange a PROVEN identity for a profile + session.
//
//   { provider: 'email',  email, code, displayName? }   code from /api/auth/email-code
//   { provider: 'apple',  identityToken, appleUserId?, displayName? }
//   { provider: 'google', token }                       id_token or access_token
//
// → 200 { ok: true, profile, token }
// → 4xx { ok: false, code, error }  (code: see AuthErrorCode in api/_shared/authVerify.ts)
//
// The same handler serves production (api/auth/verify.ts wraps it) and the
// Expo dev server. It used to accept an email with no proof and an Apple user
// id with no token, and returned that account's session to anyone (fixed
// 2026-11-13). Old app versions now get 401 EMAIL_CODE_REQUIRED /
// APPLE_TOKEN_REQUIRED, which they show as their generic sign-in failure.

import { checkRateLimit, getClientId } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { authError, handleVerify, type AuthResponse } from '../../../api/_shared/authVerify';
import { createVerifyDeps } from '../../../api/_shared/authDeps';

function toResponse(r: AuthResponse): Response {
  return Response.json(r.body, { status: r.status, headers: r.headers });
}

export async function POST(request: Request): Promise<Response> {
  const clientIp = getClientId(request);

  // Cheap per-instance guard in front of the durable limits inside handleVerify.
  const fast = checkRateLimit(`${clientIp}:auth-verify`, { limit: 20, windowSec: 60 });
  if (!fast.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((fast.resetAt - Date.now()) / 1000));
    return toResponse(authError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.', { retryAfterSec }, { 'Retry-After': String(retryAfterSec) }));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toResponse(authError(400, 'INVALID_REQUEST', 'Invalid request body'));
  }

  try {
    return toResponse(await handleVerify(body, clientIp, createVerifyDeps()));
  } catch (err: unknown) {
    return safeErrorResponse(err, 'auth/verify');
  }
}
