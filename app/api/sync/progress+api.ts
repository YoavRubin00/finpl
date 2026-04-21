import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { moduleProgress, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, clampNumber, validateSyncAuth } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface ProgressUpsertBody {
  authId: string;
  moduleId: string;
  moduleName?: string;
  status?: string;
  quizScore?: number;
  quizAttempts?: number;
  bestScore?: number;
  xpEarned?: number;
}

async function resolveUser(db: ReturnType<typeof getDb>, authId: string): Promise<{ id: string; syncToken: string | null } | null> {
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);

  return rows[0] ?? null;
}

const VALID_STATUSES = new Set(['in_progress', 'completed', 'skipped']);

/** GET /api/sync/progress?authId=xxx */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-progress-get', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);

    if (!authId) {
      return Response.json({ error: 'Missing authId query parameter' }, { status: 400 });
    }

    const db = getDb();
    const user = await resolveUser(db, authId);

    if (!user) {
      return Response.json({ ok: true, progress: [] });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, user.id));

    return Response.json({ ok: true, progress: rows });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/progress GET');
  }
}

/** POST /api/sync/progress, upsert module progress */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-progress-post', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as ProgressUpsertBody;
    const authId = sanitizeString(body.authId, 254);
    const moduleId = sanitizeString(body.moduleId, 128);

    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }
    if (!moduleId) {
      return Response.json({ error: 'Missing moduleId' }, { status: 400 });
    }

    const db = getDb();
    const user = await resolveUser(db, authId);

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawStatus = sanitizeString(body.status, 20) ?? 'completed';
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'completed';
    const completedAt = status === 'completed' ? new Date().toISOString() : undefined;
    const moduleName = sanitizeString(body.moduleName, 200) ?? undefined;
    const quizScore = clampNumber(body.quizScore, 0, 100);
    const quizAttempts = clampNumber(body.quizAttempts, 0, 1000);
    const bestScore = clampNumber(body.bestScore, 0, 100);
    const xpEarned = clampNumber(body.xpEarned, 0, 100_000);

    await db
      .insert(moduleProgress)
      .values({
        userId: user.id,
        moduleId,
        moduleName,
        status,
        quizScore,
        quizAttempts,
        bestScore,
        xpEarned,
        completedAt,
      })
      .onConflictDoUpdate({
        target: [moduleProgress.userId, moduleProgress.moduleId],
        set: {
          moduleName,
          status,
          quizScore,
          quizAttempts,
          bestScore,
          xpEarned,
          completedAt,
          updatedAt: new Date().toISOString(),
        },
      });

    const rows = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, user.id));

    return Response.json({ ok: true, progress: rows });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/progress POST');
  }
}
