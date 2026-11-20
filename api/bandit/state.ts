import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_shared/db';
import { BANDIT_STATE_CDN_CACHE, loadBanditState } from '../_shared/bandit';
import { CDN_CACHE_HEADER } from '../_shared/cdnCache';

/** GET /api/bandit/state — global alpha/beta for all variants, grouped by
 *  experiment. Public and identical for every caller, so the CDN answers it. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const experiments = await loadBanditState(getDb());
    res.setHeader(CDN_CACHE_HEADER, BANDIT_STATE_CDN_CACHE);
    return res.status(200).json({ ok: true, experiments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[bandit/state]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
