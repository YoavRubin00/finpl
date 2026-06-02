// api/auth/link.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface LinkBody {
  provider: 'google' | 'apple';
  token?: string;        // google token
  appleUserId?: string;  // apple subject
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body ?? {}) as LinkBody;
  const db = getDb();

  let subject: string | null = null;
  if (body.provider === 'google') {
    if (!body.token) return res.status(400).json({ error: 'Missing Google token' });
    const isJwt = (body.token.match(/\./g) ?? []).length === 2;
    if (isJwt) {
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.token)}`);
      if (!r.ok) return res.status(401).json({ error: 'Invalid Google token' });
      subject = ((await r.json()) as { sub?: string }).sub ?? null;
    } else {
      const r = await fetch('https://www.googleapis.com/userinfo/v2/me', { headers: { Authorization: `Bearer ${body.token}` } });
      if (!r.ok) return res.status(401).json({ error: 'Invalid Google token' });
      subject = ((await r.json()) as { id?: string }).id ?? null;
    }
  } else if (body.provider === 'apple') {
    if (!body.appleUserId) return res.status(400).json({ error: 'Missing Apple identifier' });
    subject = body.appleUserId;
  } else {
    return res.status(400).json({ error: 'Unsupported provider' });
  }
  if (!subject) return res.status(401).json({ error: 'Could not resolve provider subject' });

  // Reject if this subject already belongs to a DIFFERENT user.
  const col = body.provider === 'google' ? userProfiles.googleSub : userProfiles.appleSub;
  const existing = (await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(col, subject)).limit(1))[0];
  if (existing && existing.id !== ctx.userId) {
    return res.status(409).json({ error: 'This account is already linked to another user' });
  }

  const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.provider === 'google') setFields.googleSub = subject;
  if (body.provider === 'apple') setFields.appleSub = subject;
  await db.update(userProfiles).set(setFields).where(eq(userProfiles.id, ctx.userId));

  const row = (await db.select().from(userProfiles).where(eq(userProfiles.id, ctx.userId)).limit(1))[0];
  return res.status(200).json({ ok: true, profile: row ?? null });
});
