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

/**
 * Validate a signed float (cashDelta): finite, within ±max, but allows zero
 * and negatives. Returns undefined if invalid; 0 if missing (default no-op
 * for older clients submitting trades pre-balance-tracking).
 */
function clampSignedFloat(value: unknown, max: number): number | undefined {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value > max || value < -max) return undefined;
  return value;
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
   * Signed change to user_profiles.virtual_balance for this trade.
   *   open  long  (BUY,  !skipPortfolio) — negative (debit, principal)
   *   open  short (SELL)                 — negative (debit, staked amount)
   *   close long  (SELL  decrementing)   — positive (credit, PnL-adjusted return)
   *   close short (BUY,   skipPortfolio) — positive (credit, PnL-adjusted return)
   * Server gates negative deltas: if virtual_balance + cashDelta < 0, the
   * entire trade is rejected (HTTP 402) and no rows are written.
   * Optional for back-compat with pre-balance clients (defaults to 0).
   */
  cashDelta?: number;
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
    const cashDelta = clampSignedFloat(body.cashDelta, 1_000_000_000);

    if (!authId) return Response.json({ error: 'Missing authId' }, { status: 400 });
    if (!assetSymbol) return Response.json({ error: 'Missing assetSymbol' }, { status: 400 });
    if (!tradeType || !VALID_TRADE_TYPES.has(tradeType)) {
      return Response.json({ error: 'Invalid tradeType' }, { status: 400 });
    }
    if (quantity === undefined) return Response.json({ error: 'Invalid quantity' }, { status: 400 });
    if (priceAtExecution === undefined) return Response.json({ error: 'Invalid priceAtExecution' }, { status: 400 });
    if (cashDelta === undefined) return Response.json({ error: 'Invalid cashDelta' }, { status: 400 });

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

    // All three branches gate the trade on a balance_update CTE: if the
    // affordability check fails (virtual_balance + cashDelta < 0), the UPDATE
    // returns 0 rows, dependent CTEs see no input and write nothing. We then
    // detect the empty-result case via the trailing SELECT and reply 402.
    let balanceRows: { virtual_balance: string }[];

    if (tradeType === 'BUY' && !skipPortfolio) {
      const result = await db.execute(sql`
        WITH balance_update AS (
          UPDATE user_profiles
             SET virtual_balance = virtual_balance + ${cashDelta},
                 updated_at      = now()
           WHERE id = ${userId}::uuid
             AND virtual_balance + ${cashDelta} >= 0
          RETURNING id, virtual_balance
        ),
        ins_trade AS (
          INSERT INTO paper_trades (
            user_id, asset_symbol, asset_name, trade_type,
            quantity, price_at_execution, total_value
          )
          SELECT bu.id, ${assetSymbol}, ${assetName}, ${tradeType},
                 ${quantity}, ${priceAtExecution}, ${totalValue}
            FROM balance_update bu
          RETURNING 1
        ),
        upd_portfolio AS (
          INSERT INTO paper_portfolio (user_id, asset_symbol, asset_name, quantity, avg_buy_price)
          SELECT bu.id, ${assetSymbol}, ${assetName}, ${quantity}, ${priceAtExecution}
            FROM balance_update bu
          ON CONFLICT (user_id, asset_symbol) DO UPDATE SET
            asset_name    = COALESCE(EXCLUDED.asset_name, paper_portfolio.asset_name),
            quantity      = paper_portfolio.quantity + EXCLUDED.quantity,
            avg_buy_price = (
              paper_portfolio.quantity * paper_portfolio.avg_buy_price
              + EXCLUDED.quantity * EXCLUDED.avg_buy_price
            ) / NULLIF(paper_portfolio.quantity + EXCLUDED.quantity, 0),
            updated_at    = now()
          RETURNING 1
        )
        SELECT virtual_balance FROM balance_update
      `);
      balanceRows = result.rows as { virtual_balance: string }[];
    } else if (tradeType === 'SELL') {
      const result = await db.execute(sql`
        WITH balance_update AS (
          UPDATE user_profiles
             SET virtual_balance = virtual_balance + ${cashDelta},
                 updated_at      = now()
           WHERE id = ${userId}::uuid
             AND virtual_balance + ${cashDelta} >= 0
          RETURNING id, virtual_balance
        ),
        ins_trade AS (
          INSERT INTO paper_trades (
            user_id, asset_symbol, asset_name, trade_type,
            quantity, price_at_execution, total_value
          )
          SELECT bu.id, ${assetSymbol}, ${assetName}, ${tradeType},
                 ${quantity}, ${priceAtExecution}, ${totalValue}
            FROM balance_update bu
          RETURNING 1
        ),
        del_if_zero AS (
          DELETE FROM paper_portfolio
           WHERE user_id      = (SELECT id FROM balance_update)
             AND asset_symbol = ${assetSymbol}
             AND quantity - ${quantity} <= 0
        ),
        upd_portfolio AS (
          UPDATE paper_portfolio
             SET quantity   = quantity - ${quantity},
                 updated_at = now()
           WHERE user_id      = (SELECT id FROM balance_update)
             AND asset_symbol = ${assetSymbol}
             AND quantity - ${quantity} > 0
        )
        SELECT virtual_balance FROM balance_update
      `);
      balanceRows = result.rows as { virtual_balance: string }[];
    } else {
      // BUY skipPortfolio=true: closing a short — audit log + balance only.
      const result = await db.execute(sql`
        WITH balance_update AS (
          UPDATE user_profiles
             SET virtual_balance = virtual_balance + ${cashDelta},
                 updated_at      = now()
           WHERE id = ${userId}::uuid
             AND virtual_balance + ${cashDelta} >= 0
          RETURNING id, virtual_balance
        ),
        ins_trade AS (
          INSERT INTO paper_trades (
            user_id, asset_symbol, asset_name, trade_type,
            quantity, price_at_execution, total_value
          )
          SELECT bu.id, ${assetSymbol}, ${assetName}, ${tradeType},
                 ${quantity}, ${priceAtExecution}, ${totalValue}
            FROM balance_update bu
          RETURNING 1
        )
        SELECT virtual_balance FROM balance_update
      `);
      balanceRows = result.rows as { virtual_balance: string }[];
    }

    if (balanceRows.length === 0) {
      // Affordability gate failed. Client should reconcile via /api/sync/profile.
      return Response.json({ error: 'Insufficient virtual balance' }, { status: 402 });
    }

    return Response.json({ ok: true, virtualBalance: balanceRows[0].virtual_balance });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'trading/trade POST');
  }
}