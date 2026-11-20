// api/_shared/revenueCatWebhook.ts
//
// POST /api/webhooks/revenuecat: RevenueCat's server-to-server events.
// Production entry: api/webhooks/revenuecat.ts. Dev twin (Expo Router):
// app/api/webhooks/revenuecat+api.ts. Both call handleRevenueCatWebhook with
// the Neon wiring (economyStores.ts createRevenueCatWebhookDeps), so there is
// one implementation; scripts/test-economy-sync.ts runs it with in-memory deps.
//
// Authentication
//   Authorization must equal the shared secret (RC_WEBHOOK_SECRET, or the
//   EXPO_PUBLIC_RC_WEBHOOK_SECRET alias), raw or as "Bearer <secret>"
//   (constant-time compare). With NO secret configured, production
//   (VERCEL_ENV=production) refuses every event with 500 and does nothing
//   (RevenueCat retries, so nothing is lost once the secret is set); other
//   environments accept events unchecked, as before.
//
// Consumables (NON_RENEWING_PURCHASE): the only path that credits purchased
// gems (/api/sync/economy drops the app's purchase-sized gem deltas).
//   Known product (iapCredit.ts explicit table) and a profile: credited once
//     per RevenueCat event (ledger row in revenuecat_events and the gems in one
//     statement; the starter pack also funds the returns pool in that same
//     statement, under compare-and-swap, so a retry never credits twice).
//   No profile (anonymous RevenueCat id, unknown account) or an unknown
//     product: RECORDED, never dropped silently: a revenuecat_events row with
//     user_id NULL, the raw app_user_id (for a manual credit) and the gems the
//     product is worth (0 when unknown), plus one owner email (product, gems,
//     event id; never the app_user_id or an address). Answer 200: no retry can
//     fix it.
//   Compare-and-swap exhausted (starter pack): 503, nothing was written, and
//     RevenueCat retries.
// Pro (entitlement "FinPlay Pro")
//   INITIAL_PURCHASE / RENEWAL / UNCANCELLATION / TRANSFER: Pro with the
//     event's expiry (source 'promotional' for PROMOTIONAL grants, else 'store').
//   BILLING_ISSUE: Pro is NOT removed (the store's grace period keeps the
//     entitlement); pro_expires_at moves to the grace period's end when the
//     event carries one (never shortened). RevenueCat sends EXPIRATION if the
//     grace period ends without payment.
//   EXPIRATION: Pro removed, unless the event's expiry is older than the
//     stored one (a late redelivery after a renewal).
//   CANCELLATION: analytics only (the period is still paid).
// Logs carry the resolved profile id, or a short hash of app_user_id (it can
// be an email), never the raw value. Any error answers a generic 500 (no SQL,
// no parameters) and logs only its SQLSTATE.

import { createHash, timingSafeEqual } from 'crypto';
import { candidateUserKeys, creditForProduct } from './iapCredit';
import { pgErrorCode } from './pgError';

export const RC_PRO_ENTITLEMENT_ID = 'FinPlay Pro';

export type PurchaseCreditOutcome = 'credited' | 'credited_without_dedupe' | 'duplicate' | 'busy' | 'no_user';
export type UnmatchedRecordOutcome = 'recorded' | 'duplicate' | 'unavailable';
export type UnmatchedReason = 'unknown_product' | 'no_matching_account';

export interface PurchaseCreditArgs {
  /** RevenueCat event id (or type:transaction id); null = can't deduplicate. */
  eventKey: string | null;
  userId: string;
  eventType: string;
  productId: string;
  gems: number;
  /** Coins for the returns pool (starter pack), not credited directly. */
  poolCoins: number;
}

export interface UnmatchedPurchaseArgs {
  eventKey: string;
  /** The raw RevenueCat app_user_id, for a manual credit. */
  appUserId: string;
  eventType: string;
  productId: string;
  gems: number;
  poolCoins: number;
}

export interface UnmatchedPurchaseAlert {
  reason: UnmatchedReason;
  productId: string;
  gems: number;
  eventId: string;
  environment: string | null;
}

export interface RcWebhookDeps {
  /** Defaults to process.env (read per request). */
  env?: Record<string, string | undefined>;
  now(): number;
  resolveProfileId(keys: string[]): Promise<string | null>;
  creditPurchase(args: PurchaseCreditArgs): Promise<PurchaseCreditOutcome>;
  recordUnmatchedPurchase(args: UnmatchedPurchaseArgs): Promise<UnmatchedRecordOutcome>;
  grantPro(userId: string, fields: { expiresAt: string | null; proSource: 'store' | 'promotional' }): Promise<void>;
  /** BILLING_ISSUE: move pro_expires_at to the grace period's end (never earlier). */
  extendProForGrace(userId: string, graceExpiresAt: string): Promise<void>;
  /** EXPIRATION: 'skipped' when the stored expiry is later than the event's. */
  expirePro(userId: string, eventExpiresAt: string | null): Promise<'revoked' | 'skipped'>;
  capture(event: string, distinctId: string, props: Record<string, unknown>): Promise<void>;
  /** Never rejects (the production one waits for the send, at most ~3 s). */
  alertUnmatchedPurchase(alert: UnmatchedPurchaseAlert): void | Promise<void>;
  log?(level: 'info' | 'warn' | 'error', line: Record<string, unknown>): void;
}

