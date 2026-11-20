import { json } from '../_shared/json';
import { createRevenueCatWebhookDeps } from '../../../api/_shared/economyStores';
import { handleRevenueCatWebhook, webhookSecret } from '../../../api/_shared/revenueCatWebhook';

/**
 * POST /api/webhooks/revenuecat (Expo Router twin).
 *
 * On the Vercel deploy ONLY `api/**` is served (vercel.json `functions`): the
 * live webhook is api/webhooks/revenuecat.ts. This twin runs the SAME code
 * (api/_shared/revenueCatWebhook.ts with the Neon wiring), so the two can't
 * drift again (until 2026-11-20 this file still guessed gems from the
 * product id's trailing digits, with no duplicate check).
 *
 * One difference on purpose: with no webhook secret configured this twin
 * refuses every event (as it always did), whatever the environment.
 */
export async function POST(request: Request): Promise<Response> {
  if (!webhookSecret(process.env)) {
    return json({ error: 'Webhook not configured' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid payload' }, { status: 400 });
  }
  try {
    const result = await handleRevenueCatWebhook(
      { authorization: request.headers.get('authorization'), body },
      createRevenueCatWebhookDeps(),
    );
    return json(result.body, { status: result.status });
  } catch {
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
