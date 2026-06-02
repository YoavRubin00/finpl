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
    return res.status(200).json({ ok: true, streak: rows[0] ?? null });
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