export interface RcWebhookInput {
  authorization: string | null | undefined;
  body: unknown;
}

export interface RcWebhookResult {
  status: number;
  body: Record<string, unknown>;
}

const defaultLog: NonNullable<RcWebhookDeps['log']> = (level, line) => {
  const text = `[RevenueCat Webhook] ${JSON.stringify(line)}`;
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
};

/** The configured shared secret, or null. An empty value counts as none. */
export function webhookSecret(env: Record<string, string | undefined>): string | null {
  const raw = env.RC_WEBHOOK_SECRET || env.EXPO_PUBLIC_RC_WEBHOOK_SECRET || '';
  const s = raw.trim();
  return s ? s : null;
}

function sameString(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** RevenueCat sends the configured value as-is; some setups prefix "Bearer ". */
export function secretMatches(header: string | null | undefined, secret: string): boolean {
  if (typeof header !== 'string') return false;
  const h = header.trim();
  return sameString(h, secret) || sameString(h, `Bearer ${secret}`);
}

/** Short stable hash for logs: tells events of one RevenueCat id apart without
 *  writing the id (which can be an email) into the logs. */
export function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, max = 512): string | null {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;
}

function isoFromMs(v: unknown): string | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? new Date(v).toISOString() : null;
}

/** RevenueCat's event id, else type + store transaction id (both stable across redeliveries). */
function purchaseEventKey(event: Record<string, unknown>, type: string): string | null {
  const id = str(event.id, 200);
  if (id) return id;
  const tx = str(event.transaction_id, 200);
  return tx ? `${type}:${tx}` : null;
}

