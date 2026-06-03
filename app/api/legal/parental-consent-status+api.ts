/**
 * GET /api/legal/parental-consent-status?authId=XXX
 *
 * App calls this to find out whether a minor user has an active parental
 * consent on file. Returns the LATEST row's status (by requested_at desc),
 * with `expires_at` resolved to either keep 'pending' or auto-flip to
 * 'expired'.
 *
 * Auth: X-Sync-Token + authId in the query string. Returns the minimum
 * needed for the UI to decide what to render:
 *   { status: 'none' | 'pending' | 'confirmed' | 'revoked' | 'expired',
 *     parentEmail: string | null,    // masked, e.g. 'a***@gmail.com'
 *     requestedAt: ISO,
 *     confirmedAt: ISO | null,
 *     expiresAt: ISO }
 */

import { desc, eq } from 'drizzle-orm';
import { parentalConsents, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { getDb } from './_lib';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'legal-parental-consent-status', {
    limit: 30,
    windowSec: 60,
  });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 200);
    if (!authId) {
      return Response.json({ error: 'authId required' }, { status: 400 });
    }

    const db = getDb();
    const userRows = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = userRows[0];
    if (!user) return Response.json({ error: 'unknown user' }, { status: 404 });
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(parentalConsents)
      .where(eq(parentalConsents.userId, user.id))
      .orderBy(desc(parentalConsents.requestedAt))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return Response.json({ status: 'none' });
    }

    // Late-bound expiry: if status is still 'pending' but expires_at has
    // passed, treat as 'expired' for the response (and best-effort persist).
    let effectiveStatus: string = row.status;
    if (row.status === 'pending' && new Date(row.expiresAt) < new Date()) {
      effectiveStatus = 'expired';
      await db
        .update(parentalConsents)
        .set({ status: 'expired' })
        .where(eq(parentalConsents.token, row.token));
    }

    return Response.json({
      status: effectiveStatus,
      parentEmail: maskEmail(row.parentEmail),
      requestedAt: row.requestedAt,
      confirmedAt: row.confirmedAt,
      revokedAt: row.revokedAt,
      expiresAt: row.expiresAt,
    });
  } catch (err) {
    return safeErrorResponse(err, 'legal/parental-consent-status');
  }
}
