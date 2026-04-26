import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QUESTION_ID_RE = /^[a-z0-9-]{1,80}$/i;

/** GET /api/crowd-question/stats?questionId=X&voteDateIL=YYYY-MM-DD */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-question-stats', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const questionId = sanitizeString(url.searchParams.get('questionId'), 80);
    const voteDateIL = sanitizeString(url.searchParams.get('voteDateIL'), 10);

    if (!questionId || !voteDateIL) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    if (!QUESTION_ID_RE.test(questionId)) {
      return Response.json({ error: 'Invalid questionId' }, { status: 400 });
    }
    if (!ISO_DATE_RE.test(voteDateIL)) {
      return Response.json({ error: 'Invalid voteDateIL' }, { status: 400 });
    }

    const db = getDb();
    const counts = await db.execute(sql`
      SELECT choice, COUNT(*)::int AS count
      FROM crowd_question_votes
      WHERE question_id = ${questionId} AND vote_date_il = ${voteDateIL}
      GROUP BY choice
    `);

    let countA = 0;
    let countB = 0;
    for (const row of counts.rows as Array<{ choice: string; count: number }>) {
      if (row.choice === 'a') countA = row.count;
      else if (row.choice === 'b') countB = row.count;
    }

    return Response.json({ ok: true, countA, countB, total: countA + countB });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-question/stats GET');
  }
}