export async function handleRevenueCatWebhook(input: RcWebhookInput, deps: RcWebhookDeps): Promise<RcWebhookResult> {
  const log = deps.log ?? defaultLog;
  try {
    const env = deps.env ?? process.env;
    const secret = webhookSecret(env);
    if (!secret) {
      if (env.VERCEL_ENV === 'production') {
        log('error', { outcome: 'refused', reason: 'no webhook secret configured in production (RC_WEBHOOK_SECRET)' });
        return { status: 500, body: { error: 'Webhook not configured' } };
      }
    } else if (!secretMatches(input.authorization, secret)) {
      return { status: 401, body: { error: 'Unauthorized' } };
    }

    const body = isRecord(input.body) ? input.body : null;
    const event = body && isRecord(body.event) ? body.event : null;
    const appUserId = event ? str(event.app_user_id) : null;
    if (!event || !appUserId) {
      return { status: 400, body: { error: 'Invalid payload' } };
    }
    const type = str(event.type, 64) ?? '';
    const eventId = str(event.id, 200);
    const environment = str(event.environment, 32);

    // The account: app_user_id (our profile uuid; the email on the legacy
    // email-registration path), else the original id / aliases (a purchase
    // made before the SDK logIn finished arrives under an anonymous id).
    const userId = await deps.resolveProfileId(candidateUserKeys(event));
    const who = userId ? { userId } : { appUser: shortHash(appUserId) };
    log('info', { type, eventId, ...who });

    // ── Consumables (gem bundles, starter pack) ──
    if (type === 'NON_RENEWING_PURCHASE') {
      const productId = str(event.product_id, 200) ?? '';
      const credit = creditForProduct(productId, event.purchased_at_ms, deps.now());
      const eventKey = purchaseEventKey(event, type);
      if (credit && userId) {
        const outcome = await deps.creditPurchase({
          eventKey, userId, eventType: type, productId, gems: credit.gems, poolCoins: credit.poolCoins,
        });
        if (outcome === 'duplicate') {
          log('info', { outcome: 'already_credited', eventId: eventKey, userId });
          return { status: 200, body: { ok: true, message: 'Already credited' } };
        }
        if (outcome === 'busy') {
          // Nothing was written; RevenueCat retries a non-2xx answer.
          log('warn', { outcome: 'busy_retry_later', eventId: eventKey, userId });
          return { status: 503, body: { error: 'Busy, try again' } };
        }
        if (outcome !== 'no_user') {
          log('info', { outcome, eventId: eventKey, userId, productId, gems: credit.gems, kind: credit.kind });
          return { status: 200, body: { ok: true, message: `Added ${credit.gems} gems` } };
        }
        // 'no_user': the profile vanished between the lookup and the credit.
      }
      const reason: UnmatchedReason = credit ? 'no_matching_account' : 'unknown_product';
      const gems = credit?.gems ?? 0;
      const key = eventKey ?? `${type}:unkeyed:${shortHash(JSON.stringify([appUserId, productId, event.purchased_at_ms ?? null]))}`;
      const recorded = await deps.recordUnmatchedPurchase({
        eventKey: key, appUserId, eventType: type, productId, gems, poolCoins: credit?.poolCoins ?? 0,
      });
      log(recorded === 'unavailable' ? 'error' : 'warn', {
        outcome: 'purchase_not_credited', reason, eventId: key, productId, gems, appUser: shortHash(appUserId), recorded,
      });
      // One email per event: a redelivery of a recorded event stays quiet.
      if (recorded !== 'duplicate') {
        await deps.alertUnmatchedPurchase({ reason, productId, gems, eventId: key, environment });
      }
      return { status: 200, body: { ok: true, message: credit ? 'No matching user' : 'Unknown product' } };
    }

    // ── Pro (subscription) ──
    // distinct_id for PostHog MUST be userProfiles.id (the UUID the client
    // passes to identifyUser), so server lifecycle events merge onto the same
    // person as in-app events.
    const distinctId = userId ?? appUserId;
    const isProEvent = Array.isArray(event.entitlement_ids) && event.entitlement_ids.includes(RC_PRO_ENTITLEMENT_ID);
    const expiresAt = isoFromMs(event.expiration_at_ms);
    const baseProps = {
      rc_event_type: type,
      product_id: str(event.product_id, 200),
      entitlement: RC_PRO_ENTITLEMENT_ID,
      period_type: str(event.period_type, 32),
      is_trial_conversion: typeof event.is_trial_conversion === 'boolean' ? event.is_trial_conversion : null,
      source: 'revenuecat_webhook',
    };

    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL' || type === 'UNCANCELLATION' || type === 'TRANSFER') {
      if (isProEvent) {
        // Promo-grant visibility (2026-07-26): record HOW Pro was granted.
        // RevenueCat sends period_type 'PROMOTIONAL' for promotional grants;
        // the app shows the one-time gift modal and the expiry banner from it.
        const proSource = event.period_type === 'PROMOTIONAL' ? 'promotional' : 'store';
        if (userId) {
          await deps.grantPro(userId, { expiresAt, proSource });
          log('info', { outcome: 'pro_granted', userId, proSource, expiresAt });
        } else {
          log('warn', { outcome: 'pro_grant_no_matching_profile', eventId, appUser: shortHash(appUserId) });
        }
        // Each type → its own PostHog event, so the funnel can split "trial
        // converted to paid" (RENEWAL after a TRIAL) from "fresh subscriber"
        // (INITIAL_PURCHASE) and "win-back" (UNCANCELLATION).
        const eventNameByType: Record<string, string> = {
          INITIAL_PURCHASE: 'subscription_purchased',
          RENEWAL: 'subscription_renewed',
          UNCANCELLATION: 'subscription_uncancelled',
          TRANSFER: 'subscription_transferred',
        };
        await deps.capture(eventNameByType[type], distinctId, { ...baseProps, expires_at: expiresAt });
      }
    } else if (type === 'BILLING_ISSUE') {
      if (isProEvent) {
        // The renewal payment failed. That is not the end of the
        // subscription: during the store's grace period the entitlement stays
        // active, so Pro stays. RevenueCat sends EXPIRATION if it ends unpaid.
        const graceEnd = isoFromMs(event.grace_period_expiration_at_ms);
        if (userId && graceEnd) await deps.extendProForGrace(userId, graceEnd);
        log('info', { outcome: 'billing_issue_pro_kept', userId: userId ?? null, graceEnd });
        await deps.capture('subscription_billing_issue', distinctId, { ...baseProps, grace_period_expires_at: graceEnd });
      }
    } else if (type === 'EXPIRATION') {
      if (isProEvent) {
        let result: 'revoked' | 'skipped' | 'no_profile' = 'no_profile';
        if (userId) result = await deps.expirePro(userId, expiresAt);
        log('info', { outcome: result === 'skipped' ? 'expiration_skipped_stale' : `expiration_${result}`, userId: userId ?? null, expiresAt });
        await deps.capture('subscription_expired', distinctId, { ...baseProps, stale_redelivery: result === 'skipped' });
      }
    } else if (type === 'CANCELLATION') {
      // Auto-renew switched off; the period is still paid. Key early-churn
      // signal for trial cohorts. Pro is NOT touched.
      if (isProEvent) await deps.capture('subscription_cancelled', distinctId, baseProps);
    }

    return { status: 200, body: { ok: true } };
  } catch (err) {
    // Never the error message: drizzle's says "Failed query: <sql> params: <values>".
    log('error', { outcome: 'error', code: pgErrorCode(err), name: err instanceof Error ? err.name : typeof err });
    return { status: 500, body: { error: 'Internal server error' } };
  }
}
