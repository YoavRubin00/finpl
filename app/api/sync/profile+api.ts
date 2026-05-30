import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, clampNumber, validateSyncAuth } from '../_shared/validate';
import { sendWelcomeEmail } from '../../../api/_shared/sendWelcomeEmail';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

/**
 * Strips server-internal fields from a profile row before sending it to the
 * client. CRITICAL: `syncToken` is the auth credential itself — leaking it in
 * any response makes every sync endpoint trivially impersonatable. Email-flow
 * booleans (welcomeEmailSent / tipEmailSent / dailyEmail*) are server-internal
 * scheduling state with no client-side consumer.
 */
type ProfileRow = Awaited<ReturnType<typeof getDb>>['select'] extends never
  ? never
  : { [K in keyof typeof userProfiles.$inferSelect]: (typeof userProfiles.$inferSelect)[K] };

function publicProfile<T extends Partial<ProfileRow> | null>(row: T): T {
  if (!row) return row;
  // Destructure to discard server-internal fields; `_unused` is intentional.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    syncToken: _syncToken,
    welcomeEmailSent: _welcomeEmailSent,
    tipEmailSent: _tipEmailSent,
    dailyEmailSentAt: _dailyEmailSentAt,
    dailyEmailEnabled: _dailyEmailEnabled,
    ...safe
  } = row as Record<string, unknown>;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return safe as T;
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

/** GET /api/sync/profile?authId=xxx, fetch profile by authId */
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

    if (!validateSyncAuth(request, profile?.syncToken ?? null)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({ ok: true, profile: publicProfile(profile) });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/profile GET');
  }
}

/** POST /api/sync/profile, upsert profile by authId */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'sync-profile-post', { limit: 20, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as ProfileUpsertBody;
    const authId = sanitizeString(body.authId, 254);

    if (!authId) {
      return Response.json({ error: 'Missing authId' }, { status: 400 });
    }

    // Validate syncToken before any write (check existing row)
    const db = getDb();
    const existing = await db
      .select({ syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    if (!validateSyncAuth(request, existing[0]?.syncToken ?? null)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sanitize & clamp all fields
    const displayName = sanitizeString(body.displayName, 100) ?? undefined;
    const email = sanitizeString(body.email, 254) ?? undefined;
    const avatarUrl = sanitizeString(body.avatarUrl, 500) ?? undefined;
    const level = clampNumber(body.level, 1, 999);
    const xp = clampNumber(body.xp, 0, 500_000);
    const coins = clampNumber(body.coins, 0, 2_000_000);
    const gems = clampNumber(body.gems, 0, 50_000);
    const currentStreak = clampNumber(body.currentStreak, 0, 3650);
    const longestStreak = clampNumber(body.longestStreak, 0, 3650);
    const isPro = typeof body.isPro === 'boolean' ? body.isPro : undefined;

    // Build conditional UPDATE set — never include undefined fields. Drizzle's
    // behavior with `undefined` in `.set()` is version-dependent and has caused
    // data-loss incidents (xp/coins overwritten to 0 on login). See history in
    // legacy api/sync/profile.ts for the original bug.
    const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (displayName !== undefined) setFields.displayName = displayName;
    if (email !== undefined) setFields.email = email;
    if (avatarUrl !== undefined) setFields.avatarUrl = avatarUrl;
    if (level !== undefined) setFields.level = level;
    if (xp !== undefined) setFields.xp = xp;
    if (coins !== undefined) setFields.coins = coins;
    if (gems !== undefined) setFields.gems = gems;
    if (currentStreak !== undefined) setFields.currentStreak = currentStreak;
    if (longestStreak !== undefined) setFields.longestStreak = longestStreak;
    if (isPro !== undefined) setFields.isPro = isPro;

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
        set: setFields,
      });

    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);

    const profile = rows[0] ?? null;

    // Send welcome email on first-ever sync if it hasn't been sent yet. This
    // covers the email/password registration path which never hits
    // /api/auth/verify (only Google + Apple OAuth do). sendWelcomeEmail is
    // idempotent — it flips welcomeEmailSent=true on success — so a second
    // sync call won't re-send. Awaited because the function catches its own
    // errors and never throws.
    if (profile && !profile.welcomeEmailSent && profile.email) {
      await sendWelcomeEmail({
        db,
        userId: profile.id,
        email: profile.email,
        displayName: profile.displayName,
      });
    }

    return Response.json({ ok: true, profile: publicProfile(profile) });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/profile POST');
  }
}

/** DELETE /api/sync/profile?authId=xxx, delete profile (Apple 5.1.1(v) account deletion) */
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
    const delRows = await db
      .select({ syncToken: userProfiles.syncToken })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);
    if (!validateSyncAuth(request, delRows[0]?.syncToken ?? null)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await db.delete(userProfiles).where(eq(userProfiles.authId, authId));

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'sync/profile DELETE');
  }
}
