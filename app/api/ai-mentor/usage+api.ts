import { sql, eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

async function resolveUser(
  db: ReturnType<typeof getDb>,
  authId: string,
): Promise<{ id: string; syncToken: string | null } | null> {
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0] ?? null;
}

interface RawCountRow { count?: number | string; request_count?: number | string }

function extractCount(result: unknown): number {
  const r = result as { rows?: RawCountRow[] } | RawCountRow[] | null;
  const row =
    (r && 'rows' in (r as object) ? (r as { rows?: RawCountRow[] }).rows?.[0] : (r as RawCountRow[])?.[0]) ?? null;
  if (!row) return 0;
  const raw = row.count ?? row.request_count ?? 0;
  return Number(raw) || 0;
}

/**
 * GET /api/ai-mentor/usage?authId=xxx
 * Returns today's request count for this user, or 0 if no row yet.
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'ai-mentor-usage-get', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);
    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }

    const db = getDb();
    const user = await resolveUser(db, authId);
    if (!user) {
      return Response.json({ ok: true, count: 0 });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.execute(sql`
      SELECT request_count AS count
        FROM ai_mentor_usage
       WHERE user_id = ${user.id}::uuid
         AND usage_date = CURRENT_DATE
       LIMIT 1
    `);

    return Response.json({ ok: true, count: extractCount(result) });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai-mentor/usage GET');
  }
}

/**
 * POST /api/ai-mentor/usage  body: { authId }
 * Atomic UPSERT — increments today's request_count by 1, returns new count.
 * The local AsyncStorage cache in LifelineChatOverlay mirrors this, but the
 * server is source of truth so cross-device usage is enforced.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'ai-mentor-usage-post', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { authId?: string };
    const authId = sanitizeString(body.authId, 254);
    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }

    const db = getDb();
    const user = await resolveUser(db, authId);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.execute(sql`
      INSERT INTO ai_mentor_usage (user_id, usage_date, request_count)
      VALUES (${user.id}::uuid, CURRENT_DATE, 1)
      ON CONFLICT (user_id, usage_date)
        DO UPDATE SET request_count = ai_mentor_usage.request_count + 1
      RETURNING request_count
    `);

    return Response.json({ ok: true, count: extractCount(result) });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai-mentor/usage POST');
  }
}