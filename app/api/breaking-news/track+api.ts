/**
 * POST   /api/breaking-news/track   — add a ticker to the caller's watchlist
 * DELETE /api/breaking-news/track   — remove a ticker
 *
 * The free-tier cap (1 ticker) is enforced *client-side* via
 * `useSubscriptionStore.canAccessFeature('breaking-news')` because it
 * controls the user-facing upgrade modal. The server still rejects payloads
 * with an empty/invalid ticker but trusts the client on the count — same
 * security posture as the rest of the app's subscription gating.
 *
 * Auth: `X-Sync-Token` validated against `user_profiles.sync_token`.
 */

import { and, eq } from 'drizzle-orm';
import { breakingNewsTracked, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';
import { getDb } from './_lib';

interface TrackBody {
  authId?: string;
  ticker?: string;
}

async function resolveUser(authId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0] ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'breaking-news-track-post', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as TrackBody;
    const authId = sanitizeString(body.authId, 254);
    const ticker = sanitizeString(body.ticker, 16)?.toUpperCase();
    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!ticker) return Response.json({ error: 'Missing ticker' }, { status: 400 });

    const user = await resolveUser(authId);
    if (!validateSyncAuth(request, user?.syncToken ?? null) || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    await db
      .insert(breakingNewsTracked)
      .values({ userId: user.id, ticker })
      // No-op on dup so the client can call this safely even if the user
      // already tracks the ticker (the UI should hide that case but races happen).
      .onConflictDoNothing({ target: [breakingNewsTracked.userId, breakingNewsTracked.ticker] });

    return Response.json({ ok: true, ticker });
  } catch (err) {
    return safeErrorResponse(err, 'breaking-news/track POST');
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'breaking-news-track-delete', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);
    const ticker = sanitizeString(url.searchParams.get('ticker'), 16)?.toUpperCase();
    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!ticker) return Response.json({ error: 'Missing ticker' }, { status: 400 });

    const user = await resolveUser(authId);
    if (!validateSyncAuth(request, user?.syncToken ?? null) || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    await db
      .delete(breakingNewsTracked)
      .where(and(
        eq(breakingNewsTracked.userId, user.id),
        eq(breakingNewsTracked.ticker, ticker),
      ));

    return Response.json({ ok: true, ticker });
  } catch (err) {
    return safeErrorResponse(err, 'breaking-news/track DELETE');
  }
}
