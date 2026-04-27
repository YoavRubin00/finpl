import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sqlClient = neon(url);
  return drizzle(sqlClient);
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QUESTION_ID_RE = /^[a-z0-9-]{1,80}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawQ = req.query.questionId;
    const rawD = req.query.voteDateIL;
    const questionId = sanitizeString(Array.isArray(rawQ) ? rawQ[0] : rawQ, 80);
    const voteDateIL = sanitizeString(Array.isArray(rawD) ? rawD[0] : rawD, 10);

    if (!questionId || !voteDateIL) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    if (!QUESTION_ID_RE.test(questionId)) {
      return res.status(400).json({ error: 'Invalid questionId' });
    }
    if (!ISO_DATE_RE.test(voteDateIL)) {
      return res.status(400).json({ error: 'Invalid voteDateIL' });
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

    return res.status(200).json({ ok: true, countA, countB, total: countA + countB });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[crowd-question/stats]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}