/**
 * POST /api/legal/parental-consent-notify-purchase
 *
 * Hybrid-flow endpoint. Fired by the client AFTER a 16-17 user successfully
 * purchased Pro through RevenueCat. Looks up the (already-existing) pending
 * row that holds the parent's email, flips it to 'confirmed' (the post-
 * purchase semantic = "purchase made, parent notified"), and sends the
 * notification email with a one-click revoke link.
 *
 * Why 'confirmed' and not a new 'notified' status: the existing schema only
 * recognizes 4 statuses (pending/confirmed/revoked/expired). 'confirmed' in
 * the Hybrid flow means "consent currently in effect" — either because the
 * parent pre-confirmed (Hard gate) or because we notified them and the 30d
 * silent-acceptance window is running (Hybrid). The semantic difference is
 * only relevant to the email we send; the access decision is identical.
 *
 * Auth: X-Sync-Token, same as the other user-scoped endpoints.
 */

import { and, eq } from 'drizzle-orm';
import { parentalConsents, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { sendPurchaseNotificationEmail } from '../_shared/sendPurchaseNotificationEmail';
import { getDb, getOrigin } from '../../../src/lib/api/legal-helpers';

interface NotifyBody {
  authId?: string;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'legal-parental-consent-notify', {
    limit: 5,
    windowSec: 60,
  });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as NotifyBody;
    const authId = sanitizeString(body.authId, 200);
    if (!authId) {
      return Response.json({ error: 'authId required' }, { status: 400 });
    }

    const db = getDb();
    const userRows = await db
      .select({
        id: userProfiles.id,
        displayName: userProfiles.displayName,
        syncToken: userProfiles.syncToken,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = userRows[0];
    if (!user) return Response.json({ error: 'unknown user' }, { status: 404 });
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Find the pending row created by parental-consent-request immediately
    // before the purchase. If somehow there isn't one, return 404 — the
    // client is supposed to call /request first to collect the email.
    const pendingRows = await db
      .select()
      .from(parentalConsents)
      .where(and(
        eq(parentalConsents.userId, user.id),
        eq(parentalConsents.status, 'pending'),
      ))
      .limit(1);
    const pending = pendingRows[0];
    if (!pending) {
      return Response.json(
        { error: 'no pending consent row — call /parental-consent-request first to collect parent email' },
        { status: 404 },
      );
    }

    // Flip to confirmed and stamp confirmedAt — "in effect" until parent
    // revokes or 30 days pass.
    const nowIso = new Date().toISOString();
    await db
      .update(parentalConsents)
      .set({
        status: 'confirmed',
        confirmedAt: nowIso,
      })
      .where(eq(parentalConsents.token, pending.token));

    // Send the parent the post-purchase notification with revoke link.
    const origin = getOrigin(request);
    const revokeUrl = `${origin}/api/legal/parental-consent-revoke?token=${encodeURIComponent(pending.token)}`;
    const emailResult = await sendPurchaseNotificationEmail({
      parentEmail: pending.parentEmail,
      childName: user.displayName,
      revokeUrl,
      purchasedAt: nowIso,
    });

    return Response.json({
      ok: true,
      status: 'confirmed',
      emailSent: emailResult.ok,
    });
  } catch (err) {
    return safeErrorResponse(err, 'legal/parental-consent-notify-purchase');
  }
}
