import { eq, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { GEM_BUNDLES } from '../../../src/features/shop/gemBundles';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  const sqlConnection = neon(url);
  return drizzle(sqlConnection);
}

const RC_WEBHOOK_SECRET = process.env.RC_WEBHOOK_SECRET;

interface RevenueCatEvent {
  type: string;
  app_user_id: string; // our email
  product_id: string;
  entitlement_ids?: string[];
  purchased_at_ms: number;
  expiration_at_ms?: number;
}

interface WebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Secure the endpoint, reject immediately if secret not configured
    if (!RC_WEBHOOK_SECRET) {
      return Response.json({ error: 'Webhook not configured' }, { status: 401 });
    }
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${RC_WEBHOOK_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as WebhookBody;
    const { event } = body;
    
    if (!event || !event.app_user_id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const email = event.app_user_id;
    const db = getDb();

    console.log(`[RevenueCat Webhook] ${event.type}`);

    // Check if it's a gem bundle (Consumables = NON_RENEWING_PURCHASE)
    if (event.type === 'NON_RENEWING_PURCHASE') {
      const productId = event.product_id;
      // In GEM_BUNDLES, we have `id` like 'gems-wagon'. In the store it's 'finplay_gems_6500'.
      // Based on our implementation, `purchaseGemBundle` uses `GEM_PRODUCT_IDS` mapper.
      // But we can extract the gem count directly if we standardise the RC product schema to include the exact amount
      // Since 'finplay_gems_1200' is the format, we can parse it, OR we can map back.
      let gemsToAdd = 0;
      const match = productId.match(/\d+$/);
      if (match) {
        gemsToAdd = parseInt(match[0], 10);
      } else {
        // Fallback for cases where productId is exact bundle ID (dev mode testing)
        const matchedBundle = GEM_BUNDLES.find(b => b.id === productId);
        if (matchedBundle) gemsToAdd = matchedBundle.gems;
      }

      if (gemsToAdd > 0) {
        // Increment the gems securely in DB using SQL expression
        await db
          .update(userProfiles)
          .set({ 
            gems: sql`${userProfiles.gems} + ${gemsToAdd}`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(userProfiles.email, email));

        console.log(`[RevenueCat Webhook] Added ${gemsToAdd} gems`);
        return Response.json({ ok: true, message: `Added ${gemsToAdd} gems` });
      }
    }

    // Handle Pro Subscriptions
    const isProEvent = event.entitlement_ids?.includes('FinPlay Pro');
    
    if (
      event.type === 'INITIAL_PURCHASE' ||
      event.type === 'RENEWAL' ||
      event.type === 'UNCANCELLATION' ||
      event.type === 'TRANSFER'
    ) {
      if (isProEvent) {
        const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
        await db
          .update(userProfiles)
          .set({ 
            isPro: true, 
            proExpiresAt: expiresAt,
            updatedAt: new Date().toISOString()
          })
          .where(eq(userProfiles.email, email));
          
        console.log(`[RevenueCat Webhook] Granted PRO`);
      }
    } else if (event.type === 'EXPIRATION' || event.type === 'BILLING_ISSUE') {
      // Entitlement has actually expired (CANCELLATION does not expire immediately)
      if (isProEvent) {
        await db
          .update(userProfiles)
          .set({ 
            isPro: false,
            updatedAt: new Date().toISOString()
          })
          .where(eq(userProfiles.email, email));
          
        console.log(`[RevenueCat Webhook] Revoked PRO`);
      }
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[RevenueCat Webhook Error]', err);
    return Response.json({ error: message }, { status: 500 });
  }
}
