// api/_shared/authProof.ts
//
// Pure proof-of-identity helpers for /api/auth/verify and /api/auth/link.
// No database and no network here: anything that talks to Apple or Google
// takes the fetch function as a parameter, so scripts/test-auth-verify.ts can
// exercise every check with fabricated keys and tokens.
//
// What each provider must prove (2026-11-13 fix):
//   email  — the 6-digit code mailed to the address (HMAC-stored, 10 min, 5 tries).
//   apple  — an identity token signed by one of Apple's keys, iss=appleid.apple.com,
//            aud = our bundle id, not expired, sub = the user id the client claims.
//   google — Google's tokeninfo accepts the token AND it was issued to one of
//            FinPlay's own OAuth clients (aud / azp), not to some other app.

import { createHmac, createPublicKey, randomInt, timingSafeEqual, verify as cryptoVerify } from 'crypto';

// ─── Shared ──────────────────────────────────────────────────────────────────

/** Minimal fetch signature the helpers need (global fetch satisfies it). */
export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Apple and Google send booleans either as JSON booleans or as "true"/"false". */
function truthyClaim(v: unknown): boolean {
  return v === true || v === 'true';
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─── JWT parsing ─────────────────────────────────────────────────────────────

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signingInput: string;
  signature: Buffer;
}

export function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) return null;
  try {
    const header: unknown = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!isRecord(header) || !isRecord(payload)) return null;
    return {
      header,
      payload,
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: Buffer.from(parts[2], 'base64url'),
    };
  } catch {
    return null;
  }
}

// ─── Apple ───────────────────────────────────────────────────────────────────

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

