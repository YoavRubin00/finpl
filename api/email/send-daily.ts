import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runDailyEmailBatch } from '../_shared/sendDailyEmails';

/**
 * POST /api/email/send-daily — invoked by the Vercel cron defined in vercel.json.
 * Header: `Authorization: Bearer <CRON_SECRET>` (Vercel sets this automatically for crons).
 *
 * Sends a re-engagement email to inactive users with a per-user 3-day cooldown.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  const headerSecret = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (Array.isArray(req.headers['x-cron-secret']) ? req.headers['x-cron-secret'][0] : req.headers['x-cron-secret']);

  if (!headerSecret || headerSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runDailyEmailBatch();
    console.info(`[send-daily] batch done: sent=${result.sent} failed=${result.failed} total=${result.total} (${result.targeting})`);
    return res.status(200).json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[send-daily] batch crashed', err);
    return res.status(500).json({ error: message });
  }
}
