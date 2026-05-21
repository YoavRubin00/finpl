// api/sync/economy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, sql } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface EconomyDeltaBody {
  xpDelta?: number;
  coinsDelta?: number;
  gemsDelta?: number;
  virtualBalanceSet?: number;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select({
        xp: userProfiles.xp,
        coins: userProfiles.coins,
        gems: userProfiles.gems,
        level: userProfiles.level,
        virtualBalance: userProfiles.virtualBalance,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, economy: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as EconomyDeltaBody;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.xpDelta === 'number' && body.xpDelta !== 0) {
      updates.xp = sql`COALESCE(${userProfiles.xp}, 0) + ${body.xpDelta}`;
    }
    if (typeof body.coinsDelta === 'number' && body.coinsDelta !== 0) {
      updates.coins = sql`COALESCE(${userProfiles.coins}, 0) + ${body.coinsDelta}`;
    }
    if (typeof body.gemsDelta === 'number' && body.gemsDelta !== 0) {
      updates.gems = sql`COALESCE(${userProfiles.gems}, 0) + ${body.gemsDelta}`;
    }
    if (typeof body.virtualBalanceSet === 'number' && Number.isFinite(body.virtualBalanceSet)) {
      updates.virtualBalance = body.virtualBalanceSet.toString();
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No deltas provided' });
    }

    await db
      .update(userProfiles)
      .set(updates)
      .where(eq(userProfiles.authId, ctx.authId));

    const rows = await db
      .select({
        xp: userProfiles.xp,
        coins: userProfiles.coins,
        gems: userProfiles.gems,
        level: userProfiles.level,
        virtualBalance: userProfiles.virtualBalance,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, economy: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
