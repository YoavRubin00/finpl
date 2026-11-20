// api/sync/profile.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface ProfileUpsertBody {
  displayName?: string | null;
  // `email` is NOT accepted (2026-11-20). The address is written by the server
  // only, from a verified sign-in. A client-set email let a signed-in user put
  // someone else's address on their own row: sign-in falls back to matching by
  // lower(email), so that person could later land in the attacker's account,
  // and account deletion would have removed rows matched by that address. No
  // app build ever sent the field, and no production row differs from its
  // sign-in address (checked read-only before removing it).
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
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, profile: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as ProfileUpsertBody;
    const db = getDb();

    const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.displayName !== undefined && body.displayName !== null) setFields.displayName = body.displayName;
    if (body.avatarUrl !== undefined && body.avatarUrl !== null) setFields.avatarUrl = body.avatarUrl;
    if (body.preferences !== undefined && body.preferences !== null) setFields.preferences = body.preferences;

    // UPDATE … RETURNING (all columns, same keys as select()): one DB round
    // trip instead of UPDATE then SELECT.
    const rows = await db
      .update(userProfiles)
      .set(setFields)
      .where(eq(userProfiles.id, ctx.userId))
      .returning();
    return res.status(200).json({ ok: true, profile: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
