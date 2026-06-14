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

// EU project (176605). The default MUST be the EU ingestion host: this webhook
// runs in the Vercel function runtime, which often LACKS EXPO_PUBLIC_POSTHOG_HOST
// (an EXPO_PUBLIC_* var baked into the CLIENT build, not the server env). A US
// default silently shipped every server capture to the wrong region — 0
// `source='revenuecat_webhook'` events reached the EU project in 120 days, so
// trial→paid conversions / renewals / churn were entirely invisible. Moni 2026-06-13.
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

/**
 * Server-side PostHog event capture for the trial→paid conversion + renewal +
 * expiration paths that ONLY exist in the webhook flow. Client-side fires
 * `trial_started` / `subscription_purchased` at checkout, but anything that
 * happens AFTER the user closes the app (auto-renewal, trial conversion,
 * billing failure, EXPIRATION) is invisible to the client SDK. Without this
 * we'd see 0% trial→paid conversion forever in PostHog.
 *
 * Uses the public capture HTTP endpoint instead of posthog-node so we don't
 * add a new server dependency. Fire-and-forget on the network call — webhook
 * MUST always respond 200 to RC, so any PostHog error is swallowed.
 *
 * distinct_id = our userProfiles.id (UUID) — the SAME id the client passes to
 * RevenueCat via loginRevenueCat(profile.id) AND to PostHog via
 * identifyUser(profile.id), so server + client events merge onto one person.
 */
async function captureToPostHog(
  eventName: string,
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: eventName,
        distinct_id: distinctId,
        properties: { ...properties, source: 'revenuecat_webhook' },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[PostHog Webhook Capture]', err);
  }
}

interface RevenueCatEvent {
  type: string;
  // Usually our userProfiles.id (UUID): OAuth / email-login / cold-boot all set
  // it via loginRevenueCat(profile.id). The ONE exception is the email
  // REGISTRATION path (RegisterScreen), which has no server UUID yet and logs
  // RC in with the EMAIL instead — so resolveMatchClause below accepts both.
  app_user_id: string;
  product_id: string;
  entitlement_ids?: string[];
  purchased_at_ms: number;
  expiration_at_ms?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve which column the RC app_user_id matches on. The id column is a
 * Postgres `uuid` type — comparing it against a non-UUID string (e.g. an email
 * or a `$RCAnonymousID:…`) forces an invalid-uuid CAST error and 500s the whole
 * webhook, so we MUST branch on the format rather than `OR`-ing both columns.
 * UUID → userProfiles.id (the common path); anything else that looks like an
 * email → userProfiles.email (the in-session email-registration purchase). A
 * pure-anonymous RC id matches neither column → 0 rows, which is the correct
 * no-op (there is no account to grant to yet).
 */
function resolveMatchClause(appUserId: string) {
  if (UUID_RE.test(appUserId)) return eq(userProfiles.id, appUserId);
  return eq(userProfiles.email, appUserId);
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

    // RC `app_user_id` is USUALLY our userProfiles.id (UUID), set client-side
    // via loginRevenueCat(profile.id). The email-registration path is the one
    // exception (RC logged in with the email — no server UUID exists yet), so
    // we resolve the match column by format. Matching a UUID value against the
    // email column (the original pre-fix behaviour) silently updated 0 rows →
    // Pro/gems never granted; matching an email value against the uuid id column
    // 500s on the cast. resolveMatchClause handles both. See src/services/revenueCat.ts.
    const appUserId = event.app_user_id;
    const matchClause = resolveMatchClause(appUserId);
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
          .where(matchClause);

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
          .where(matchClause);

        console.log(`[RevenueCat Webhook] Granted PRO`);

        // PostHog: capture the lifecycle event server-side. Each RC type maps
        // to a distinct PostHog event so the funnel can distinguish "trial
        // converted to paid" (RENEWAL after a TRIAL) from "fresh subscriber"
        // (INITIAL_PURCHASE) and "win-back" (UNCANCELLATION).
        const eventNameByType: Record<string, string> = {
          INITIAL_PURCHASE: 'subscription_purchased',
          RENEWAL: 'subscription_renewed',
          UNCANCELLATION: 'subscription_uncancelled',
          TRANSFER: 'subscription_transferred',
        };
        const phEvent = eventNameByType[event.type];
        if (phEvent) {
          await captureToPostHog(phEvent, appUserId, {
            rc_event_type: event.type,
            product_id: event.product_id,
            entitlement: 'FinPlay Pro',
            expires_at: expiresAt,
            purchased_at_ms: event.purchased_at_ms,
          });
        }
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
          .where(matchClause);

        console.log(`[RevenueCat Webhook] Revoked PRO`);

        // PostHog: capture revocation. EXPIRATION = subscription period ended
        // and the user didn't renew (churn). BILLING_ISSUE = the payment
        // method failed — distinct from voluntary churn for funnel purposes.
        await captureToPostHog(
          event.type === 'BILLING_ISSUE' ? 'subscription_billing_issue' : 'subscription_expired',
          appUserId,
          {
            rc_event_type: event.type,
            product_id: event.product_id,
            entitlement: 'FinPlay Pro',
          },
        );
      }
    } else if (event.type === 'CANCELLATION') {
      // CANCELLATION: user toggled OFF auto-renew but still has time on the
      // current period. Important early signal for trial cohorts — a trial
      // cancellation usually means the user will NOT convert. Persist the
      // signal for the funnel; do NOT flip isPro (entitlement still active).
      if (isProEvent) {
        await captureToPostHog('subscription_cancelled', appUserId, {
          rc_event_type: event.type,
          product_id: event.product_id,
          entitlement: 'FinPlay Pro',
        });
      }
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[RevenueCat Webhook Error]', err);
    return Response.json({ error: message }, { status: 500 });
  }
}
