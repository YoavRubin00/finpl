import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, clampNumber } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const dbSql = neon(url);
  return drizzle(dbSql);
}

interface GrantCoinsBody {
  authId: string;
  amount: number;
  source: string;
}

/** Sources accepted from clients. Server-only sources (`referral-*`) are
 *  inserted directly by the referral endpoints and rejected here to prevent
 *  a malicious client from forging referral telemetry. */
const VALID_SOURCES = new Set([
  'lesson',
  'quiz',
  'daily-quest',
  'signup-bonus',
]);

/**
 * POST /api/economy/grant-coins
 *
 * Append a coin grant event for a user. This is a TELEMETRY endpoint —
 * the local economy store remains the source of truth for the user's
 * actual balance. We log here so the referral dividend has data to compute.
 *
 * Only sources in VALID_SOURCES are accepted (server-side enforcement of
 * what counts toward the dividend). Amount is clamped to [1, 100000] to
 * prevent abuse.
 *
 * Fire-and-forget from the client — failures are non-fatal and don't block
 * the user's local coin grant.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'economy-grant-coins', { limit: 120, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as GrantCoinsBody;
    const authId = sanitizeString(body.authId, 128);
    const source = sanitizeString(body.source, 32);
    const amount = clampNumber(body.amount, 1, 100000);

    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }
    if (!source || !VALID_SOURCES.has(source)) {
      return Response.json({ error: 'Invalid source' }, { status: 400 });
    }
    if (amount === undefined) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const db = getDb();

    await db.execute(sql`
      INSERT INTO coin_events (auth_id, amount, source)
      VALUES (${authId}, ${amount}, ${source})
    `);

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'economy/grant-coins POST');
  }
}
