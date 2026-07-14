import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface PingBody {
  authId?: string;
}

// ── Streak math — MUST mirror api/sync/streak.ts exactly ────────────────────
// The 2026-07-14 "frozen streak" bug: this endpoint used to write
// lastActiveDate = UTC-today WITHOUT touching the streak. On every foreground
// it raced the daily streak POST; when ping won, the streak endpoint saw
// last === today, treated the day as already counted, and returned the streak
// UNCHANGED — freezing users at 2/5/7 for days (Yoav's header showed 2 on a
// real 4-day run). It also wrote the UTC calendar, which between 00:00-03:00
// Israel time is *yesterday*. The fix: ping performs the SAME IL-zoned,
// streak-aware update as /api/sync/streak, so whichever endpoint runs first
// counts the day correctly and the other becomes a true no-op.

function todayIsraelDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function diffDays(later: string, earlier: string): number {
  const a = new Date(later + 'T00:00:00Z').getTime();
  const b = new Date(earlier + 'T00:00:00Z').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

// Shabbat bridge (see api/sync/streak.ts): Fri → Sun keeps the streak, +2.
function isFriday(dateIl: string): boolean {
  return new Date(dateIl + 'T12:00:00Z').getUTCDay() === 5;
}

/**
 * POST /api/users/ping — marks the calling user as active today.
 * Body: { authId: string }
 *
 * Called fire-and-forget by the client when the app foregrounds (see
 * useFunStore.markActiveToday). Feeds the daily-email cron's inactivity
 * check AND advances the streak with the exact /api/sync/streak semantics
 * (IL calendar, Shabbat bridge, idempotent per day).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as PingBody;
    const authId = body?.authId;
    if (!authId || typeof authId !== 'string') {
      return res.status(400).json({ error: 'Missing authId' });
    }

    const db = getDb();
    const today = todayIsraelDate();

    const rows = await db
      .select({
        currentStreak: userProfiles.currentStreak,
        longestStreak: userProfiles.longestStreak,
        lastActiveDate: userProfiles.lastActiveDate,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, authId))
      .limit(1);

    const cur = rows[0];
    let newCurrent = cur?.currentStreak ?? 0;
    let newLongest = cur?.longestStreak ?? 0;
    const last = cur?.lastActiveDate ?? null;

    if (last === today) {
      // Already counted today — pure no-op (don't rewrite, don't race).
      return res.status(200).json({ ok: true, date: today });
    }

    if (!last) {
      newCurrent = 1;
    } else {
      const diff = diffDays(today, last);
      if (diff === 1) newCurrent = (cur?.currentStreak ?? 0) + 1;
      else if (diff === 2 && isFriday(last)) newCurrent = (cur?.currentStreak ?? 0) + 2;
      else if (diff > 1) newCurrent = 1;
      else {
        // diff <= 0 or NaN (clock skew / malformed stored date): never rewind
        // lastActiveDate and never touch the streak.
        return res.status(200).json({ ok: true, date: today });
      }
    }

    if (newCurrent > newLongest) newLongest = newCurrent;

    await db
      .update(userProfiles)
      .set({
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: today,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.authId, authId));

    return res.status(200).json({ ok: true, date: today });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[users/ping] failed', err);
    return res.status(500).json({ error: message });
  }
}
