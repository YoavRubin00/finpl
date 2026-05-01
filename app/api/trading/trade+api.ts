import { sql, eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, validateSyncAuth } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

async function resolveUser(
  db: ReturnType<typeof getDb>,
  authId: string,
): Promise<{ id: string; syncToken: string | null } | null> {
  const rows = await db
    .select({ id: userProfiles.id, syncToken: userProfiles.syncToken })
    .from(userProfiles)
    .where(eq(userProfiles.authId, authId))
    .limit(1);
  return rows[0] ?? null;
}

/** Validate a float: must be finite, positive, within max. No rounding. */
function clampFloat(value: unknown, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(value, max);
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
  /**
   * When true, the BUY is appended to paper_trades only — paper_portfolio is
   * not touched. Used when closing a short position to avoid a phantom long row.
   */
  skipPortfolio?: boolean;
}

/**
 * POST /api/trading/trade
 *
 * Body: { authId, assetSymbol, assetName?, tradeType, quantity, priceAtExecution, skipPortfolio? }
 *
 * Each branch is a single atomic CTE statement (one round-trip):
 *
 *   BUY (skipPortfolio=false):
 *     INSERT paper_trades + weighted-avg UPSERT paper_portfolio
 *
 *   SELL:
 *     INSERT paper_trades + conditional DELETE-or-UPDATE paper_portfolio
 *     (DELETE wins when remaining qty ≤ 0; UPDATE wins otherwise — mutually exclusive)
 *
 *   BUY (skipPortfolio=true — closing a short):
 *     INSERT paper_trades only; portfolio untouched
 *
 * Fire-and-forget from the client. The local Zustand store is source of truth
 * for in-session UI; this endpoint is for cross-device restore and analytics.
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
    const skipPortfolio = body.skipPortfolio === true;

    // Float validation — clampNumber rounds to integers, breaking sub-cent prices.
    const quantity = clampFloat(body.quantity, 1_000_000_000);
    const priceAtExecution = clampFloat(body.priceAtExecution, 1_000_000_000);

    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!assetSymbol) return Response.json({ error: 'Missing assetSymbol' }, { status: 400 });
    if (!tradeType || !VALID_TRADE_TYPES.has(tradeType)) {
      return Response.json({ error: 'Invalid tradeType' }, { status: 400 });
    }
    if (quantity === undefined) return Response.json({ error: 'Invalid quantity' }, { status: 400 });
    if (priceAtExecution === undefined) return Response.json({ error: 'Invalid priceAtExecution' }, { status: 400 });

    const db = getDb();
    const user = await resolveUser(db, authId);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (!validateSyncAuth(request, user.syncToken)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = user;
    const totalValue = quantity * priceAtExecution;

    if (tradeType === 'BUY' && !skipPortfolio) {
      // Atomic: log trade + weighted-average UPSERT into portfolio.
      await db.execute(sql`
        WITH ins_trade AS (
          INSERT INTO paper_trades (
            user_id, asset_symbol, asset_name, trade_type,
            quantity, price_at_execution, total_value
          )
          VALUES (
            ${userId}::uuid, ${assetSymbol}, ${assetName}, ${tradeType},
            ${quantity}, ${priceAtExecution}, ${totalValue}
          )
          RETURNING 1
        )
        INSERT INTO paper_portfolio (user_id, asset_symbol, asset_name, quantity, avg_buy_price)
        VALUES (${userId}::uuid, ${assetSymbol}, ${assetName}, ${quantity}, ${priceAtExecution})
        ON CONFLICT (user_id, asset_symbol) DO UPDATE SET
          asset_name   = COALESCE(EXCLUDED.asset_name, paper_portfolio.asset_name),
          quantity     = paper_portfolio.quantity + EXCLUDED.quantity,
          avg_buy_price = (
            paper_portfolio.quantity * paper_portfolio.avg_buy_price
            + EXCLUDED.quantity * EXCLUDED.avg_buy_price
          ) / NULLIF(paper_portfolio.quantity + EXCLUDED.quantity, 0),
          updated_at   = now()
      `);
    } else if (tradeType === 'SELL') {
      // Atomic: log trade + conditional delete-or-decrement portfolio.
      // del_if_zero and upd_portfolio see the same pre-update snapshot, so their
      // WHERE conditions (qty-delta <= 0 vs > 0) are mutually exclusive — exactly
      // one branch applies to any given row.
      await db.execute(sql`
        WITH ins_trade AS (
          INSERT INTO paper_trades (
            user_id, asset_symbol, asset_name, trade_type,
            quantity, price_at_execution, total_value
          )
          VALUES (
            ${userId}::uuid, ${assetSymbol}, ${assetName}, ${tradeType},
            ${quantity}, ${priceAtExecution}, ${totalValue}
          )
          RETURNING 1
        ),
        del_if_zero AS (
          DELETE FROM paper_portfolio
           WHERE user_id     = ${userId}::uuid
             AND asset_symbol = ${assetSymbol}
             AND quantity - ${quantity} <= 0
        ),
        upd_portfolio AS (
          UPDATE paper_portfolio
             SET quantity   = quantity - ${quantity},
                 updated_at = now()
           WHERE user_id     = ${userId}::uuid
             AND asset_symbol = ${assetSymbol}
             AND quantity - ${quantity} > 0
        )
        SELECT 1
      `);
    } else {
      // BUY with skipPortfolio=true: closing a short — audit log only.
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
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trading/trade POST');
  }
}