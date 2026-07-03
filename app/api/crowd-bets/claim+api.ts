/**
 * POST /api/crowd-bets/claim  — credit a user's SETTLED predictions, once.
 *
 * Called on app-open. Atomically (single CTE = one Postgres txn):
 *   1. stamps `claimed_at` on every won/refunded, not-yet-claimed stake, and
 *   2. adds the summed payout to `user_profiles.coins` (server-authoritative).
 * Dedupe is the `claimed_at IS NULL` guard — a second call credits 0. Returns the
 * new balance + the per-prediction results that drive the "צדקת בזמן שהיית בחוץ"
 * banner. Auth = X-Sync-Token (same as /place).
 */

import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

interface ClaimRow {
  question_id: string;
  choice_id: string;
  status: string;
  payout: number;
  winning_choice_id: string | null;
  new_balance: number | null;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-bets-claim', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json().catch(() => ({}))) as { authId?: string };
    const authId = sanitizeString(body.authId, 254);
    if (!authId) return json({ error: 'Missing authId' }, { status: 400 });

    const db = getDb();
    const users = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken, coins: userProfiles.coins })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = users[0];
    if (!user) return json({ error: 'Unknown user' }, { status: 401 });
    if (!validateSyncAuth(request, user.syncToken)) return json({ error: 'Unauthorized' }, { status: 401 });

    // Atomic claim + credit in one statement (Postgres runs a CTE as one txn).
    const result = await db.execute(sql`
      WITH claimed AS (
        UPDATE crowd_bets
        SET claimed_at = now()
        WHERE user_id = ${user.id}
          AND status IN ('won', 'refunded')
          AND claimed_at IS NULL
        RETURNING question_id, choice_id, status, COALESCE(payout, 0) AS payout, winning_choice_id
      ), credit AS (
        UPDATE user_profiles
        SET coins = COALESCE(coins, 0) + COALESCE((SELECT SUM(payout) FROM claimed), 0)
        WHERE id = ${user.id}
        RETURNING coins
      )
      SELECT c.question_id, c.choice_id, c.status, c.payout, c.winning_choice_id,
             (SELECT coins FROM credit) AS new_balance
      FROM claimed c
    `);
    const rows = result.rows as unknown as ClaimRow[];

    const credited = rows.reduce((s, r) => s + (r.payout ?? 0), 0);
    const newBalance = rows[0]?.new_balance ?? user.coins ?? 0;
    const results = rows.map((r) => ({
      questionId: r.question_id,
      choiceId: r.choice_id,
      won: r.status === 'won',
      payout: r.payout ?? 0,
      winningChoiceId: r.winning_choice_id,
    }));

    return json({ ok: true, credited, newBalance, results });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-bets/claim POST');
  }
}
