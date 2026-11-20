import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_shared/db';
import { parseBanditEvent, recordBanditEvent } from '../_shared/bandit';

/** POST /api/bandit/event — anonymously records one bandit event globally. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = parseBanditEvent(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error });
    }

    await recordBanditEvent(getDb(), parsed.experimentId, parsed.variantId, parsed.event);

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[bandit/event]', message, err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
}
