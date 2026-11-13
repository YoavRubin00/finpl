// POST /api/auth/email-code — mail a 6-digit sign-in code.
//
//   { email } → 200 { ok: true, resendAfterSec: 30, expiresInSec: 600 }
//             → 400 INVALID_EMAIL · 429 RATE_LIMITED (retryAfterSec) · 503 EMAIL_SEND_FAILED
//
// Same answer whether or not an account exists for the address: the code both
// signs in an existing user and creates a new one in /api/auth/verify.
// Throttles: 30 s between codes and 6 per hour per address, 20 per 15 minutes
// per IP (durable, in auth_rate_limits), plus a per-instance burst guard.

import { checkRateLimit, getClientId } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { authError, handleEmailCodeRequest, type AuthResponse } from '../../../api/_shared/authVerify';
import { createEmailCodeDeps } from '../../../api/_shared/authDeps';

function toResponse(r: AuthResponse): Response {
  return Response.json(r.body, { status: r.status, headers: r.headers });
}

export async function POST(request: Request): Promise<Response> {
  const clientIp = getClientId(request);

  const fast = checkRateLimit(`${clientIp}:auth-email-code`, { limit: 5, windowSec: 60 });
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
    return toResponse(await handleEmailCodeRequest(body, clientIp, createEmailCodeDeps()));
  } catch (err: unknown) {
    return safeErrorResponse(err, 'auth/email-code');
  }
}
