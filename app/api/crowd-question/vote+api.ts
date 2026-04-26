import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { crowdQuestionVotes, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

interface VoteBody {
  authId: string;
  questionId: string;
  choice: 'a' | 'b';
  voteDateIL: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QUESTION_ID_RE = /^[a-z0-9-]{1,80}$/i;

async function resolveUser(
  db: ReturnType<typeof getDb>,
  authId: string,
): Promise<{ id: string; syncToken: string | null } | null> {
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0] ?? null;
}

/** POST /api/crowd-question/vote — record one vote per user per Israel-local day. */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'crowd-question-vote', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as Partial<VoteBody>;
    const authId = sanitizeString(body.authId, 254);
    const questionId = sanitizeString(body.questionId, 80);
    const choice = body.choice;
    const voteDateIL = sanitizeString(body.voteDateIL, 10);

    if (!authId || !questionId || !voteDateIL) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (choice !== 'a' && choice !== 'b') {
      return Response.json({ error: 'Invalid choice' }, { status: 400 });
    }
    if (!ISO_DATE_RE.test(voteDateIL)) {
      return Response.json({ error: 'Invalid voteDateIL' }, { status: 400 });
    }
    if (!QUESTION_ID_RE.test(questionId)) {
      return Response.json({ error: 'Invalid questionId' }, { status: 400 });
    }

    const db = getDb();
    const user = await resolveUser(db, authId);

    if (!user) {
      return Response.json({ error: 'Unknown user' }, { status: 401 });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .insert(crowdQuestionVotes)
      .values({ userId: user.id, questionId, choice, voteDateIl: voteDateIL })
      .onConflictDoNothing({ target: [crowdQuestionVotes.userId, crowdQuestionVotes.voteDateIl] });

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
    return safeErrorResponse(err, 'crowd-question/vote POST');
  }
}