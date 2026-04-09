import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, clampNumber } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface ProfileUpsertBody {
  authId: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  level?: number;
  xp?: number;
  coins?: number;
  gems?: number;
  currentStreak?: number;
  longestStreak?: number;
  isPro?: boolean;
}

/** GET /api/sync/profile?authId=xxx — fetch profile by authId */
export async function GET(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-profile-get', { limit: 30, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);

    if (!authId) {
      return Response.json({ error: 'Missing authId query parameter' }, { status: 400 });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);

    const profile = rows[0] ?? null;

    return Response.json({ ok: true, profile });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/profile GET');
  }
}

/** POST /api/sync/profile — upsert profile by authId */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-profile-post', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as ProfileUpsertBody;
    const authId = sanitizeString(body.authId, 254);

    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }

    // Sanitize & clamp all fields
    const displayName = sanitizeString(body.displayName, 100) ?? undefined;
    const email = sanitizeString(body.email, 254) ?? undefined;
    const avatarUrl = sanitizeString(body.avatarUrl, 500) ?? undefined;
    const level = clampNumber(body.level, 1, 999);
    const xp = clampNumber(body.xp, 0, 10_000_000);
    const coins = clampNumber(body.coins, 0, 10_000_000);
    const gems = clampNumber(body.gems, 0, 10_000_000);
    const currentStreak = clampNumber(body.currentStreak, 0, 3650);
    const longestStreak = clampNumber(body.longestStreak, 0, 3650);
    const isPro = typeof body.isPro === 'boolean' ? body.isPro : undefined;

    const db = getDb();

    await db
      .insert(userProfiles)
      .values({
        authId,
        displayName,
        email,
        avatarUrl,
        level,
        xp,
        coins,
        gems,
        currentStreak,
        longestStreak,
        isPro,
      })
      .onConflictDoUpdate({
        target: userProfiles.authId,
        set: {
          displayName,
          email,
          avatarUrl,
          level,
          xp,
          coins,
          gems,
          currentStreak,
          longestStreak,
          isPro,
          updatedAt: new Date().toISOString(),
        },
      });

    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);

    const profile = rows[0] ?? null;

    return Response.json({ ok: true, profile });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/profile POST');
  }
}

/** DELETE /api/sync/profile?authId=xxx — delete profile (Apple 5.1.1(v) account deletion) */
export async function DELETE(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-profile-delete', { limit: 5, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const url = new URL(request.url);
    const authId = sanitizeString(url.searchParams.get('authId'), 254);

    if (!authId) {
      return Response.json({ error: 'Missing authId query parameter' }, { status: 400 });
    }

    const db = getDb();
    await db.delete(userProfiles).where(eq(userProfiles.authId, authId));

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/profile DELETE');
  }
}
