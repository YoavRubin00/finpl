import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';
import { json } from '../_shared/json';
import { capturePostHog } from '../../../api/_shared/posthogCapture';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const dbSql = neon(url);
  return drizzle(dbSql);
}

interface RegisterCodeBody {
  authId: string;
  referralCode: string;
}

const CODE_PATTERN = /^[A-Z0-9-]{4,12}$/;

/**
 * POST /api/referral/register-code
 * Registers a user's personal invite code so the server can later look up
 * the referrer when someone redeems the code.
 *
 * Idempotent — safe to call repeatedly. UNIQUE index on user_profiles.referral_code
 * means a code collision returns 409 (caller should regenerate).
 *
 * Always returns the CANONICAL code from the DB (`canonicalCode`). When the
 * user already has a DIFFERENT code registered, the guarded UPDATE touches 0
 * rows — previously we still answered a bare ok:true and the client kept
 * rendering a QR for a code the server can't resolve ("dead code": every
 * scan died with CODE_NOT_FOUND). The client MUST adopt canonicalCode when
 * it differs from its local value.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-register-code', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as RegisterCodeBody;
    const authId = sanitizeString(body.authId, 128);
    const referralCode = sanitizeString(body.referralCode, 12);

    if (!authId) return json({ error: 'Missing authId' }, { status: 400 });
    if (!referralCode || !CODE_PATTERN.test(referralCode)) {
      return json({ error: 'Invalid referral code format' }, { status: 400 });
    }

    const db = getDb();

    // If the user already has a different code, keep what's in DB (don't overwrite).
    // If the same code is already there, this is a no-op.
    // If a different user owns this code, the unique index will reject the update —
    // we surface 409 so the client regenerates.
    interface ProfileCodeRow { id: string; referral_code: string | null }
    let updatedRow: ProfileCodeRow | undefined;
    try {
      const updated = await db.execute(sql`
        UPDATE user_profiles
           SET referral_code = ${referralCode}
         WHERE auth_id = ${authId}
           AND (referral_code IS NULL OR referral_code = ${referralCode})
        RETURNING id, referral_code
      `);
      updatedRow = ((updated as unknown as { rows?: ProfileCodeRow[] }).rows
        ?? (updated as unknown as ProfileCodeRow[]))[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        await capturePostHog('referral_register_code_server', authId, {
          result: 'collision',
          requested_code: referralCode,
        });
        return json({ error: 'Code collision — regenerate', code: 'COLLISION' }, { status: 409 });
      }
      throw err;
    }

    // Resolve the canonical code. If the guarded UPDATE matched (row returned),
    // the requested code IS canonical. Otherwise the profile either holds a
    // DIFFERENT code (client must adopt it) or doesn't exist yet (signup race).
    let canonicalCode: string | null;
    let result: 'registered' | 'kept_existing' | 'no_profile';
    let distinctId = authId;
    if (updatedRow) {
      canonicalCode = updatedRow.referral_code;
      result = 'registered';
      distinctId = updatedRow.id;
    } else {
      const existing = await db.execute(sql`
        SELECT id, referral_code FROM user_profiles WHERE auth_id = ${authId} LIMIT 1
      `);
      const existingRow = ((existing as unknown as { rows?: ProfileCodeRow[] }).rows
        ?? (existing as unknown as ProfileCodeRow[]))[0];
      if (existingRow) {
        canonicalCode = existingRow.referral_code;
        result = 'kept_existing';
        distinctId = existingRow.id;
      } else {
        canonicalCode = null;
        result = 'no_profile';
      }
    }

    await capturePostHog('referral_register_code_server', distinctId, {
      result,
      requested_code: referralCode,
      canonical_code: canonicalCode,
    });

    return json({ ok: true, canonicalCode });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/register-code POST');
  }
}