/** One RSA key from https://appleid.apple.com/auth/keys. */
export interface AppleJwk {
  kty: string;
  kid: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

/** The token's audience is the app's bundle id (app.json ios.bundleIdentifier). */
export function getAppleAudiences(): string[] {
  const configured = splitList(process.env.APPLE_BUNDLE_IDS);
  return configured.length > 0 ? configured : ['com.finplay.app'];
}

export function parseAppleJwks(body: unknown): AppleJwk[] {
  if (!isRecord(body) || !Array.isArray(body.keys)) return [];
  const keys: AppleJwk[] = [];
  for (const k of body.keys) {
    if (!isRecord(k)) continue;
    const kty = str(k.kty);
    const kid = str(k.kid);
    const n = str(k.n);
    const e = str(k.e);
    if (kty !== 'RSA' || !kid || !n || !e) continue;
    keys.push({ kty, kid, n, e, alg: str(k.alg) ?? undefined, use: str(k.use) ?? undefined });
  }
  return keys;
}

export type AppleTokenFailure =
  | 'malformed'
  | 'bad_alg'
  | 'unknown_key'
  | 'bad_signature'
  | 'bad_issuer'
  | 'bad_audience'
  | 'expired'
  | 'missing_sub'
  | 'sub_mismatch';

export type AppleTokenResult =
  | { ok: true; sub: string; email: string | null; emailVerified: boolean }
  | { ok: false; reason: AppleTokenFailure };

const CLOCK_SKEW_SEC = 60;

/** Returns the kid of an Apple token's header, or null if it can't be read. */
export function appleTokenKid(token: string): string | null {
  const decoded = decodeJwt(token);
  return decoded ? str(decoded.header.kid) : null;
}

/**
 * Verify a Sign in with Apple identity token. `keys` is Apple's JWKS;
 * `expectedSub`, when given, is the user id the client claims (credential.user)
 * and must equal the token's `sub`. The caller uses the returned `sub`.
 */
export function verifyAppleIdentityToken(
  token: string,
  opts: { keys: readonly AppleJwk[]; audiences: readonly string[]; expectedSub?: string | null; nowSec: number },
): AppleTokenResult {
  const decoded = decodeJwt(token);
  if (!decoded) return { ok: false, reason: 'malformed' };
  const { header, payload } = decoded;

  // Only RS256: never let the token pick "none" or an HMAC algorithm.
  if (header.alg !== 'RS256') return { ok: false, reason: 'bad_alg' };
  const kid = str(header.kid);
  const jwk = kid ? opts.keys.find((k) => k.kid === kid) : undefined;
  if (!jwk) return { ok: false, reason: 'unknown_key' };

  let signatureOk = false;
  try {
    const publicKey = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
    // Uint8Array copies: TS 5.9's ArrayBufferView no longer accepts a Node Buffer here.
    signatureOk = cryptoVerify(
      'RSA-SHA256',
      new Uint8Array(Buffer.from(decoded.signingInput)),
      publicKey,
      new Uint8Array(decoded.signature),
    );
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) return { ok: false, reason: 'bad_signature' };

  if (payload.iss !== APPLE_ISSUER) return { ok: false, reason: 'bad_issuer' };

  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud.filter((a): a is string => typeof a === 'string') : typeof aud === 'string' ? [aud] : [];
  if (!audList.some((a) => opts.audiences.includes(a))) return { ok: false, reason: 'bad_audience' };

  const exp = typeof payload.exp === 'number' ? payload.exp : NaN;
  if (!Number.isFinite(exp) || exp + CLOCK_SKEW_SEC < opts.nowSec) return { ok: false, reason: 'expired' };

  const sub = str(payload.sub);
  if (!sub) return { ok: false, reason: 'missing_sub' };
  if (opts.expectedSub && opts.expectedSub !== sub) return { ok: false, reason: 'sub_mismatch' };

  const email = str(payload.email);
  return { ok: true, sub, email, emailVerified: email !== null && truthyClaim(payload.email_verified) };
}

// ─── Google ──────────────────────────────────────────────────────────────────

// FinPlay's own OAuth clients (eas.json). Env can add more; it can't remove
// these, so a missing Vercel variable never locks Google users out.
const KNOWN_GOOGLE_CLIENT_IDS = [
  '847177819309-j90v0224p3lp8hio693cikmktd77mqp1.apps.googleusercontent.com', // web
  '847177819309-mbb8nusv6r17oot0e49e1npbgmaecps0.apps.googleusercontent.com', // iOS
  '847177819309-j2gkdub5929g1lcd1te2i9dfs5uvk7ba.apps.googleusercontent.com', // Android (store builds)
  '847177819309-jhvs6bn67e0h587g2rhn07j6pdo0ddct.apps.googleusercontent.com', // Android (development build)
];

export function getGoogleClientIds(): string[] {
  const fromEnv = [
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ...splitList(process.env.GOOGLE_OAUTH_CLIENT_IDS),
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
  return Array.from(new Set([...KNOWN_GOOGLE_CLIENT_IDS, ...fromEnv]));
}

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

export type GoogleTokenFailure =
  | 'rejected_by_google'
  | 'foreign_audience'
  | 'bad_issuer'
  | 'missing_sub'
  | 'userinfo_rejected'
  | 'userinfo_mismatch';

export type GoogleTokenResult =
  | { ok: true; sub: string; email: string | null; emailVerified: boolean; name: string | null }
  | { ok: false; reason: GoogleTokenFailure };

export function isGoogleIdToken(token: string): boolean {
  return (token.match(/\./g) ?? []).length === 2;
}

/**
 * Resolve a Google id_token or access_token to a Google identity, rejecting
 * tokens Google accepts but that were issued to another app's client.
 *   id_token     → tokeninfo?id_token, require aud ∈ our client ids.
 *   access_token → tokeninfo?access_token, require aud or azp ∈ our client ids,
 *                  THEN userinfo (only for name/email) with id = tokeninfo.sub.
 */
export async function resolveGoogleToken(
  token: string,
  opts: { clientIds: readonly string[]; fetchImpl: FetchLike },
): Promise<GoogleTokenResult> {
  const { clientIds, fetchImpl } = opts;

  if (isGoogleIdToken(token)) {
    const r = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (!r.ok) return { ok: false, reason: 'rejected_by_google' };
    const info = await r.json();
    if (!isRecord(info)) return { ok: false, reason: 'rejected_by_google' };
    const aud = str(info.aud);
    if (!aud || !clientIds.includes(aud)) return { ok: false, reason: 'foreign_audience' };
    if (!GOOGLE_ISSUERS.includes(str(info.iss) ?? '')) return { ok: false, reason: 'bad_issuer' };
    const sub = str(info.sub);
    if (!sub) return { ok: false, reason: 'missing_sub' };
    const given = str(info.given_name);
    const name = str(info.name) ?? (given ? `${given} ${str(info.family_name) ?? ''}`.trim() : null);
    const email = str(info.email);
    return { ok: true, sub, email, emailVerified: email !== null && truthyClaim(info.email_verified), name };
  }

  const r = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
  if (!r.ok) return { ok: false, reason: 'rejected_by_google' };
  const info = await r.json();
  if (!isRecord(info)) return { ok: false, reason: 'rejected_by_google' };
  const aud = str(info.aud);
  const azp = str(info.azp);
  if (!(aud && clientIds.includes(aud)) && !(azp && clientIds.includes(azp))) {
    return { ok: false, reason: 'foreign_audience' };
  }
  const sub = str(info.sub);
  if (!sub) return { ok: false, reason: 'missing_sub' };

  const u = await fetchImpl('https://www.googleapis.com/userinfo/v2/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!u.ok) return { ok: false, reason: 'userinfo_rejected' };
  const user = await u.json();
  if (!isRecord(user) || str(user.id) !== sub) return { ok: false, reason: 'userinfo_mismatch' };

  const email = str(info.email) ?? str(user.email);
  const emailVerified = email !== null && (truthyClaim(info.email_verified) || truthyClaim(user.verified_email));
  return { ok: true, sub, email, emailVerified, name: str(user.name) };
}

// ─── Email one-time codes ────────────────────────────────────────────────────

export const EMAIL_CODE_TTL_SEC = 10 * 60;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_CODE_RESEND_COOLDOWN_SEC = 30;

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Trim + lowercase + validate. Codes and lookups are keyed on this form. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function isSixDigitCode(v: unknown): v is string {
  return typeof v === 'string' && /^\d{6}$/.test(v);
}

export function generateEmailCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Keyed hash: a leaked table row can't be brute-forced offline without the secret. */
export function hashEmailCode(email: string, code: string, secret: string): string {
  return createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

export function getEmailCodeSecret(): string {
  const secret = process.env.EMAIL_CODE_SECRET || process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error('EMAIL_CODE_SECRET / AUTH_JWT_SECRET is not configured');
  return secret;
}

function hexEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(new Uint8Array(ab), new Uint8Array(bb));
}

export type EmailCodeCheck = 'ok' | 'expired' | 'too_many_attempts' | 'wrong_code';

/**
 * Judge one guess. `attempts` is the count AFTER this guess was recorded, so
 * the 5th guess can still succeed and the 6th is refused before comparing.
 */
export function checkEmailCode(
  stored: { codeHash: string; expiresAtMs: number; attempts: number },
  submittedHash: string,
  nowMs: number,
): EmailCodeCheck {
  if (stored.expiresAtMs <= nowMs) return 'expired';
  if (stored.attempts > EMAIL_CODE_MAX_ATTEMPTS) return 'too_many_attempts';
  return hexEqual(stored.codeHash, submittedHash) ? 'ok' : 'wrong_code';
}
