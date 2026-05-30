/**
 * POST /api/breaking-news/generate
 *
 * On-demand generation for a single ticker. Called by the client right
 * after a user *adds* a ticker to their watchlist — without this, the
 * user would have to wait until the next cron run (up to 24h) to see
 * their first summary, which would feel broken.
 *
 * Auth: requires `X-Sync-Token` matching the caller's `user_profiles.sync_token`.
 * Rate limit: 5/hr per user (AI is the expensive bit).
 */

import { eq } from 'drizzle-orm';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { generateForTicker, getDb } from './_lib';

interface GenerateBody {
  authId?: string;
  ticker?: string;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'breaking-news-generate', { limit: 5, windowSec: 3600 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as GenerateBody;
    const authId = sanitizeString(body.authId, 254);
    const ticker = sanitizeString(body.ticker, 16)?.toUpperCase();

    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!ticker) return Response.json({ error: 'Missing ticker' }, { status: 400 });

    // Auth check against the user's sync token.
    const db = getDb();
    const profile = await db
      .select({ syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    if (!validateSyncAuth(request, profile[0]?.syncToken ?? null)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateForTicker(ticker);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return safeErrorResponse(err, 'breaking-news/generate');
  }
}
