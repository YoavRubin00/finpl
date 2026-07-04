// api/sync/streak.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface StreakActivityBody {
  dateIl: string; // YYYY-MM-DD in Israel timezone
}

function diffDays(later: string, earlier: string): number {
  const a = new Date(later + 'T00:00:00Z').getTime();
  const b = new Date(earlier + 'T00:00:00Z').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

// Shabbat bridge (Yoav 2026-07-04): Saturday is auto-credited. When the last
// active day was a Friday and today is the Sunday two days later, the only
// skipped day is שבת — the streak survives AND both Sat+Sun count (+2), so a
// Shabbat-observant user who plays Fri then Sun sees a 3-day streak. Anchored
// at noon-UTC so no offset nudges the weekday across a boundary. 5 = Friday.
function isFriday(dateIl: string): boolean {
  return new Date(dateIl + 'T12:00:00Z').getUTCDay() === 5;
}

// Server-side "today" in Israel time — the same calendar the client uses for
// dateIl (todayIsraelDate in src/features/economy/useStreak.ts). All streak
// math is IL-zoned, so reconciliation must be too.
function todayIsraelDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select({
        currentStreak: userProfiles.currentStreak,
        longestStreak: userProfiles.longestStreak,
        lastActiveDate: userProfiles.lastActiveDate,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);

    // Reconcile on read: a stored streak only "lives" if the last active day
    // was today or yesterday. Without this the GET returns the stale stored
    // peak — so a user whose streak lapsed (or who reinstalled: server still
    // holds 3 while the device's local activeDates shows only today) sees an
    // inflated "3" in the header that disagrees with the calendar. The DB is
    // NOT mutated here (GET stays a pure read); the day's first
    // recordDailyActivity POST rewrites currentStreak authoritatively (→ 1).
    // The server is freeze-blind by design (freeze magic is client-side), and
    // its POST path already resets on any gap > 1, so this read stays
    // consistent with that behaviour.
    const row = rows[0] ?? null;
    let streak = row;
    if (row?.lastActiveDate && row.currentStreak) {
      const gap = diffDays(todayIsraelDate(), row.lastActiveDate);
      // Shabbat bridge: a Fri→Sun gap (Saturday skipped) is still alive.
      const shabbatAlive = gap === 2 && isFriday(row.lastActiveDate);
      if (gap > 1 && !shabbatAlive) streak = { ...row, currentStreak: 0 };
    }
    return res.status(200).json({ ok: true, streak });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as StreakActivityBody;
    if (!body.dateIl || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateIl)) {
      return res.status(400).json({ error: 'Invalid dateIl (expected YYYY-MM-DD)' });
    }

    const rows = await db
      .select({
        currentStreak: userProfiles.currentStreak,
        longestStreak: userProfiles.longestStreak,
        lastActiveDate: userProfiles.lastActiveDate,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);

    const cur = rows[0];
    let newCurrent = cur?.currentStreak ?? 0;
    let newLongest = cur?.longestStreak ?? 0;
    const last = cur?.lastActiveDate ?? null;

    if (last === body.dateIl) {
      // Idempotent: already counted today.
    } else if (!last) {
      newCurrent = 1;
    } else {
      const diff = diffDays(body.dateIl, last);
      if (diff === 1) newCurrent = (cur?.currentStreak ?? 0) + 1;
      // Shabbat bridge: Friday → (Sat auto) → Sunday keeps the streak and counts
      // BOTH the auto-Saturday and Sunday (+2), so Fri+Sun reads as 3.
      else if (diff === 2 && isFriday(last)) newCurrent = (cur?.currentStreak ?? 0) + 2;
      else if (diff > 1) newCurrent = 1;
      // diff <= 0 means client clock skew — leave streak unchanged.
    }

    if (newCurrent > newLongest) newLongest = newCurrent;

    await db
      .update(userProfiles)
      .set({
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: body.dateIl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.id, ctx.userId));

    return res.status(200).json({
      ok: true,
      streak: {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: body.dateIl,
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
