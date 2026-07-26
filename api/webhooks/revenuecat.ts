import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import { GEM_BUNDLES } from '../../src/features/shop/gemBundles';
import { capturePostHog } from '../_shared/posthogCapture';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlConnection = neon(url);
  return drizzle(sqlConnection);
}

// Accept either the clean server var or the EXPO_PUBLIC client var (back-compat
// with .env.example). RC may send the secret as a raw header or as `Bearer …`.
const RC_WEBHOOK_SECRET =
  process.env.RC_WEBHOOK_SECRET ?? process.env.EXPO_PUBLIC_RC_WEBHOOK_SECRET;

interface RevenueCatEvent {
  type: string;
  // Usually our userProfiles.id (UUID), set client-side via
  // loginRevenueCat(profile.id). The email-registration path is the one
  // exception (no server UUID yet) and logs RC in with the EMAIL instead.
  app_user_id: string;
  product_id: string;
  entitlement_ids?: string[];
  purchased_at_ms: number;
  expiration_at_ms?: number;
  // Lets the funnel separate a trial start from a real paid conversion.
  period_type?: string; // 'TRIAL' | 'NORMAL' | 'INTRO' …
  is_trial_conversion?: boolean;
}

interface WebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve which column the RC app_user_id matches on. The id column is a
 * Postgres `uuid` — comparing it against a non-UUID string (email /
 * `$RCAnonymousID:…`) forces an invalid-uuid CAST error that 500s the webhook,
 * so we branch on format rather than OR-ing both columns. UUID → id (common);
 * email-looking → email (in-session email registration); pure-anonymous → 0
 * rows (correct no-op, no account to grant yet). The PREVIOUS handler matched
 * ONLY on email, so the common UUID path silently updated 0 rows.
 */
function resolveMatchClause(appUserId: string) {
  if (UUID_RE.test(appUserId)) return eq(userProfiles.id, appUserId);
  return eq(userProfiles.email, appUserId);
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

    const appUserId = event.app_user_id;
    const matchClause = resolveMatchClause(appUserId);
    const db = getDb();

    console.log(`[RevenueCat Webhook] ${event.type} for ${appUserId}`);

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
          .where(matchClause);

        console.log(`[RevenueCat Webhook] Added ${gemsToAdd} gems`);
        return res.status(200).json({ ok: true, message: `Added ${gemsToAdd} gems` });
      }
    }

    // distinct_id for PostHog MUST be userProfiles.id (the UUID the client
    // passes to identifyUser), so server lifecycle events merge onto the same
    // person as in-app events. When RC sent the email, look the id up.
    let distinctId = appUserId;
    if (!UUID_RE.test(appUserId)) {
      const rows = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(matchClause)
        .limit(1);
      if (rows[0]?.id) distinctId = rows[0].id;
    }

    // Handle Pro subscriptions
    const isProEvent = event.entitlement_ids?.includes('FinPlay Pro');
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;
    const baseProps = {
      rc_event_type: event.type,
      product_id: event.product_id,
      entitlement: 'FinPlay Pro',
      period_type: event.period_type ?? null,
      is_trial_conversion: event.is_trial_conversion ?? null,
      source: 'revenuecat_webhook',
    };

    if (
      event.type === 'INITIAL_PURCHASE' ||
      event.type === 'RENEWAL' ||
      event.type === 'UNCANCELLATION' ||
      event.type === 'TRANSFER'
    ) {
      if (isProEvent) {
        // Promo-grant visibility (Yoav 2026-07-26): record HOW Pro was granted.
        // RC sends period_type 'PROMOTIONAL' for manual promotional
        // entitlements; the client uses this (via /api/sync/subscription) to
        // show the one-time "קיבלתם Pro במתנה" modal + the expiry banner.
        const proSource = event.period_type === 'PROMOTIONAL' ? 'promotional' : 'store';
        await db
          .update(userProfiles)
          .set({ isPro: true, proExpiresAt: expiresAt, proSource, updatedAt: new Date().toISOString() })
          .where(matchClause);
        console.log(`[RevenueCat Webhook] Granted PRO (${proSource})`);

        // Each RC type → a distinct PostHog event so the funnel can split
        // "trial converted to paid" (RENEWAL after a TRIAL) from "fresh
        // subscriber" (INITIAL_PURCHASE) and "win-back" (UNCANCELLATION).
        const eventNameByType: Record<string, string> = {
          INITIAL_PURCHASE: 'subscription_purchased',
          RENEWAL: 'subscription_renewed',
          UNCANCELLATION: 'subscription_uncancelled',
          TRANSFER: 'subscription_transferred',
        };
        const phEvent = eventNameByType[event.type];
        if (phEvent) {
          await capturePostHog(phEvent, distinctId, { ...baseProps, expires_at: expiresAt });
        }
      }
    } else if (event.type === 'EXPIRATION' || event.type === 'BILLING_ISSUE') {
      if (isProEvent) {
        await db
          .update(userProfiles)
          .set({ isPro: false, updatedAt: new Date().toISOString() })
          .where(matchClause);
        console.log(`[RevenueCat Webhook] Revoked PRO`);

        await capturePostHog(
          event.type === 'BILLING_ISSUE' ? 'subscription_billing_issue' : 'subscription_expired',
          distinctId,
          baseProps,
        );
      }
    } else if (event.type === 'CANCELLATION') {
      // User toggled OFF auto-renew but still has time on the period. Key early
      // churn signal for trial cohorts; do NOT flip isPro (entitlement active).
      if (isProEvent) {
        await capturePostHog('subscription_cancelled', distinctId, baseProps);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[RevenueCat Webhook Error]', err);
    return res.status(500).json({ error: message });
  }
}
