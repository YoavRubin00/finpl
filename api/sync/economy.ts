// api/sync/economy.ts
//
// GET  → { ok, economy: { xp, coins, gems, level, virtualBalance } | null, heldCoins? }
// POST { xpDelta?, coinsDelta?, gemsDelta?, virtualBalanceSet? }
//      → same shape, the server's balance after the write.
//      503 { code: 'ECONOMY_BUSY' } when every compare-and-swap attempt
//      missed: nothing was written, the same request can be sent again.
//
// POST no longer applies the client's numbers as-is: api/_shared/economyGuard.ts
// floors debits at zero, drops purchase-sized gem deltas (purchased gems come
// from the RevenueCat webhook; the answer waits a few seconds for that credit)
// and caps earned gems per day. Coin credits are capped only by a hard
// per-request ceiling in this release; the daily coin caps run in shadow mode
// (logged, not applied). `heldCoins` (top level, outside `economy`) is the
// number of coins a cap is holding back for later: always 0 while the caps are
// in shadow mode, absent when not known (an XP-only write, before migration 0018).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleEconomyGet, handleEconomyPost } from '../_shared/economyGuard';
import { createEconomyDeps } from '../_shared/economyStores';
import { withAuth } from '../_shared/withAuth';

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const result = await handleEconomyGet(ctx.userId, createEconomyDeps());
    return res.status(result.status).json(result.body);
  }

  if (req.method === 'POST') {
    const result = await handleEconomyPost(ctx.userId, req.body ?? {}, createEconomyDeps());
    return res.status(result.status).json(result.body);
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
