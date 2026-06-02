// api/sync/subscription.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface SubscriptionSyncBody {
  isPro: boolean;
  proExpiresAt?: string | null;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select({
        isPro: userProfiles.isPro,
        proExpiresAt: userProfiles.proExpiresAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, subscription: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as SubscriptionSyncBody;
    if (typeof body.isPro !== 'boolean') {
      return res.status(400).json({ error: 'Missing isPro boolean' });
    }
    await db
      .update(userProfiles)
      .set({
        isPro: body.isPro,
        proExpiresAt: body.proExpiresAt ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.id, ctx.userId));

    const rows = await db
      .select({
        isPro: userProfiles.isPro,
        proExpiresAt: userProfiles.proExpiresAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, subscription: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
