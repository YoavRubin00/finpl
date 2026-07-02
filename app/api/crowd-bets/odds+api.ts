/**
 * GET /api/crowd-bets/odds?questionId=...
 *
 * Live parimutuel odds for a crowd-wisdom question.
 * The price is set by the pool in real time: the more coins sit on a choice,
 * the lower its payout — consensus is cheap, contrarian conviction pays.
 *
 *   odds(choice) = clamp( (totalPool × (1 − MARGIN)) / poolOn(choice), 1.05, 10 )
 *
 * VIRTUAL_SEED adds phantom liquidity per choice so the first bets don't see
 * absurd odds while the pool is still thin.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

const QUESTION_ID_RE = /^[a-z0-9_-]{1,80}$/i;
const MARGIN = 0.05;
const VIRTUAL_SEED = 100;
const MIN_ODDS = 1.05;
const MAX_ODDS = 10;

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

export interface ChoiceOdds {
  choiceId: string;
  pool: number;
  odds: number;
}

export function computeOdds(pools: Record<string, number>, choiceIds: string[]): ChoiceOdds[] {
  const seeded = choiceIds.map((id) => ({
    choiceId: id,
    pool: (pools[id] ?? 0) + VIRTUAL_SEED,
  }));
  const totalPool = seeded.reduce((sum, c) => sum + c.pool, 0);
  return seeded.map((c) => ({
    choiceId: c.choiceId,
    pool: Math.max(0, c.pool - VIRTUAL_SEED),
    odds: parseFloat(
      Math.min(MAX_ODDS, Math.max(MIN_ODDS, (totalPool * (1 - MARGIN)) / c.pool)).toFixed(2),
    ),
  }));
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-bets-odds', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const questionId = sanitizeString(url.searchParams.get('questionId') ?? '', 80);
    const choicesParam = sanitizeString(url.searchParams.get('choices') ?? '', 400) ?? '';
    const choiceIds = choicesParam.split(',').map((c) => c.trim()).filter((c) => /^[a-z0-9_-]{1,40}$/i.test(c));

    if (!questionId || !QUESTION_ID_RE.test(questionId) || choiceIds.length < 2) {
      return Response.json({ error: 'Invalid questionId or choices' }, { status: 400 });
    }

    const db = getDb();
    const rows = await db.execute(sql`
      SELECT choice_id, COALESCE(SUM(stake), 0)::int AS pool
      FROM crowd_bets
      WHERE question_id = ${questionId} AND status = 'pending'
      GROUP BY choice_id
    `);

    const pools: Record<string, number> = {};
    for (const row of rows.rows as Array<{ choice_id: string; pool: number }>) {
      pools[row.choice_id] = row.pool;
    }

    return Response.json({ ok: true, questionId, odds: computeOdds(pools, choiceIds) });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-bets/odds GET');
  }
}
