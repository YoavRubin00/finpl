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

interface SubscriptionRow {
  isPro: boolean | null;
  proExpiresAt: string | null;
  proSource: string | null;
}

const SUBSCRIPTION_COLUMNS = {
  isPro: userProfiles.isPro,
  proExpiresAt: userProfiles.proExpiresAt,
  proSource: userProfiles.proSource,
};

/**
 * Report-only expiry guard (Yoav 2026-07-19): a grant whose pro_expires_at is
 * in the past must never be REPORTED as Pro, even when is_pro=true is still
 * stored (e.g. a promotional entitlement whose EXPIRATION webhook was missed).
 * Deliberately NO DB write here — the webhook stays the single writer; this
 * endpoint just tells the truth.
 */
function applyExpiry(row: SubscriptionRow | undefined): SubscriptionRow | null {
  if (!row) return null;
  const expired =
    row.proExpiresAt !== null && new Date(row.proExpiresAt).getTime() <= Date.now();
  return expired ? { ...row, isPro: false } : row;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select(SUBSCRIPTION_COLUMNS)
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, subscription: applyExpiry(rows[0]) });
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
      .select(SUBSCRIPTION_COLUMNS)
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, subscription: applyExpiry(rows[0]) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
