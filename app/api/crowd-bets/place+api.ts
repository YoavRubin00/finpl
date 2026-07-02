/**
 * POST /api/crowd-bets/place
 *
 * Places a coin bet on a crowd-wisdom choice. One bet per user per question.
 * Odds are parimutuel — computed live from the pool AT PLACEMENT and locked
 * into the bet row (payout on resolution = stake × locked_odds).
 */

import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { crowdBets, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { computeOdds } from './odds+api';

const QUESTION_ID_RE = /^[a-z0-9_-]{1,80}$/i;
const CHOICE_ID_RE = /^[a-z0-9_-]{1,40}$/i;
const MIN_STAKE = 10;
const MAX_STAKE = 1000;

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

interface PlaceBody {
  authId: string;
  questionId: string;
  choiceId: string;
  choiceIds: string[];
  stake: number;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-bets-place', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as Partial<PlaceBody>;
    const authId = sanitizeString(body.authId, 254);
    const questionId = sanitizeString(body.questionId, 80);
    const choiceId = sanitizeString(body.choiceId, 40);
    const stake = Number(body.stake);
    const choiceIds = Array.isArray(body.choiceIds)
      ? body.choiceIds
          .map((c) => sanitizeString(String(c), 40) ?? '')
          .filter((c) => CHOICE_ID_RE.test(c))
      : [];

    if (!authId || !questionId || !choiceId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!QUESTION_ID_RE.test(questionId) || !CHOICE_ID_RE.test(choiceId)) {
      return Response.json({ error: 'Invalid ids' }, { status: 400 });
    }
    if (!Number.isInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
      return Response.json({ error: `Stake must be ${MIN_STAKE}-${MAX_STAKE}` }, { status: 400 });
    }
    if (choiceIds.length < 2 || !choiceIds.includes(choiceId)) {
      return Response.json({ error: 'Invalid choices' }, { status: 400 });
    }

    const db = getDb();
    const rows = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = rows[0];
    if (!user) {
      return Response.json({ error: 'Unknown user' }, { status: 401 });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Live pool → odds at placement time.
    const poolRows = await db.execute(sql`
      SELECT choice_id, COALESCE(SUM(stake), 0)::int AS pool
      FROM crowd_bets
      WHERE question_id = ${questionId} AND status = 'pending'
      GROUP BY choice_id
    `);
    const pools: Record<string, number> = {};
    for (const row of poolRows.rows as Array<{ choice_id: string; pool: number }>) {
      pools[row.choice_id] = row.pool;
    }
    const oddsTable = computeOdds(pools, choiceIds);
    const lockedOdds = oddsTable.find((o) => o.choiceId === choiceId)?.odds ?? 2;

    const inserted = await db
      .insert(crowdBets)
      .values({ userId: user.id, questionId, choiceId, stake, lockedOdds })
      .onConflictDoNothing({ target: [crowdBets.userId, crowdBets.questionId] })
      .returning({ id: crowdBets.id });

    if (inserted.length === 0) {
      return Response.json({ error: 'כבר יש לכם הימור על השאלה הזו' }, { status: 409 });
    }

    // Fresh odds after this bet moved the pool.
    pools[choiceId] = (pools[choiceId] ?? 0) + stake;
    return Response.json({
      ok: true,
      betId: inserted[0].id,
      lockedOdds,
      potentialPayout: Math.round(stake * lockedOdds),
      odds: computeOdds(pools, choiceIds),
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-bets/place POST');
  }
}
