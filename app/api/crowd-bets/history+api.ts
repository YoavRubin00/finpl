/**
 * GET /api/crowd-bets/history?questionId=...&choices=a,b
 *
 * Polymarket-style probability-over-time series, reconstructed from the real
 * bet ledger: walking the bets chronologically, each point is the implied
 * probability (pool share incl. virtual seed) after that bet landed.
 * No synthetic data — an empty market returns a flat 1/N line.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

const QUESTION_ID_RE = /^[a-z0-9_-]{1,80}$/i;
const VIRTUAL_SEED = 100;
const MAX_POINTS = 60;

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

interface HistoryPoint {
  t: string;
  probs: Record<string, number>;
}

function probsFromPools(pools: Record<string, number>, choiceIds: string[]): Record<string, number> {
  const seeded = choiceIds.map((id) => (pools[id] ?? 0) + VIRTUAL_SEED);
  const total = seeded.reduce((sum, p) => sum + p, 0);
  const probs: Record<string, number> = {};
  choiceIds.forEach((id, i) => {
    probs[id] = parseFloat(((seeded[i] / total) * 100).toFixed(1));
  });
  return probs;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-bets-history', { limit: 30, windowSec: 60 });
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
      SELECT choice_id, stake, created_at
      FROM crowd_bets
      WHERE question_id = ${questionId} AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 500
    `);

    const pools: Record<string, number> = {};
    const series: HistoryPoint[] = [
      { t: '', probs: probsFromPools(pools, choiceIds) }, // opening line (uniform)
    ];
    for (const row of rows.rows as Array<{ choice_id: string; stake: number; created_at: string }>) {
      pools[row.choice_id] = (pools[row.choice_id] ?? 0) + row.stake;
      series.push({ t: row.created_at, probs: probsFromPools(pools, choiceIds) });
    }

    // Downsample long ledgers — keep the shape, cap the payload.
    const sampled =
      series.length <= MAX_POINTS
        ? series
        : series.filter((_, i) => i === 0 || i === series.length - 1 || i % Math.ceil(series.length / MAX_POINTS) === 0);

    return Response.json({
      ok: true,
      questionId,
      betCount: rows.rows.length,
      current: series[series.length - 1].probs,
      series: sampled,
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-bets/history GET');
  }
}
