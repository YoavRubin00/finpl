// api/sync/user-stats.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, sql } from 'drizzle-orm';
import { userStats } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface UserStatsBody {
  sessionSecondsDelta?: number;
  moduleId?: string;
  moduleSecondsDelta?: number;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, userStats: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as UserStatsBody;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.sessionSecondsDelta === 'number' && body.sessionSecondsDelta > 0) {
      updates.totalSessionSeconds = sql`${userStats.totalSessionSeconds} + ${body.sessionSecondsDelta}`;
    }
    if (typeof body.moduleSecondsDelta === 'number' && body.moduleSecondsDelta > 0 && body.moduleId) {
      updates.moduleDurations = sql`COALESCE(${userStats.moduleDurations}, '{}'::jsonb) || jsonb_build_object(${body.moduleId}::text, (COALESCE((${userStats.moduleDurations}->>${body.moduleId})::int, 0) + ${body.moduleSecondsDelta}))`;
    }

    // Same three statements as before (ensure row → optional delta update →
    // re-read), sent in ONE HTTP round trip to Neon: db.batch runs them in
    // order inside a single transaction. Was 3 sequential round trips.
    const ensureRow = db
      .insert(userStats)
      .values({ userId: ctx.userId })
      .onConflictDoNothing();
    const readBack = db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, ctx.userId))
      .limit(1);

    let rows: Array<typeof userStats.$inferSelect>;
    if (Object.keys(updates).length > 1) {
      const applyDeltas = db
        .update(userStats)
        .set(updates)
        .where(eq(userStats.userId, ctx.userId));
      [, , rows] = await db.batch([ensureRow, applyDeltas, readBack]);
    } else {
      [, rows] = await db.batch([ensureRow, readBack]);
    }
    return res.status(200).json({ ok: true, userStats: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
