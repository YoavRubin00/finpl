import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { GEM_BUNDLES } from '../../src/features/shop/gemBundles';
import { capturePostHog } from '../_shared/posthogCapture';
import { getDb } from '../_shared/db';
import { runGuarded } from '../_shared/economyGuard';
import { creditPurchaseGems, economyStore, resolveProfileId } from '../_shared/economyStores';
import { candidateUserKeys, creditForProduct, type PurchaseCredit } from '../_shared/iapCredit';

// Accept either the clean server var or the EXPO_PUBLIC client var (back-compat
// with .env.example). RC may send the secret as a raw header or as `Bearer …`.
const RC_WEBHOOK_SECRET =
  process.env.RC_WEBHOOK_SECRET ?? process.env.EXPO_PUBLIC_RC_WEBHOOK_SECRET;

interface RevenueCatEvent {
  /** RevenueCat's unique event id (stable across redeliveries). */
  id?: string;
  type: string;
  // Usually our userProfiles.id (UUID), set client-side via
  // loginRevenueCat(profile.id). The email-registration path is the one
  // exception (no server UUID yet) and logs RC in with the EMAIL instead.
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id: string;
  transaction_id?: string;
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

/** Legacy fallback: a product id equal to one of our internal bundle ids. */
function legacyBundleCredit(productId: string): PurchaseCredit | null {
  const bundle = GEM_BUNDLES.find((b) => b.id === productId);
  return bundle ? { kind: 'gem_bundle', gems: bundle.gems, poolCoins: 0 } : null;
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
    const db = getDb();

    console.log(`[RevenueCat Webhook] ${event.type} for ${appUserId}`);

    // The account: app_user_id (our UUID, or the email on the email-
    // registration path), else the original id / aliases (a purchase made
    // before the SDK logIn finished arrives under an anonymous id).
    const userId = await resolveProfileId(db, candidateUserKeys(event));

    // ── Consumables (gem bundles, starter pack) ──
    // The ONLY place purchased gems are credited (/api/sync/economy drops the
    // app's purchase-sized gem deltas since 2026-11-20). Once per RevenueCat
    // event id: a redelivered webhook credits nothing (revenuecat_events, 0018).
    if (event.type === 'NON_RENEWING_PURCHASE') {
      const productId = typeof event.product_id === 'string' ? event.product_id : '';
      const credit = creditForProduct(productId, event.purchased_at_ms, Date.now()) ?? legacyBundleCredit(productId);
      if (!credit) {
        console.warn(`[RevenueCat Webhook] unknown consumable ${JSON.stringify(productId)}: nothing credited`);
        return res.status(200).json({ ok: true, message: 'Unknown product' });
      }
      if (!userId) {
        console.warn(`[RevenueCat Webhook] consumable ${productId}: no matching profile, nothing credited`);
        return res.status(200).json({ ok: true, message: 'No matching user' });
      }
      const eventKey =
        typeof event.id === 'string' && event.id
          ? event.id
          : typeof event.transaction_id === 'string' && event.transaction_id
            ? `${event.type}:${event.transaction_id}`
            : null;
      const outcome = await creditPurchaseGems(db, {
        eventKey,
        userId,
        eventType: event.type,
        productId,
        gems: credit.gems,
        poolCoins: credit.poolCoins,
      });
      if (outcome === 'duplicate') {
        console.log(`[RevenueCat Webhook] duplicate event ${eventKey}: already credited`);
        return res.status(200).json({ ok: true, message: 'Already credited' });
      }
      // Starter pack coins: the app credits them itself (as it always has);
      // fund the user's returns pool so that credit passes the coin caps, and
      // release anything a cap held back meanwhile.
      if (credit.poolCoins > 0) {
        try {
          await runGuarded(
            userId,
            { xp: 0, coins: 0, gems: 0 },
            { store: economyStore(db), now: () => Date.now() },
            'webhook/revenuecat',
            { poolCredit: credit.poolCoins },
          );
        } catch (err) {
          // Gems are credited already; a missing pool only means the app's
          // coin credit goes through the free budget instead.
          console.error('[RevenueCat Webhook] pool credit failed', err);
        }
      }
      console.log(`[RevenueCat Webhook] Added ${credit.gems} gems (${credit.kind}, ${outcome})`);
      return res.status(200).json({ ok: true, message: `Added ${credit.gems} gems` });
    }

    // distinct_id for PostHog MUST be userProfiles.id (the UUID the client
    // passes to identifyUser), so server lifecycle events merge onto the same
    // person as in-app events.
    const distinctId = userId ?? appUserId;

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
        if (userId) {
          await db
            .update(userProfiles)
            .set({ isPro: true, proExpiresAt: expiresAt, proSource, updatedAt: new Date().toISOString() })
            .where(eq(userProfiles.id, userId));
          console.log(`[RevenueCat Webhook] Granted PRO (${proSource})`);
        } else {
          console.warn('[RevenueCat Webhook] Pro grant: no matching profile');
        }

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
        if (userId) {
          await db
            .update(userProfiles)
            .set({ isPro: false, updatedAt: new Date().toISOString() })
            .where(eq(userProfiles.id, userId));
          console.log(`[RevenueCat Webhook] Revoked PRO`);
        }

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
