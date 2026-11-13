// api/auth/link.ts
// Attach a second sign-in provider to the signed-in account. The provider must
// prove the identity the same way as /api/auth/verify (2026-11-13): Apple needs
// a verified identity token, Google a token issued to one of our own clients.
// Before, a bare appleUserId was trusted, so a signed-in user could claim any
// Apple subject and capture that person's future Apple sign-ins.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';
import {
  appleTokenKid,
  getAppleAudiences,
  getGoogleClientIds,
  resolveGoogleToken,
  verifyAppleIdentityToken,
} from '../_shared/authProof';
import { getAppleKeys } from '../_shared/authDeps';

interface LinkBody {
  provider?: unknown;
  token?: unknown;          // google id_token / access_token
  identityToken?: unknown;  // apple identity token (JWT)
  appleUserId?: unknown;    // apple credential.user, must equal the token's sub
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body ?? {}) as LinkBody;
  const db = getDb();

  let subject: string | null = null;
  if (body.provider === 'google') {
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) return res.status(400).json({ ok: false, code: 'GOOGLE_TOKEN_REQUIRED', error: 'Missing Google token' });
    const result = await resolveGoogleToken(token, { clientIds: getGoogleClientIds(), fetchImpl: fetch });
    if (!result.ok) {
      console.warn(`[auth/link] google token rejected: reason=${result.reason}`);
      return res.status(401).json({ ok: false, code: 'GOOGLE_TOKEN_INVALID', error: 'Invalid Google token' });
    }
    subject = result.sub;
  } else if (body.provider === 'apple') {
    const identityToken = typeof body.identityToken === 'string' ? body.identityToken.trim() : '';
    if (!identityToken) {
      return res.status(401).json({ ok: false, code: 'APPLE_TOKEN_REQUIRED', error: 'Apple identity token is required' });
    }
    let keys = await getAppleKeys({ forceRefresh: false });
    const kid = appleTokenKid(identityToken);
    if (kid && !keys.some((k) => k.kid === kid)) keys = await getAppleKeys({ forceRefresh: true });
    const result = verifyAppleIdentityToken(identityToken, {
      keys,
      audiences: getAppleAudiences(),
      expectedSub: typeof body.appleUserId === 'string' ? body.appleUserId : null,
      nowSec: Math.floor(Date.now() / 1000),
    });
    if (!result.ok) {
      console.warn(`[auth/link] apple token rejected: reason=${result.reason}`);
      return res.status(401).json({ ok: false, code: 'APPLE_TOKEN_INVALID', error: 'Invalid Apple identity token' });
    }
    subject = result.sub;
  } else {
    return res.status(400).json({ ok: false, code: 'UNSUPPORTED_PROVIDER', error: 'Unsupported provider' });
  }

  // Reject if this subject already belongs to a DIFFERENT user.
  const col = body.provider === 'google' ? userProfiles.googleSub : userProfiles.appleSub;
  const existing = (await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(col, subject)).limit(1))[0];
  if (existing && existing.id !== ctx.userId) {
    return res.status(409).json({ error: 'This account is already linked to another user' });
  }

  const setFields: Partial<typeof userProfiles.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (body.provider === 'google') setFields.googleSub = subject;
  if (body.provider === 'apple') setFields.appleSub = subject;
  await db.update(userProfiles).set(setFields).where(eq(userProfiles.id, ctx.userId));

  const row = (await db.select().from(userProfiles).where(eq(userProfiles.id, ctx.userId)).limit(1))[0];
  return res.status(200).json({ ok: true, profile: row ?? null });
});
