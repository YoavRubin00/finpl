/**
 * POST /api/support/send — captures a free-text support message from the
 * in-app Shark support chat and persists it to support_messages on Neon.
 *
 * Body: { authId?, email?, message, platform?, appVersion? }
 *   - authId/email: best-effort identification of the user. authId resolves
 *     to user_profiles.id; email is also stored as a fallback for ops follow-up
 *     when the user isn't logged in (or the profile lookup misses).
 *   - message: required, max 4000 chars.
 *
 * Rate-limited to 5 submissions per 5 minutes per IP to prevent spam.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { supportMessages, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface SendBody {
  authId?: string;
  email?: string;
  message: string;
  platform?: string;
  appVersion?: string;
}

async function resolveUserId(db: ReturnType<typeof getDb>, authId: string): Promise<string | null> {
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'support-send-post', { limit: 5, windowSec: 300 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as SendBody;
    const message = sanitizeString(body.message, 4000);
    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    const authId = sanitizeString(body.authId, 254);
    const email = sanitizeString(body.email, 254);
    const platform = sanitizeString(body.platform, 32);
    const appVersion = sanitizeString(body.appVersion, 32);

    const db = getDb();
    const userId = authId ? await resolveUserId(db, authId) : null;

    await db.insert(supportMessages).values({
      userId,
      userEmail: email,
      message,
      platform,
      appVersion,
    });

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'support/send POST');
  }
}
