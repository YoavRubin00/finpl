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

/** Daily dividend rate, mirrored server-side. Must match `referralConstants.ts`. */
const DIVIDEND_RATE = 0.05;

interface ReferredFriendRow {
  authId: string;
  displayName: string | null;
  linkedAt: string;
  yesterdayLearningCoins: number;
}

interface MeResponse {
  ok: true;
  friends: ReferredFriendRow[];
  totalYesterdayLearningCoins: number;
  dividendAvailable: number;
  alreadyCollectedToday: boolean;
  todayDateUTC: string;
}

/**
 * GET /api/referral/me?authId=X
 *
 * Returns the user's referred friends with each friend's "yesterday learning
 * coins" plus the dividend available to collect today.
 *
 * "Yesterday" is computed in UTC (matches dividend_collections.date_collected
 * which is also UTC). The 5% rate is applied to the SUM of all friends'
 * yesterday coins from learning sources only.
 *
 * If the user already collected today, dividendAvailable is 0 and
 * alreadyCollectedToday is true — the UI should disable the collect button.
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-me', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 128);
    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }

    const db = getDb();

    // Fetch each referred friend + sum of their yesterday learning coins, joined
    // with user_profiles for display name. Single round-trip.
    const friendsResult = await db.execute(sql`
      SELECT
        r.referee_auth_id   AS auth_id,
        up.display_name     AS display_name,
        r.linked_at         AS linked_at,
        COALESCE((
          SELECT SUM(ce.amount)::int
            FROM coin_events ce
           WHERE ce.auth_id = r.referee_auth_id
             AND ce.source IN ('lesson','quiz','daily-quest')
             AND ce.granted_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day')
             AND ce.granted_at <  date_trunc('day', now() AT TIME ZONE 'UTC')
        ), 0) AS yesterday_learning_coins
      FROM referrals r
      LEFT JOIN user_profiles up ON up.auth_id = r.referee_auth_id
      WHERE r.referrer_auth_id = ${authId}
      ORDER BY r.linked_at DESC
    `);

    const rawRows = (friendsResult as unknown as { rows?: unknown[] }).rows
      ?? (friendsResult as unknown as unknown[]);
    const rows = Array.isArray(rawRows) ? rawRows : [];

    const friends: ReferredFriendRow[] = rows.map((r) => {
      const row = r as {
        auth_id: string;
        display_name: string | null;
        linked_at: string | Date;
        yesterday_learning_coins: number | string;
      };
      return {
        authId: row.auth_id,
        displayName: row.display_name ?? null,
        linkedAt:
          typeof row.linked_at === 'string' ? row.linked_at : row.linked_at.toISOString(),
        yesterdayLearningCoins: Number(row.yesterday_learning_coins) || 0,
      };
    });

    const totalYesterdayLearningCoins = friends.reduce(
      (sum, f) => sum + f.yesterdayLearningCoins,
      0,
    );
    const grossDividend = Math.floor(totalYesterdayLearningCoins * DIVIDEND_RATE);

    // Has the user already collected today?
    const todayResult = await db.execute(sql`
      SELECT 1 AS hit
        FROM dividend_collections
       WHERE auth_id = ${authId}
         AND date_collected = (date_trunc('day', now() AT TIME ZONE 'UTC'))::date
       LIMIT 1
    `);
    const todayRows =
      (todayResult as unknown as { rows?: unknown[] }).rows
      ?? (todayResult as unknown as unknown[]);
    const alreadyCollectedToday = Array.isArray(todayRows) && todayRows.length > 0;

    const dividendAvailable = alreadyCollectedToday ? 0 : grossDividend;

    const todayDateUTC = new Date().toISOString().slice(0, 10);

    const responseBody: MeResponse = {
      ok: true,
      friends,
      totalYesterdayLearningCoins,
      dividendAvailable,
      alreadyCollectedToday,
      todayDateUTC,
    };
    return Response.json(responseBody);
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/me GET');
  }
}
