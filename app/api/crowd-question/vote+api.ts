import { eq } from 'drizzle-orm';
import { userProfiles } from '../../../src/db/schema';
import { getDb } from '../../../api/_shared/db';
import {
  CQ_ISO_DATE_RE as ISO_DATE_RE,
  CQ_QUESTION_ID_RE as QUESTION_ID_RE,
  recordCrowdVote,
} from '../../../api/_shared/crowdQuestion';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';

interface VoteBody {
  authId: string;
  questionId: string;
  choice: 'a' | 'b';
  voteDateIL: string;
}

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

    // Insert + fresh counts in one DB round trip (api/_shared/crowdQuestion.ts).
    const { countA, countB, total } = await recordCrowdVote(db, {
      userId: user.id,
      questionId,
      choice,
      voteDateIL,
    });

    return Response.json({ ok: true, countA, countB, total });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-question/vote POST');
  }
}