// api/sync/economy.ts
//
// GET  → { ok, economy: { xp, coins, gems, level, virtualBalance } | null }
// POST { xpDelta?, coinsDelta?, gemsDelta?, virtualBalanceSet? }
//      → same shape, the server's balance after the write.
//
// POST no longer applies the client's numbers as-is: api/_shared/economyGuard.ts
// floors debits at zero, pays coin credits from the user's returns pool or a
// daily free budget (the rest is held and paid later), drops purchase-sized gem
// deltas (purchased gems come from the RevenueCat webhook) and caps earned gems
// per day. A capped request still answers 200 with the server's balance.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { handleEconomyPost } from '../_shared/economyGuard';
import { createEconomyDeps } from '../_shared/economyStores';
import { withAuth } from '../_shared/withAuth';

const ECONOMY_COLUMNS = {
  xp: userProfiles.xp,
  coins: userProfiles.coins,
  gems: userProfiles.gems,
  level: userProfiles.level,
  virtualBalance: userProfiles.virtualBalance,
};

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const db = getDb();
    const rows = await db
      .select(ECONOMY_COLUMNS)
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, economy: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const result = await handleEconomyPost(ctx.userId, req.body ?? {}, createEconomyDeps());
    return res.status(result.status).json(result.body);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
