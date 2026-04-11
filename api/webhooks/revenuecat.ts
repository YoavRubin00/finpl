import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import { GEM_BUNDLES } from '../../src/features/shop/gemBundles';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlConnection = neon(url);
  return drizzle(sqlConnection);
}

const RC_WEBHOOK_SECRET = process.env.EXPO_PUBLIC_RC_WEBHOOK_SECRET;

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  entitlement_ids?: string[];
  purchased_at_ms: number;
  expiration_at_ms?: number;
}

interface WebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (
      RC_WEBHOOK_SECRET &&
      authHeader !== `Bearer ${RC_WEBHOOK_SECRET}` &&
      authHeader !== RC_WEBHOOK_SECRET
    ) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body as WebhookBody;
    const { event } = body;

    if (!event || !event.app_user_id) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const email = event.app_user_id;
    const db = getDb();

    console.log(`[RevenueCat Webhook] Webhook received: ${event.type} for ${email}`);

    // Handle gem bundle purchases (consumables)
    if (event.type === 'NON_RENEWING_PURCHASE') {
      const productId = event.product_id;
      let gemsToAdd = 0;
      const match = productId.match(/\d+$/);
      if (match) {
        gemsToAdd = parseInt(match[0], 10);
      } else {
        const matchedBundle = GEM_BUNDLES.find((b) => b.id === productId);
        if (matchedBundle) gemsToAdd = matchedBundle.gems;
      }

      if (gemsToAdd > 0) {
        await db
          .update(userProfiles)
          .set({
            gems: sql`${userProfiles.gems} + ${gemsToAdd}`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userProfiles.email, email));

        console.log(`[RevenueCat Webhook] Added ${gemsToAdd} gems to ${email}`);
        return res.status(200).json({ ok: true, message: `Added ${gemsToAdd} gems` });
      }
    }

    // Handle Pro subscriptions
    const isProEvent = event.entitlement_ids?.includes('FinPlay Pro');

    if (
      event.type === 'INITIAL_PURCHASE' ||
      event.type === 'RENEWAL' ||
      event.type === 'UNCANCELLATION' ||
      event.type === 'TRANSFER'
    ) {
      if (isProEvent) {
        const expiresAt = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
        await db
          .update(userProfiles)
          .set({
            isPro: true,
            proExpiresAt: expiresAt,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userProfiles.email, email));

        console.log(`[RevenueCat Webhook] Granted PRO to ${email}`);
      }
    } else if (event.type === 'EXPIRATION' || event.type === 'BILLING_ISSUE') {
      if (isProEvent) {
        await db
          .update(userProfiles)
          .set({
            isPro: false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userProfiles.email, email));

        console.log(`[RevenueCat Webhook] Revoked PRO from ${email}`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[RevenueCat Webhook Error]', err);
    return res.status(500).json({ error: message });
  }
}
