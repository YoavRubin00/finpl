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

interface RedeemBody {
  inviteCode: string;
  refereeAuthId: string;
}

const CODE_PATTERN = /^[A-Z0-9-]{4,12}$/;

/** Magnitudes mirrored server-side. Must match `referralConstants.ts`. */
const SIGNUP_BONUS_COINS = 500;

interface RedeemSuccess {
  ok: true;
  referrerAuthId: string;
  bonusGranted: number;
}

/**
 * POST /api/referral/redeem
 *
 * Atomic redemption flow:
 *   1. Look up referrer by invite code (user_profiles.referral_code).
 *   2. Validate self-referral (referee != referrer).
 *   3. INSERT referrals row (PK on referee_auth_id prevents double-redeem).
 *   4. Append two coin_events rows: 500 to referrer + 500 to referee.
 *   5. Mark referrals.signup_bonus_paid=true.
 *
 * If referee already has a referrals row, returns 409 (one-time link only).
 * If code unknown, returns 404.
 * If self-referral, returns 400.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-redeem', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as RedeemBody;
    const inviteCode = sanitizeString(body.inviteCode, 12)?.toUpperCase();
    const refereeAuthId = sanitizeString(body.refereeAuthId, 128);

    if (!inviteCode || !CODE_PATTERN.test(inviteCode)) {
      return Response.json({ error: 'Invalid invite code' }, { status: 400 });
    }
    if (!refereeAuthId) {
      return Response.json({ error: 'Missing refereeAuthId' }, { status: 400 });
    }

    const db = getDb();

    // 1. Lookup referrer by code — need their uuid (tables are user_id-keyed
    //    since migration 0004; the old *_auth_id columns no longer exist).
    const lookup = await db.execute(sql`
      SELECT id, auth_id FROM user_profiles WHERE referral_code = ${inviteCode} LIMIT 1
    `);
    const referrerRow = ((lookup as unknown as { rows?: { id: string; auth_id: string }[] }).rows
      ?? (lookup as unknown as { id: string; auth_id: string }[]))[0];
    const referrerUserId = referrerRow?.id;
    const referrerAuthId = referrerRow?.auth_id;
    if (!referrerUserId || !referrerAuthId) {
      return Response.json({ error: 'Unknown invite code', code: 'CODE_NOT_FOUND' }, { status: 404 });
    }

    // Resolve the referee's uuid from their auth_id (they're a registered user).
    const refereeLookup = await db.execute(sql`
      SELECT id FROM user_profiles WHERE auth_id = ${refereeAuthId} LIMIT 1
    `);
    const refereeUserId = ((refereeLookup as unknown as { rows?: { id: string }[] }).rows
      ?? (refereeLookup as unknown as { id: string }[]))[0]?.id;
    if (!refereeUserId) {
      // eslint-disable-next-line -- undici Response vs global Response (baseline pattern)
      return Response.json({ error: 'Referee not registered', code: 'REFEREE_NOT_FOUND' }, { status: 400 }) as unknown as Response;
    }
    if (referrerUserId === refereeUserId) {
      return Response.json({ error: 'Cannot self-refer', code: 'SELF_REFERRAL' }, { status: 400 });
    }

    // 2. Atomic insert + bonuses. The PK on referee_auth_id is the dedupe gate —
    //    if the same referee tries again, the INSERT fails and we exit cleanly.
    try {
      await db.execute(sql`
        WITH inserted AS (
          INSERT INTO referrals (referee_user_id, referrer_user_id, invite_code, signup_bonus_paid)
          VALUES (${refereeUserId}, ${referrerUserId}, ${inviteCode}, true)
          RETURNING referee_user_id
        ),
        bonus_referrer AS (
          INSERT INTO coin_events (user_id, amount, source)
          SELECT ${referrerUserId}, ${SIGNUP_BONUS_COINS}, 'referral-signup-bonus'
          FROM inserted
        ),
        bonus_referee AS (
          INSERT INTO coin_events (user_id, amount, source)
          SELECT ${refereeUserId}, ${SIGNUP_BONUS_COINS}, 'referral-signup-bonus'
          FROM inserted
        )
        SELECT 1
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        return Response.json(
          { error: 'Already redeemed an invite code', code: 'ALREADY_REDEEMED' },
          { status: 409 },
        );
      }
      throw err;
    }

    const body_out: RedeemSuccess = {
      ok: true,
      referrerAuthId,
      bonusGranted: SIGNUP_BONUS_COINS,
    };
    return Response.json(body_out);
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/redeem POST');
  }
}
