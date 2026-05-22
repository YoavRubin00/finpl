// api/sync/profile.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface ProfileUpsertBody {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  preferences?: Record<string, unknown> | null;
  // Numeric fields are NOT accepted on /profile anymore.
  // Use /sync/economy with deltas instead. Prevents the legacy
  // Aviv-incident class of bug.
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const db = getDb();
    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, profile: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as ProfileUpsertBody;
    const db = getDb();

    const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.displayName !== undefined && body.displayName !== null) setFields.displayName = body.displayName;
    if (body.email !== undefined && body.email !== null) setFields.email = body.email;
    if (body.avatarUrl !== undefined && body.avatarUrl !== null) setFields.avatarUrl = body.avatarUrl;
    if (body.preferences !== undefined && body.preferences !== null) setFields.preferences = body.preferences;

    await db
      .update(userProfiles)
      .set(setFields)
      .where(eq(userProfiles.authId, ctx.authId));

    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, profile: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
