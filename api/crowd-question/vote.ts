import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { CQ_ISO_DATE_RE as ISO_DATE_RE, CQ_QUESTION_ID_RE as QUESTION_ID_RE, recordCrowdVote } from '../_shared/crowdQuestion';

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

function validateSyncAuth(req: VercelRequest, dbSyncToken: string | null | undefined): boolean {
  if (!dbSyncToken) return true;
  const headerToken = req.headers['x-sync-token'];
  const provided = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  return provided === dbSyncToken;
}

interface VoteBody {
  authId: string;
  questionId: string;
  choice: 'a' | 'b';
  voteDateIL: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as Partial<VoteBody>;
    const authId = sanitizeString(body.authId, 254);
    const questionId = sanitizeString(body.questionId, 80);
    const choice = body.choice;
    const voteDateIL = sanitizeString(body.voteDateIL, 10);

    if (!authId || !questionId || !voteDateIL) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (choice !== 'a' && choice !== 'b') {
      return res.status(400).json({ error: 'Invalid choice' });
    }
    if (!ISO_DATE_RE.test(voteDateIL)) {
      return res.status(400).json({ error: 'Invalid voteDateIL' });
    }
    if (!QUESTION_ID_RE.test(questionId)) {
      return res.status(400).json({ error: 'Invalid questionId' });
    }

    const db = getDb();
    const userRows = await db
      .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    const user = userRows[0] ?? null;

    if (!user) {
      return res.status(401).json({ error: 'Unknown user' });
    }
    if (!validateSyncAuth(req, user.syncToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Insert + fresh counts in one DB round trip (see recordCrowdVote).
    const { countA, countB, total } = await recordCrowdVote(db, {
      userId: user.id,
      questionId,
      choice,
      voteDateIL,
    });

    return res.status(200).json({ ok: true, countA, countB, total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[crowd-question/vote]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}