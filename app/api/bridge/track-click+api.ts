import { neon } from '@neondatabase/serverless';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';
import { sendBridgeAlert } from '../../../api/_shared/bridgeAlert';

const VALID_ACTIONS = new Set(['redeem', 'link_open']);

/**
 * POST /api/bridge/track-click — tracking ping for Bridge partner clicks.
 *
 * Not a redemption check: app builds before the 2026-11-20 OTA decide a
 * redemption on the device and report it here (no session; `authId` and
 * `userEmail` are whatever the body says). Newer builds redeem through
 * POST /api/bridge/redeem, which checks and deducts the server balance and
 * writes the 'redeem' row itself. For the old builds' reports:
 *   - one 'redeem' row per (user, benefit): a repeat (replay, second device,
 *     reinstall) is answered ok and neither stored nor emailed again;
 *   - no owner email when the authId names no account;
 *   - the owner email says the report is unverified, and is HTML-escaped (the
 *     client-supplied email used to be inserted raw).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'bridge-track', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = await request.json() as Record<string, unknown>;

    const benefitId = sanitizeString(body.benefitId, 100);
    const authId    = sanitizeString(body.authId, 254);
    const userEmail = sanitizeString(body.userEmail, 254) ?? null;
    const action    = sanitizeString(body.action, 20);
    const platform  = sanitizeString(body.platform, 10) ?? null;

    if (!benefitId) {
      return Response.json({ error: 'Missing benefitId' }, { status: 400 });
    }
    if (!action || !VALID_ACTIONS.has(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL ?? '');

    // Resolve user_id when an authId is provided. Anonymous clicks remain
    // supported (user_id NULL, user_email kept for the owner-alert email body).
    let userId: string | null = null;
    if (authId) {
      const rows = await sql`SELECT id FROM user_profiles WHERE auth_id = ${authId} LIMIT 1` as { id: string }[];
      userId = rows[0]?.id ?? null;
    }

    // A known user's repeated 'redeem' report is skipped (see header).
    const inserted = await sql`
      INSERT INTO bridge_clicks (benefit_id, user_id, user_email, action, platform)
      SELECT ${benefitId}::text, ${userId}::uuid, ${userEmail}::text, ${action}::text, ${platform}::text
       WHERE NOT (
         ${action}::text = 'redeem'
         AND ${userId}::uuid IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM bridge_clicks
            WHERE user_id = ${userId}::uuid AND benefit_id = ${benefitId}::text AND action = 'redeem'
         )
       )
      RETURNING id
    ` as { id: number }[];

    if (action === 'redeem' && userId && inserted.length > 0) {
      sendBridgeAlert({ action: 'redeem', benefitId, userEmail, platform, verified: false });
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'bridge/track-click');
  }
}
