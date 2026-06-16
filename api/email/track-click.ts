import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { verifyEmailClickSig } from '../../src/features/email/emailClickSig';
import { appRedirectHtml } from '../_shared/appRedirectPage';

const EXPERIMENT_ID = 'daily_email_variant';
// Deep link straight into the app — the live click target. Was previously
// the marketing landing page, which made the email feel like a redirect to
// an ad rather than "open the game" (user report 2026-06-03).
const REDIRECT_URL = 'finpl://learn';
// Web fallback if the app isn't installed / the scheme doesn't resolve.
const FALLBACK_URL = 'https://finplay.me';

/** Serve the JS interstitial (200) instead of a 302 to a custom scheme — a
 *  302 to finpl:// isn't followed by most browsers from an email tap, so the
 *  CTA never opened the app. See api/_shared/appRedirectPage.ts. */
function sendAppRedirect(res: VercelResponse): VercelResponse {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(appRedirectHtml(REDIRECT_URL, FALLBACK_URL));
  return res;
}

function getDb() {
  const dbSql = neon(process.env.DATABASE_URL ?? '');
  return drizzle(dbSql);
}

/**
 * GET /api/email/track-click?u=<userId>&v=<variantId>&s=<sig>
 *
 * Records a bandit conversion (impression+1 → conversion+1) for the daily
 * re-engagement email's A/B test, then redirects the tap straight into the
 * app via a custom-scheme deep link. The match for `vercel.json` deployment
 * pattern (`api/**`) — the parallel `app/api/email/track-click+api.ts` is an
 * Expo Router route and is NOT deployed by the current Vercel config.
 *
 * Failure modes are silently swallowed and the user is still redirected, so
 * a bandit-table outage never breaks the tap-through.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = typeof req.query.u === 'string' ? req.query.u : '';
  const variantId = typeof req.query.v === 'string' ? req.query.v : '';
  const sig = typeof req.query.s === 'string' ? req.query.s : '';

  const secret = process.env.EMAIL_TRACKING_SECRET ?? '';
  if (!secret) {
    console.error('[email/track-click] EMAIL_TRACKING_SECRET not configured');
    return sendAppRedirect(res);
  }

  if (!userId || !variantId || !sig) {
    return sendAppRedirect(res);
  }

  // Reject obviously invalid inputs before HMAC check.
  if (userId.length > 64 || variantId.length > 64 || sig.length !== 16) {
    return sendAppRedirect(res);
  }

  if (!verifyEmailClickSig(userId, variantId, sig, secret)) {
    // Bad signature — possibly forged. Don't record the conversion, but
    // don't expose the check either: still redirect normally.
    return sendAppRedirect(res);
  }

  try {
    const db = getDb();
    await db.execute(sql`
      INSERT INTO bandit_variants
        (experiment_id, variant_id, alpha, beta, impressions, conversions)
      VALUES
        (${EXPERIMENT_ID}, ${variantId}, 2, 1, 0, 1)
      ON CONFLICT (experiment_id, variant_id) DO UPDATE SET
        alpha       = bandit_variants.alpha + 1,
        conversions = bandit_variants.conversions + 1,
        updated_at  = NOW();
    `);
  } catch (err) {
    console.error('[email/track-click] bandit update failed', err);
    // Conversion logging is non-critical — still redirect.
  }

  return sendAppRedirect(res);
}
