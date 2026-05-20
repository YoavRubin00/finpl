import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { verifyEmailClickSig } from '../../../src/features/email/emailClickSig';

const EXPERIMENT_ID = 'daily_email_variant';
const REDIRECT_URL = 'https://finplay.me/?from=email';

function getDb() {
  const dbSql = neon(process.env.DATABASE_URL ?? '');
  return drizzle(dbSql);
}

/**
 * GET /api/email/track-click?u=<userId>&v=<variantId>&s=<sig>
 * Records a bandit conversion event and redirects to the app universal link.
 * Used by the daily retention email CTAs.
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'email-track-click', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  const url = new URL(request.url);
  const userId = url.searchParams.get('u') ?? '';
  const variantId = url.searchParams.get('v') ?? '';
  const sig = url.searchParams.get('s') ?? '';

  const secret = process.env.EMAIL_TRACKING_SECRET ?? '';
  if (!secret) {
    // Secret not configured — still redirect the user so they aren't stuck on an error page.
    console.error('[email/track-click] EMAIL_TRACKING_SECRET not configured');
    return Response.redirect(REDIRECT_URL, 302);
  }

  if (!userId || !variantId || !sig) {
    return Response.redirect(REDIRECT_URL, 302);
  }

  // Reject obviously invalid inputs before HMAC check.
  if (userId.length > 64 || variantId.length > 64 || sig.length !== 16) {
    return Response.redirect(REDIRECT_URL, 302);
  }

  if (!verifyEmailClickSig(userId, variantId, sig, secret)) {
    // Bad signature — possibly forged. Still redirect (don't expose the check),
    // but don't record the conversion.
    return Response.redirect(REDIRECT_URL, 302);
  }

  try {
    const db = getDb();
    // Atomic upsert + increment (same pattern as /api/bandit/event).
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
    // Conversion logging is non-critical; still redirect the user.
    return safeErrorResponse(err, 'email/track-click').status === 500
      ? Response.redirect(REDIRECT_URL, 302)
      : Response.redirect(REDIRECT_URL, 302);
  }

  return Response.redirect(REDIRECT_URL, 302);
}
