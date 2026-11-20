// api/sync/subscription.ts
//
// GET  → { ok, subscription: { isPro, proExpiresAt, proSource } | null }
// POST { isPro, proExpiresAt? } → same shape, the server's state after the call.
//
// POST rules (api/_shared/subscriptionSync.ts): the app can no longer make an
// account Pro on its own word (RevenueCat must confirm, or the purchase
// webhook must have landed), can no longer remove or shorten a Pro granted on
// the server (promotional / manual / gift), and its expiry is never written
// over an active Pro. Store-sourced Pro still follows the device's "not Pro".
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { createSubscriptionDeps } from '../_shared/economyStores';
import { applyExpiry, handleSubscriptionPost } from '../_shared/subscriptionSync';
import { withAuth } from '../_shared/withAuth';

const SUBSCRIPTION_COLUMNS = {
  isPro: userProfiles.isPro,
  proExpiresAt: userProfiles.proExpiresAt,
  proSource: userProfiles.proSource,
};

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const db = getDb();
    const rows = await db
      .select(SUBSCRIPTION_COLUMNS)
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    // Report-only expiry guard: no DB write here — the webhook stays the
    // writer; this endpoint just tells the truth.
    return res.status(200).json({ ok: true, subscription: applyExpiry(rows[0]) });
  }

  if (req.method === 'POST') {
    const result = await handleSubscriptionPost(ctx.userId, req.body ?? {}, createSubscriptionDeps());
    return res.status(result.status).json(result.body);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
