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

interface CollectBody {
  authId: string;
}

interface CollectSuccess {
  ok: true;
  amount: number;
  alreadyCollected?: false;
}

interface CollectAlready {
  ok: true;
  amount: 0;
  alreadyCollected: true;
}

/**
 * POST /api/referral/collect
 *
 * Computes today's dividend (5% of all friends' yesterday learning coins) and
 * inserts it into dividend_collections. The PK (auth_id, date_collected)
 * prevents double-collection — a second call the same day returns
 * `alreadyCollected: true` with amount 0.
 *
 * Also writes a coin_events row with source 'referral-dividend' so the daily
 * dividend itself is excluded from FUTURE dividend calculations (the recursive
 * path is gated by source IN ('lesson','quiz','daily-quest') in /me).
 *
 * Note: this is the only place coins are granted to the referrer for the
 * dividend. The client must call /api/referral/me again afterwards to refresh
 * the UI, OR the client can locally addCoins(amount) on success.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'referral-collect', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as CollectBody;
    const authId = sanitizeString(body.authId, 128);
    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }

    const db = getDb();

    // 1. Compute today's would-be dividend.
    const sumResult = await db.execute(sql`
      SELECT COALESCE(SUM(ce.amount), 0)::int AS total_yesterday
        FROM referrals r
        JOIN coin_events ce
          ON ce.auth_id = r.referee_auth_id
         AND ce.source IN ('lesson','quiz','daily-quest')
         AND ce.granted_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day')
         AND ce.granted_at <  date_trunc('day', now() AT TIME ZONE 'UTC')
       WHERE r.referrer_auth_id = ${authId}
    `);
    const sumRow =
      ((sumResult as unknown as { rows?: { total_yesterday: number | string }[] }).rows?.[0])
      ?? ((sumResult as unknown as { total_yesterday: number | string }[])[0]);
    const totalYesterday = Number(sumRow?.total_yesterday ?? 0) || 0;
    const dividendAmount = Math.floor(totalYesterday * DIVIDEND_RATE);

    if (dividendAmount <= 0) {
      // Nothing to collect today, but record a 0-row to mark "checked today" — this prevents
      // repeated DB hits. PK prevents duplicates.
      try {
        await db.execute(sql`
          INSERT INTO dividend_collections (auth_id, date_collected, amount)
          VALUES (
            ${authId},
            (date_trunc('day', now() AT TIME ZONE 'UTC'))::date,
            0
          )
          ON CONFLICT (auth_id, date_collected) DO NOTHING
        `);
      } catch { /* benign — already exists */ }

      const responseBody: CollectAlready = {
        ok: true,
        amount: 0,
        alreadyCollected: true,
      };
      return Response.json(responseBody);
    }

    // 2. Atomic insert (PK gates double-collect) + grant the dividend as a coin_event.
    try {
      await db.execute(sql`
        WITH inserted AS (
          INSERT INTO dividend_collections (auth_id, date_collected, amount)
          VALUES (
            ${authId},
            (date_trunc('day', now() AT TIME ZONE 'UTC'))::date,
            ${dividendAmount}
          )
          RETURNING auth_id
        )
        INSERT INTO coin_events (auth_id, amount, source)
        SELECT ${authId}, ${dividendAmount}, 'referral-dividend'
          FROM inserted
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        // Already collected today.
        const responseBody: CollectAlready = {
          ok: true,
          amount: 0,
          alreadyCollected: true,
        };
        return Response.json(responseBody);
      }
      throw err;
    }

    const responseBody: CollectSuccess = {
      ok: true,
      amount: dividendAmount,
      alreadyCollected: false,
    };
    return Response.json(responseBody);
  } catch (err: unknown) {
    return safeErrorResponse(err, 'referral/collect POST');
  }
}
