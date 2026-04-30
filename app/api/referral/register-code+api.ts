import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const dbSql = neon(url);
  return drizzle(dbSql);
}

interface RegisterCodeBody {
  authId: string;
  referralCode: string;
}

const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

/**
 * POST /api/referral/register-code
 * Registers a user's personal invite code so the server can later look up
 * the referrer when someone redeems the code.
 *
 * Idempotent — safe to call repeatedly. UNIQUE index on user_profiles.referral_code
 * means a code collision returns 409 (caller should regenerate).
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-register-code', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as RegisterCodeBody;
    const authId = sanitizeString(body.authId, 128);
    const referralCode = sanitizeString(body.referralCode, 12);

    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!referralCode || !CODE_PATTERN.test(referralCode)) {
      return Response.json({ error: 'Invalid referral code format' }, { status: 400 });
    }

    const db = getDb();

    // If the user already has a different code, keep what's in DB (don't overwrite).
    // If the same code is already there, this is a no-op.
    // If a different user owns this code, the unique index will reject the update —
    // we surface 409 so the client regenerates.
    try {
      await db.execute(sql`
        UPDATE user_profiles
           SET referral_code = ${referralCode}
         WHERE auth_id = ${authId}
           AND (referral_code IS NULL OR referral_code = ${referralCode})
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        return Response.json({ error: 'Code collision — regenerate', code: 'COLLISION' }, { status: 409 });
      }
      throw err;
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/register-code POST');
  }
}
