// api/webhooks/revenuecat.ts: production entry for POST /api/webhooks/revenuecat.
// Logic (authentication, purchase credit and recording, Pro events):
// api/_shared/revenueCatWebhook.ts; SQL: api/_shared/economyStores.ts.
// The Expo Router twin app/api/webhooks/revenuecat+api.ts calls the same code.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRevenueCatWebhookDeps } from '../_shared/economyStores';
import { pgErrorCode } from '../_shared/pgError';
import { handleRevenueCatWebhook } from '../_shared/revenueCatWebhook';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const header = req.headers.authorization;
    const result = await handleRevenueCatWebhook(
      { authorization: typeof header === 'string' ? header : null, body: req.body },
      createRevenueCatWebhookDeps(),
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    // e.g. no DATABASE_URL. Generic body, no message (it can carry SQL).
    console.error(`[RevenueCat Webhook] ${JSON.stringify({ outcome: 'error', code: pgErrorCode(err), name: err instanceof Error ? err.name : typeof err })}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
