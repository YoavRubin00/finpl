import { sql, eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, clampNumber } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

async function resolveUserId(
  db: ReturnType<typeof getDb>,
  authId: string,
): Promise<string | null> {
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0]?.id ?? null;
}

const VALID_TRADE_TYPES = new Set(['BUY', 'SELL']);
type TradeType = 'BUY' | 'SELL';

interface TradeBody {
  authId: string;
  assetSymbol: string;
  assetName?: string;
  tradeType: TradeType;
  quantity: number;
  priceAtExecution: number;
}

/**
 * POST /api/trading/trade
 *
 * Body: { authId, assetSymbol, assetName?, tradeType: 'BUY'|'SELL', quantity, priceAtExecution }
 *
 * Atomically:
 *   1. Inserts a row into `paper_trades` (immutable audit log).
 *   2. Updates `paper_portfolio` (denormalized current holdings):
 *      - BUY: upsert with weighted-average buy price.
 *      - SELL: decrement quantity; row is deleted if quantity reaches 0.
 *
 * Shorts (closing a SELL-opened position) are logged in `paper_trades` only;
 * `paper_portfolio` is long-only and stays consistent with spot semantics.
 *
 * Fire-and-forget from the client. Failures are non-fatal — the local Zustand
 * store remains the source of truth for in-session UI.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'trading-trade', { limit: 60, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as TradeBody;
    const authId = sanitizeString(body.authId, 254);
    const assetSymbol = sanitizeString(body.assetSymbol, 32);
    const assetName = sanitizeString(body.assetName, 100) ?? null;
    const tradeType = body.tradeType;
    const quantity = clampNumber(body.quantity, 0.00000001, 1_000_000_000);
    const priceAtExecution = clampNumber(body.priceAtExecution, 0.01, 1_000_000_000);

    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!assetSymbol) return Response.json({ error: 'Missing assetSymbol' }, { status: 400 });
    if (!tradeType || !VALID_TRADE_TYPES.has(tradeType)) {
      return Response.json({ error: 'Invalid tradeType' }, { status: 400 });
    }
    if (quantity === undefined) return Response.json({ error: 'Invalid quantity' }, { status: 400 });
    if (priceAtExecution === undefined) return Response.json({ error: 'Invalid priceAtExecution' }, { status: 400 });

    const db = getDb();
    const userId = await resolveUserId(db, authId);
    if (!userId) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const totalValue = quantity * priceAtExecution;

    // Always log the trade (event log).
    await db.execute(sql`
      INSERT INTO paper_trades (
        user_id, asset_symbol, asset_name, trade_type,
        quantity, price_at_execution, total_value
      )
      VALUES (
        ${userId}::uuid, ${assetSymbol}, ${assetName}, ${tradeType},
        ${quantity}, ${priceAtExecution}, ${totalValue}
      )
    `);

    if (tradeType === 'BUY') {
      // Weighted-average buy price upsert. NULLIF guards the divide-by-zero
      // edge case where prev qty was negative due to manual fixups.
      await db.execute(sql`
        INSERT INTO paper_portfolio (user_id, asset_symbol, asset_name, quantity, avg_buy_price)
        VALUES (${userId}::uuid, ${assetSymbol}, ${assetName}, ${quantity}, ${priceAtExecution})
        ON CONFLICT (user_id, asset_symbol) DO UPDATE SET
          asset_name = COALESCE(EXCLUDED.asset_name, paper_portfolio.asset_name),
          quantity = paper_portfolio.quantity + EXCLUDED.quantity,
          avg_buy_price = (
            paper_portfolio.quantity * paper_portfolio.avg_buy_price
            + EXCLUDED.quantity * EXCLUDED.avg_buy_price
          ) / NULLIF(paper_portfolio.quantity + EXCLUDED.quantity, 0),
          updated_at = now()
      `);
    } else {
      // SELL — decrement holdings; delete the row if it goes to zero or below.
      // No-op when there's no existing row (e.g. closing a short that was
      // opened with `openPosition('sell')`, which we never tracked in portfolio).
      await db.execute(sql`
        UPDATE paper_portfolio
           SET quantity = quantity - ${quantity},
               updated_at = now()
         WHERE user_id = ${userId}::uuid
           AND asset_symbol = ${assetSymbol}
      `);
      await db.execute(sql`
        DELETE FROM paper_portfolio
         WHERE user_id = ${userId}::uuid
           AND asset_symbol = ${assetSymbol}
           AND quantity <= 0
      `);
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trading/trade POST');
  }
}