import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_shared/db';
import { CQ_ISO_DATE_RE, CQ_QUESTION_ID_RE, getCrowdCounts } from '../_shared/crowdQuestion';

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.trim().slice(0, maxLength) || undefined;
}

/** GET /api/crowd-question/stats?questionId=X&voteDateIL=YYYY-MM-DD */
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
    if (!CQ_QUESTION_ID_RE.test(questionId)) {
      return res.status(400).json({ error: 'Invalid questionId' });
    }
    if (!CQ_ISO_DATE_RE.test(voteDateIL)) {
      return res.status(400).json({ error: 'Invalid voteDateIL' });
    }

    const { countA, countB, total } = await getCrowdCounts(getDb(), questionId, voteDateIL);
    return res.status(200).json({ ok: true, countA, countB, total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[crowd-question/stats]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
