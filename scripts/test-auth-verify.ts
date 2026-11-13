// scripts/test-auth-verify.ts
// Run: npx tsx scripts/test-auth-verify.ts
//
// Exercises the real sign-in decision code (api/_shared/authVerify.ts +
// authProof.ts) with in-memory stores, a fake clock, fabricated RSA keys and a
// fake fetch. No network, no database.
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'crypto';
import {
  EMAIL_CODE_MAX_ATTEMPTS,
  checkEmailCode,
  hashEmailCode,
  normalizeEmail,
  resolveGoogleToken,
  verifyAppleIdentityToken,
  type AppleJwk,
  type FetchLike,
} from '../api/_shared/authProof';
import {
  handleEmailCodeRequest,
  handleVerify,
  type AuthResponse,
  type EmailCodeDeps,
  type ResolvedCredential,
  type VerifyDeps,
} from '../api/_shared/authVerify';
import type { EmailCodeStore, RateLimitStore, StoredEmailCode } from '../api/_shared/authStores';

let failed = 0;
let passed = 0;
function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.error(`FAIL: ${label}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  }
}

// ─── Fakes ───────────────────────────────────────────────────────────────────

class MemoryEmailCodeStore implements EmailCodeStore {
  rows = new Map<string, StoredEmailCode>();
  async issue(email: string, codeHash: string, expiresAtMs: number, nowMs: number, cooldownSec: number): Promise<boolean> {
    const existing = this.rows.get(email);
    // Mirrors the SQL: replace only when last_sent_at < now - cooldown.
    if (existing && !(existing.lastSentAtMs < nowMs - cooldownSec * 1000)) return false;
    this.rows.set(email, { codeHash, expiresAtMs, attempts: 0, lastSentAtMs: nowMs });
    return true;
  }
  async get(email: string): Promise<StoredEmailCode | null> {
    const row = this.rows.get(email);
    return row ? { ...row } : null;
  }
  async registerAttempt(email: string): Promise<StoredEmailCode | null> {
    const row = this.rows.get(email);
    if (!row) return null;
    row.attempts += 1;
    return { ...row };
  }
  async consume(email: string, codeHash: string): Promise<boolean> {
    const row = this.rows.get(email);
    if (!row || row.codeHash !== codeHash) return false;
    this.rows.delete(email);
    return true;
  }
  async remove(email: string): Promise<void> {
    this.rows.delete(email);
  }
  async purgeExpired(): Promise<void> { /* not needed */ }
}

class MemoryRateLimitStore implements RateLimitStore {
  rows = new Map<string, { windowStartMs: number; count: number }>();
  async hit(key: string, windowSec: number, nowMs: number): Promise<{ count: number; resetAtMs: number }> {
    const row = this.rows.get(key);
    if (!row || row.windowStartMs <= nowMs - windowSec * 1000) {
      this.rows.set(key, { windowStartMs: nowMs, count: 1 });
      return { count: 1, resetAtMs: nowMs + windowSec * 1000 };
    }
    row.count += 1;
    return { count: row.count, resetAtMs: row.windowStartMs + windowSec * 1000 };
  }
  async purgeOld(): Promise<void> { /* not needed */ }
}

interface FakeRoute { status: number; body: unknown }
function fakeFetch(routes: Record<string, FakeRoute>, calls: string[]): FetchLike {
  return async (url: string) => {
    calls.push(url);
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    const route = key ? routes[key] : { status: 404, body: { error: 'not found' } };
    return { ok: route.status >= 200 && route.status < 300, status: route.status, json: async () => route.body };
  };
}

// ─── Fabricated Apple keys and tokens ────────────────────────────────────────

function rsaPair(): { privateKey: KeyObject; publicJwk: { n: string; e: string } } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  if (typeof jwk.n !== 'string' || typeof jwk.e !== 'string') throw new Error('jwk export failed');
  return { privateKey, publicJwk: { n: jwk.n, e: jwk.e } };
}

function b64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function makeJwt(header: Record<string, unknown>, payload: Record<string, unknown>, key: KeyObject): string {
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const sig = cryptoSign('RSA-SHA256', new Uint8Array(Buffer.from(signingInput)), key).toString('base64url');
  return `${signingInput}.${sig}`;
}

const T0 = Date.UTC(2026, 10, 13, 10, 0, 0);
const NOW_SEC = Math.floor(T0 / 1000);
const BUNDLE_ID = 'com.finplay.app';

const apple = rsaPair();
const attacker = rsaPair();
const rotated = rsaPair();
const appleJwk: AppleJwk = { kty: 'RSA', kid: 'apple-k1', alg: 'RS256', use: 'sig', ...apple.publicJwk };
const rotatedJwk: AppleJwk = { kty: 'RSA', kid: 'apple-k2', alg: 'RS256', use: 'sig', ...rotated.publicJwk };

function appleToken(overrides: Record<string, unknown> = {}, opts: { key?: KeyObject; kid?: string; alg?: string } = {}): string {
  return makeJwt(
    { alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'apple-k1' },
    {
      iss: 'https://appleid.apple.com',
      aud: BUNDLE_ID,
      exp: NOW_SEC + 600,
      iat: NOW_SEC - 10,
      sub: '001234.apple-user.0001',
      email: 'kid@privaterelay.appleid.com',
      email_verified: 'true',
      ...overrides,
    },
    opts.key ?? apple.privateKey,
  );
}

// ─── Harness ─────────────────────────────────────────────────────────────────

const WEB_ID = '847177819309-j90v0224p3lp8hio693cikmktd77mqp1.apps.googleusercontent.com';
const IOS_ID = '847177819309-mbb8nusv6r17oot0e49e1npbgmaecps0.apps.googleusercontent.com';
const FOREIGN_ID = '999999999999-someoneelse.apps.googleusercontent.com';
const SECRET = 'test-secret';

interface Harness {
  clock: { now: number };
  emailCodes: MemoryEmailCodeStore;
  rateLimits: MemoryRateLimitStore;
  profileCalls: ResolvedCredential[];
  fetchCalls: string[];
  sent: { email: string; code: string }[];
  verifyDeps: VerifyDeps<{ id: string; authId: string }>;
  codeDeps: (opts?: { code?: string; sendFails?: boolean }) => EmailCodeDeps;
}

function harness(opts: { googleRoutes?: Record<string, FakeRoute>; appleKeySets?: AppleJwk[][] } = {}): Harness {
  const clock = { now: T0 };
  const emailCodes = new MemoryEmailCodeStore();
  const rateLimits = new MemoryRateLimitStore();
  const profileCalls: ResolvedCredential[] = [];
  const fetchCalls: string[] = [];
  const sent: { email: string; code: string }[] = [];
  const keySets = opts.appleKeySets ?? [[appleJwk]];
  let keyFetches = 0;
  const verifyDeps: VerifyDeps<{ id: string; authId: string }> = {
    emailCodes,
    rateLimits,
    emailCodeSecret: () => SECRET,
    getAppleKeys: async ({ forceRefresh }) => {
      if (forceRefresh) keyFetches++;
      return keySets[Math.min(keyFetches, keySets.length - 1)];
    },
    appleAudiences: [BUNDLE_ID],
    googleClientIds: [WEB_ID, IOS_ID],
    fetchImpl: fakeFetch(opts.googleRoutes ?? {}, fetchCalls),
    now: () => clock.now,
    findOrCreateProfile: async (cred) => {
      profileCalls.push(cred);
      return { id: `user-${cred.subject}`, authId: cred.email ?? cred.subject };
    },
    mintSession: (p) => `session-for-${p.id}`,
  };
  const codeDeps = (o: { code?: string; sendFails?: boolean } = {}): EmailCodeDeps => ({
    emailCodes,
    rateLimits,
    emailCodeSecret: () => SECRET,
    now: () => clock.now,
    generateCode: () => o.code ?? '123456',
    sendCode: async (email, code) => {
      if (o.sendFails) return { ok: false, reason: 'send_failed' };
      sent.push({ email, code });
      return { ok: true };
    },
  });
  return { clock, emailCodes, rateLimits, profileCalls, fetchCalls, sent, verifyDeps, codeDeps };
}

function noSession(r: AuthResponse): boolean {
  return !('profile' in r.body) && !('token' in r.body) && !('syncToken' in r.body);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

(async () => {
  const IP = '203.0.113.7';

  console.log('\n── Email: one-time code ──');
  {
    const h = harness();
    const email = 'kid@example.com';

    const noCode = await handleVerify({ provider: 'email', email }, IP, h.verifyDeps);
    check(noCode.status === 401 && noCode.body.code === 'EMAIL_CODE_REQUIRED', 'email without code → 401 EMAIL_CODE_REQUIRED', noCode);
    check(noSession(noCode), 'email without code → no profile, no token');
    check(h.profileCalls.length === 0, 'email without code → profile never looked up');

    const noCodeOnFile = await handleVerify({ provider: 'email', email, code: '123456' }, IP, h.verifyDeps);
    check(noCodeOnFile.status === 401 && noCodeOnFile.body.code === 'EMAIL_CODE_INVALID', 'code never requested → 401', noCodeOnFile);

    const req1 = await handleEmailCodeRequest({ email: '  Kid@Example.COM ' }, IP, h.codeDeps());
    check(req1.status === 200 && req1.body.resendAfterSec === 30, 'request code → 200, resendAfterSec 30', req1);
    check(h.sent.length === 1 && h.sent[0].email === email && h.sent[0].code === '123456', 'code mailed to the normalized address');
    const row = await h.emailCodes.get(email);
    check(!!row && row.codeHash !== '123456' && row.codeHash === hashEmailCode(email, '123456', SECRET), 'only the HMAC of the code is stored');
    check(!!row && row.expiresAtMs === T0 + 10 * 60 * 1000, 'code expires after 10 minutes');

    const wrong = await handleVerify({ provider: 'email', email, code: '000000' }, IP, h.verifyDeps);
    check(wrong.status === 401 && wrong.body.code === 'EMAIL_CODE_INVALID' && wrong.body.attemptsLeft === 4, 'wrong code → 401, attemptsLeft 4', wrong);
    check(noSession(wrong), 'wrong code → no profile, no token');
    check((await h.emailCodes.get(email))?.attempts === 1, 'wrong code → attempt counted (attempts = 1)');

    const malformed = await handleVerify({ provider: 'email', email, code: '12ab' }, IP, h.verifyDeps);
    check(malformed.status === 401 && (await h.emailCodes.get(email))?.attempts === 1, 'malformed code → 401 without burning an attempt', malformed);

    const ok = await handleVerify({ provider: 'email', email: 'KID@example.com', code: '123456', displayName: 'נועה' }, IP, h.verifyDeps);
    check(ok.status === 200 && ok.body.ok === true && ok.body.token === `session-for-user-${email}`, 'correct code → 200 with session token', ok);
    const cred = h.profileCalls[h.profileCalls.length - 1];
    check(!!cred && cred.provider === 'email' && cred.subject === email && cred.emailVerified && cred.displayName === 'נועה', 'correct code → verified email credential', cred);
    check((await h.emailCodes.get(email)) === null, 'correct code → code consumed');

    const reuse = await handleVerify({ provider: 'email', email, code: '123456' }, IP, h.verifyDeps);
    check(reuse.status === 401 && noSession(reuse), 'reusing a consumed code → 401', reuse);
  }

  {
    const h = harness();
    const email = 'late@example.com';
    await handleEmailCodeRequest({ email }, IP, h.codeDeps({ code: '246810' }));
    h.clock.now = T0 + 10 * 60 * 1000 + 1000;
    const expired = await handleVerify({ provider: 'email', email, code: '246810' }, IP, h.verifyDeps);
    check(expired.status === 401 && expired.body.code === 'EMAIL_CODE_EXPIRED' && noSession(expired), 'expired code (10 min + 1 s) → 401 EMAIL_CODE_EXPIRED', expired);
  }

  {
    const h = harness();
    const email = 'guesser@example.com';
    await handleEmailCodeRequest({ email }, IP, h.codeDeps({ code: '111111' }));
    const lefts: unknown[] = [];
    for (let i = 0; i < EMAIL_CODE_MAX_ATTEMPTS; i++) {
      const r = await handleVerify({ provider: 'email', email, code: String(200000 + i) }, IP, h.verifyDeps);
      lefts.push(r.body.attemptsLeft);
    }
    check(JSON.stringify(lefts) === JSON.stringify([4, 3, 2, 1, 0]), 'five wrong guesses → attemptsLeft 4,3,2,1,0', lefts);
    const sixth = await handleVerify({ provider: 'email', email, code: '111111' }, IP, h.verifyDeps);
    check(sixth.status === 401 && sixth.body.code === 'EMAIL_CODE_TOO_MANY_ATTEMPTS' && noSession(sixth), 'right code after 5 wrong ones → 401 EMAIL_CODE_TOO_MANY_ATTEMPTS', sixth);
  }

  {
    const h = harness();
    const email = 'fifth@example.com';
    await handleEmailCodeRequest({ email }, IP, h.codeDeps({ code: '555555' }));
    for (let i = 0; i < EMAIL_CODE_MAX_ATTEMPTS - 1; i++) {
      await handleVerify({ provider: 'email', email, code: String(300000 + i) }, IP, h.verifyDeps);
    }
    const fifth = await handleVerify({ provider: 'email', email, code: '555555' }, IP, h.verifyDeps);
    check(fifth.status === 200, 'right code on the 5th attempt → 200', fifth);
  }

  console.log('\n── Email: sending and throttles ──');
  {
    const h = harness();
    const a = await handleEmailCodeRequest({ email: 'exists@example.com' }, IP, h.codeDeps());
    const b = await handleEmailCodeRequest({ email: 'nobody-here@example.com' }, IP, h.codeDeps());
    check(a.status === b.status && JSON.stringify(a.body) === JSON.stringify(b.body), 'same response for any address (no account lookup)', { a, b });

    const again = await handleEmailCodeRequest({ email: 'exists@example.com' }, IP, h.codeDeps());
    const after = typeof again.body.retryAfterSec === 'number' ? again.body.retryAfterSec : -1;
    check(again.status === 429 && again.body.code === 'RATE_LIMITED' && after > 0 && after <= 30, 'second code within 30 s → 429 with retryAfterSec', again);

    h.clock.now += 31 * 1000;
    const resent = await handleEmailCodeRequest({ email: 'exists@example.com' }, IP, h.codeDeps({ code: '654321' }));
    check(resent.status === 200, 'resend after 30 s → 200', resent);
    const oldCode = await handleVerify({ provider: 'email', email: 'exists@example.com', code: '123456' }, IP, h.verifyDeps);
    check(oldCode.status === 401, 'a resend replaces the previous code', oldCode);

    const bad = await handleEmailCodeRequest({ email: 'not-an-email' }, IP, h.codeDeps());
    check(bad.status === 400 && bad.body.code === 'INVALID_EMAIL', 'invalid address → 400', bad);
  }

  {
    const h = harness();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await handleEmailCodeRequest({ email: 'busy@example.com' }, `198.51.100.${i}`, h.codeDeps());
      statuses.push(r.status);
      h.clock.now += 31 * 1000;
    }
    check(JSON.stringify(statuses) === JSON.stringify([200, 200, 200, 200, 200, 200, 429]), '7th code for one address within an hour → 429 (from different IPs)', statuses);
  }

  {
    const h = harness();
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const r = await handleEmailCodeRequest({ email: `user${i}@example.com` }, IP, h.codeDeps());
      statuses.push(r.status);
    }
    check(statuses.slice(0, 20).every((s) => s === 200) && statuses[20] === 429, '21st code from one IP within 15 min → 429', statuses);
  }

  {
    const h = harness();
    const failedSend = await handleEmailCodeRequest({ email: 'bounce@example.com' }, IP, h.codeDeps({ sendFails: true }));
    check(failedSend.status === 503 && failedSend.body.code === 'EMAIL_SEND_FAILED', 'mail provider failure → 503 EMAIL_SEND_FAILED', failedSend);
    check((await h.emailCodes.get('bounce@example.com')) === null, 'failed send leaves no code behind');
    const retry = await handleEmailCodeRequest({ email: 'bounce@example.com' }, IP, h.codeDeps());
    check(retry.status === 200, 'immediate retry after a failed send → 200', retry);
  }

  {
    const h = harness();
    await handleEmailCodeRequest({ email: 'target@example.com' }, IP, h.codeDeps({ code: '999999' }));
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      // Spread over several addresses so the per-code 5-attempt cap isn't what stops it.
      const r = await handleVerify({ provider: 'email', email: `t${i % 6}@example.com`, code: '000001' }, IP, h.verifyDeps);
      statuses.push(r.status);
    }
    check(statuses.slice(0, 30).every((s) => s === 401) && statuses[30] === 429, '31st email-code guess from one IP within 15 min → 429', statuses);
  }

  console.log('\n── Apple: identity token ──');
  {
    const keys = [appleJwk];
    const base = { keys, audiences: [BUNDLE_ID], nowSec: NOW_SEC };
    const good = verifyAppleIdentityToken(appleToken(), { ...base, expectedSub: '001234.apple-user.0001' });
    check(good.ok && good.sub === '001234.apple-user.0001' && good.emailVerified, 'valid token → ok, sub from token', good);

    const forged = verifyAppleIdentityToken(appleToken({}, { key: attacker.privateKey }), base);
    check(!forged.ok && forged.reason === 'bad_signature', 'token signed with another key (same kid) → bad_signature', forged);

    const tampered = appleToken();
    const [h1, , s1] = tampered.split('.');
    const swapped = `${h1}.${b64url({ iss: 'https://appleid.apple.com', aud: BUNDLE_ID, exp: NOW_SEC + 600, sub: 'victim' })}.${s1}`;
    const tamperedRes = verifyAppleIdentityToken(swapped, base);
    check(!tamperedRes.ok && tamperedRes.reason === 'bad_signature', 'payload edited after signing → bad_signature', tamperedRes);

    const wrongAud = verifyAppleIdentityToken(appleToken({ aud: 'com.other.app' }), base);
    check(!wrongAud.ok && wrongAud.reason === 'bad_audience', 'token for another app (aud) → bad_audience', wrongAud);

    const mismatch = verifyAppleIdentityToken(appleToken(), { ...base, expectedSub: '009999.someone-else' });
    check(!mismatch.ok && mismatch.reason === 'sub_mismatch', 'claimed user id ≠ token sub → sub_mismatch', mismatch);

    const expired = verifyAppleIdentityToken(appleToken({ exp: NOW_SEC - 120 }), base);
    check(!expired.ok && expired.reason === 'expired', 'expired token → expired', expired);

    const issuer = verifyAppleIdentityToken(appleToken({ iss: 'https://evil.example' }), base);
    check(!issuer.ok && issuer.reason === 'bad_issuer', 'wrong issuer → bad_issuer', issuer);

    const algNone = verifyAppleIdentityToken(appleToken({}, { alg: 'none' }), base);
    const algHs = verifyAppleIdentityToken(appleToken({}, { alg: 'HS256' }), base);
    check(!algNone.ok && algNone.reason === 'bad_alg' && !algHs.ok && algHs.reason === 'bad_alg', 'alg none / HS256 → bad_alg');

    const unknownKid = verifyAppleIdentityToken(appleToken({}, { kid: 'nope' }), base);
    check(!unknownKid.ok && unknownKid.reason === 'unknown_key', 'unknown kid → unknown_key', unknownKid);

    const garbage = verifyAppleIdentityToken('not-a-jwt', base);
    check(!garbage.ok && garbage.reason === 'malformed', 'garbage → malformed', garbage);
  }

  {
    const h = harness();
    const old = await handleVerify({ provider: 'apple', appleUserId: '001234.apple-user.0001', email: 'victim@example.com', displayName: 'x' }, IP, h.verifyDeps);
    check(old.status === 401 && old.body.code === 'APPLE_TOKEN_REQUIRED' && noSession(old), 'old-client Apple payload (no identityToken) → 401 APPLE_TOKEN_REQUIRED', old);

    const forged = await handleVerify({ provider: 'apple', identityToken: appleToken({}, { key: attacker.privateKey }) }, IP, h.verifyDeps);
    check(forged.status === 401 && forged.body.code === 'APPLE_TOKEN_INVALID' && noSession(forged), 'Apple bad signature → 401', forged);

    const aud = await handleVerify({ provider: 'apple', identityToken: appleToken({ aud: 'com.other.app' }) }, IP, h.verifyDeps);
    check(aud.status === 401 && noSession(aud), 'Apple wrong audience → 401', aud);

    const sub = await handleVerify({ provider: 'apple', identityToken: appleToken(), appleUserId: '009999.someone-else' }, IP, h.verifyDeps);
    check(sub.status === 401 && noSession(sub), 'Apple mismatched sub → 401', sub);

    const good = await handleVerify({ provider: 'apple', identityToken: appleToken(), appleUserId: '001234.apple-user.0001', email: 'victim@example.com', displayName: 'נוי' }, IP, h.verifyDeps);
    const cred = h.profileCalls[h.profileCalls.length - 1];
    check(good.status === 200 && typeof good.body.token === 'string', 'Apple valid token → 200 with session', good);
    check(!!cred && cred.subject === '001234.apple-user.0001' && cred.email === 'kid@privaterelay.appleid.com', 'Apple: identity = token sub; email from the token, client-sent email ignored', cred);
  }

  {
    const h = harness({ appleKeySets: [[appleJwk], [appleJwk, rotatedJwk]] });
    const r = await handleVerify({ provider: 'apple', identityToken: appleToken({}, { key: rotated.privateKey, kid: 'apple-k2' }) }, IP, h.verifyDeps);
    check(r.status === 200, 'Apple key rotation: unknown kid triggers one JWKS refresh → 200', r);
  }

  console.log('\n── Google: audience ──');
  {
    const calls: string[] = [];
    const idForeign = await resolveGoogleToken('a.b.c', {
      clientIds: [WEB_ID, IOS_ID],
      fetchImpl: fakeFetch({ 'https://oauth2.googleapis.com/tokeninfo?id_token=': { status: 200, body: { iss: 'https://accounts.google.com', aud: FOREIGN_ID, azp: FOREIGN_ID, sub: 'g-1', email: 'a@gmail.com', email_verified: 'true' } } }, calls),
    });
    check(!idForeign.ok && idForeign.reason === 'foreign_audience', 'id_token for a foreign client → foreign_audience', idForeign);

    const idOurs = await resolveGoogleToken('a.b.c', {
      clientIds: [WEB_ID, IOS_ID],
      fetchImpl: fakeFetch({ 'https://oauth2.googleapis.com/tokeninfo?id_token=': { status: 200, body: { iss: 'accounts.google.com', aud: IOS_ID, sub: 'g-1', email: 'a@gmail.com', email_verified: 'true', name: 'A' } } }, calls),
    });
    check(idOurs.ok && idOurs.sub === 'g-1' && idOurs.emailVerified, 'id_token for our iOS client → ok', idOurs);

    const accessCalls: string[] = [];
    const accessForeign = await resolveGoogleToken('ya29.opaque', {
      clientIds: [WEB_ID, IOS_ID],
      fetchImpl: fakeFetch({
        'https://oauth2.googleapis.com/tokeninfo?access_token=': { status: 200, body: { aud: FOREIGN_ID, azp: FOREIGN_ID, sub: 'g-2', email: 'b@gmail.com', email_verified: 'true' } },
        'https://www.googleapis.com/userinfo/v2/me': { status: 200, body: { id: 'g-2', email: 'b@gmail.com' } },
      }, accessCalls),
    });
    check(!accessForeign.ok && accessForeign.reason === 'foreign_audience', 'access_token for a foreign client → foreign_audience', accessForeign);
    check(!accessCalls.some((u) => u.includes('userinfo')), 'foreign access_token: userinfo is never trusted (not even called)', accessCalls);

    const accessMismatch = await resolveGoogleToken('ya29.opaque', {
      clientIds: [WEB_ID, IOS_ID],
      fetchImpl: fakeFetch({
        'https://oauth2.googleapis.com/tokeninfo?access_token=': { status: 200, body: { aud: IOS_ID, azp: IOS_ID, sub: 'g-3' } },
        'https://www.googleapis.com/userinfo/v2/me': { status: 200, body: { id: 'g-other' } },
      }, []),
    });
    check(!accessMismatch.ok && accessMismatch.reason === 'userinfo_mismatch', 'access_token: userinfo id ≠ tokeninfo sub → rejected', accessMismatch);

    const rejected = await resolveGoogleToken('ya29.bad', {
      clientIds: [WEB_ID],
      fetchImpl: fakeFetch({ 'https://oauth2.googleapis.com/tokeninfo?access_token=': { status: 400, body: { error: 'invalid_token' } } }, []),
    });
    check(!rejected.ok && rejected.reason === 'rejected_by_google', 'token Google rejects → rejected_by_google', rejected);
  }

  {
    const h = harness({
      googleRoutes: {
        'https://oauth2.googleapis.com/tokeninfo?access_token=': { status: 200, body: { aud: FOREIGN_ID, azp: FOREIGN_ID, sub: 'g-9', email: 'victim@gmail.com', email_verified: 'true' } },
        'https://www.googleapis.com/userinfo/v2/me': { status: 200, body: { id: 'g-9', email: 'victim@gmail.com', name: 'Victim' } },
      },
    });
    const r = await handleVerify({ provider: 'google', token: 'ya29.foreign' }, IP, h.verifyDeps);
    check(r.status === 401 && r.body.code === 'GOOGLE_TOKEN_INVALID' && noSession(r), 'Google token with a foreign audience → 401 from /verify', r);
    check(h.profileCalls.length === 0, 'foreign Google token → profile never looked up');
  }

  {
    const h = harness({
      googleRoutes: {
        'https://oauth2.googleapis.com/tokeninfo?access_token=': { status: 200, body: { aud: IOS_ID, azp: IOS_ID, sub: 'g-10', email: 'Real@Gmail.com', email_verified: 'false' } },
        'https://www.googleapis.com/userinfo/v2/me': { status: 200, body: { id: 'g-10', email: 'Real@Gmail.com', verified_email: false, name: 'R' } },
      },
    });
    const r = await handleVerify({ provider: 'google', token: 'ya29.ours' }, IP, h.verifyDeps);
    const cred = h.profileCalls[0];
    check(r.status === 200 && !!cred && cred.subject === 'g-10' && cred.email === null && !cred.emailVerified, 'our Google token with an UNVERIFIED email → signs in by sub, email not used for linking', { r, cred });
  }

  console.log('\n── Helpers ──');
  check(normalizeEmail('  A.B@Example.Co.IL ') === 'a.b@example.co.il', 'normalizeEmail trims + lowercases');
  check(normalizeEmail('no-at-sign') === null && normalizeEmail(42) === null, 'normalizeEmail rejects junk');
  check(hashEmailCode('a@b.co', '123456', 's1') !== hashEmailCode('a@b.co', '123456', 's2'), 'code hash depends on the server secret');
  const stored = { codeHash: hashEmailCode('a@b.co', '123456', SECRET), expiresAtMs: T0 + 1000, attempts: 1 };
  check(checkEmailCode(stored, hashEmailCode('a@b.co', '123456', SECRET), T0) === 'ok', 'checkEmailCode ok');
  check(checkEmailCode(stored, hashEmailCode('a@b.co', '123457', SECRET), T0) === 'wrong_code', 'checkEmailCode wrong_code');
  check(checkEmailCode(stored, stored.codeHash, T0 + 1000) === 'expired', 'checkEmailCode expired at the expiry instant');
  check(checkEmailCode({ ...stored, attempts: 6 }, stored.codeHash, T0) === 'too_many_attempts', 'checkEmailCode refuses the 6th attempt');

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})().catch((err: unknown) => {
  console.error('FAIL: test run threw', err);
  process.exit(1);
});
