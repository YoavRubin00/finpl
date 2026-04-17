import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userFeedback, userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';
import { eq } from 'drizzle-orm';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface FeedbackBody {
  authId?: string;
  message: string;
}

async function resolveUserId(db: ReturnType<typeof getDb>, authId: string): Promise<string | null> {
  if (!authId) return null;
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);

  return rows[0]?.id ?? null;
}

/** POST /api/sync/feedback — submit user feedback */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-feedback-post', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as FeedbackBody;
    const authId = sanitizeString(body.authId, 254) ?? 'guest';
    const message = sanitizeString(body.message, 2000);

    if (!message) {
      return Response.json({ error: 'Missing message' }, { status: 400 });
    }

    const db = getDb();
    
    let userId: string | null = null;
    if (authId !== 'guest') {
      userId = await resolveUserId(db, authId);
    }
    
    // Store either user UUID or anonymous auth ID string
    const finalStoredId = userId ?? authId;

    await db
      .insert(userFeedback)
      .values({
        userId: finalStoredId,
        message,
      });

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/feedback POST');
  }
}
