/**
 * POST /api/legal/parental-consent-request
 *
 * A minor (16-17) requests Pro → app calls this with their authId + the
 * parent's email. We insert a 'pending' row in parental_consents, generate
 * a random token, and send the parent an email with confirm/revoke links.
 *
 * Idempotency: if the user already has a non-expired pending row, we resend
 * to the SAME row's token (not a new row). This lets a user re-trigger if
 * the parent missed the email, without leaving orphans.
 *
 * Auth: X-Sync-Token, same as the rest of the user-scoped API surface.
 */

import { and, eq, gt } from 'drizzle-orm';
import { parentalConsents, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { sendParentalConsentEmail } from '../_shared/sendParentalConsentEmail';
import { generateToken, getClientIp, getDb, getOrigin } from '../../../src/lib/api/legal-helpers';

interface RequestBody {
  authId?: string;
  parentEmail?: string;
}

// Light email regex — server-side is a sanity gate, not full RFC validation.
// (RFC-compliant email validation is impossible in regex anyway.)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'legal-parental-consent-request', {
    limit: 3,
    windowSec: 60,
  });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as RequestBody;
    const authId = sanitizeString(body.authId, 200);
    const parentEmail = sanitizeString(body.parentEmail, 254)?.toLowerCase();
    if (!authId || !parentEmail || !EMAIL_RE.test(parentEmail)) {
      return Response.json({ error: 'invalid payload' }, { status: 400 });
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

    // Look for an existing non-expired pending row from this user. If found,
    // reuse its token (resend email). If the user wants a fresh start, they
    // can revoke first and then request again.
    const now = new Date().toISOString();
    const existingRows = await db
      .select()
      .from(parentalConsents)
      .where(and(
        eq(parentalConsents.userId, user.id),
        eq(parentalConsents.status, 'pending'),
        gt(parentalConsents.expiresAt, now),
      ))
      .limit(1);

    let token: string;
    let parentEmailToUse: string;
    if (existingRows[0]) {
      token = existingRows[0].token;
      parentEmailToUse = existingRows[0].parentEmail;
      // If the user typed a different parent email this time, that's a
      // policy decision — for now we keep the original (anti-fraud: the
      // first parent already controls the consent record).
    } else {
      token = generateToken();
      parentEmailToUse = parentEmail;
      // expires_at defaults via DB to NOW() + 14 days (see migration 0005).
      // We pass an explicit value so the row is consistent across drivers.
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await db.insert(parentalConsents).values({
        userId: user.id,
        parentEmail: parentEmailToUse,
        token,
        status: 'pending',
        expiresAt,
        ipWhenRequested: getClientIp(request),
      });
    }

    const origin = getOrigin(request);
    const confirmUrl = `${origin}/api/legal/parental-consent-confirm?token=${encodeURIComponent(token)}`;
    const revokeUrl = `${origin}/api/legal/parental-consent-revoke?token=${encodeURIComponent(token)}`;

    const emailResult = await sendParentalConsentEmail({
      parentEmail: parentEmailToUse,
      childName: user.displayName,
      confirmUrl,
      revokeUrl,
    });

    // We return ok even if email failed — the row exists, the user can
    // request a resend. We do surface the error so the client can show
    // an honest message.
    return Response.json({
      ok: true,
      status: 'pending',
      emailSent: emailResult.ok,
      parentEmail: parentEmailToUse,
    });
  } catch (err) {
    return safeErrorResponse(err, 'legal/parental-consent-request');
  }
}
