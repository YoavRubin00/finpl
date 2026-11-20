/**
 * Crowd-question vote counting, shared by both API trees:
 *   api/crowd-question/{stats,vote}.ts         (what production runs)
 *   app/api/crowd-question/{stats,vote}+api.ts  (expo-router dev server)
 * The SQL and response fields are unchanged; only the plumbing moved here.
 */
import { sql } from 'drizzle-orm';
import { crowdQuestionVotes } from '../../src/db/schema';
import type { Db } from './db';

export const CQ_ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const CQ_QUESTION_ID_RE = /^[a-z0-9-]{1,80}$/i;

export interface CrowdCounts {
  countA: number;
  countB: number;
  total: number;
}

function countsQuery(db: Db, questionId: string, voteDateIL: string) {
  // Served by idx_cq_votes_question_date (question_id, vote_date_il).
  return db.execute(sql`
    SELECT choice, COUNT(*)::int AS count
    FROM crowd_question_votes
    WHERE question_id = ${questionId} AND vote_date_il = ${voteDateIL}
    GROUP BY choice
  `);
}

function toCounts(result: { rows: unknown[] }): CrowdCounts {
  let countA = 0;
  let countB = 0;
  for (const row of result.rows as Array<{ choice: string; count: number }>) {
    if (row.choice === 'a') countA = row.count;
    else if (row.choice === 'b') countB = row.count;
  }
  return { countA, countB, total: countA + countB };
}

/** Current a/b counts for one question on one Israel-local date. */
export async function getCrowdCounts(db: Db, questionId: string, voteDateIL: string): Promise<CrowdCounts> {
  return toCounts(await countsQuery(db, questionId, voteDateIL));
}

/**
 * Records one vote (first vote per user per Israel-local day wins — same
 * ON CONFLICT DO NOTHING as before) and returns the fresh counts. Both
 * statements go to Neon in ONE HTTP round trip via db.batch (in order, inside
 * one transaction) instead of two sequential awaits.
 */
export async function recordCrowdVote(
  db: Db,
  args: { userId: string; questionId: string; choice: 'a' | 'b'; voteDateIL: string },
): Promise<CrowdCounts> {
  const insert = db
    .insert(crowdQuestionVotes)
    .values({ userId: args.userId, questionId: args.questionId, choice: args.choice, voteDateIl: args.voteDateIL })
    .onConflictDoNothing({ target: [crowdQuestionVotes.userId, crowdQuestionVotes.voteDateIl] });
  const [, counts] = await db.batch([insert, countsQuery(db, args.questionId, args.voteDateIL)]);
  return toCounts(counts);
}
