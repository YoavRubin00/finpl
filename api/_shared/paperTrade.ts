// api/_shared/paperTrade.ts
//
// POST /api/trading/trade — one simulator trade, mirrored server-side:
//   paper_trades     append-only log (every trade)
//   paper_portfolio  long-only, weighted-average cost (BUY upserts, SELL
//                    decrements / deletes; BUY with skipPortfolio = closing a
//                    short, logged only)
//   user_profiles.virtual_balance  += cashDelta (signed ledger)
// all in one statement. Served by api/trading/trade.ts (production) and
// app/api/trading/trade+api.ts (dev).
//
// Promoted from the dev-only handler on 2026-11-20 (production answered 404,
// so no trade was ever saved). Changes against that handler:
//   * Auth: the session token's user, always. The dev handler looked the user
//     up by the body's authId and accepted any caller whose row had no legacy
//     X-Sync-Token. The body's authId is no longer needed (checked if sent).
//   * Validation rejects out-of-range numbers instead of clamping them, bounds
//     quantity × price so total_value fits numeric(18,2), and restricts the
//     symbol to ticker characters.
//   * No 402 affordability gate on virtual_balance. The app spends `coins` on
//     trades (BuySheet checks coins; openPosition debits coins through
//     /api/sync/economy before this call) and never shows virtual_balance, so
//     the gate checked a balance the user can't see: an open larger than
//     virtual_balance (100,000 by default; the shop sells 100,000-coin bundles)
//     would 402 and the app would silently remove the position it had just
//     confirmed. virtual_balance stays a signed ledger of cashDelta.
//   * Not idempotent: the app sends each trade once (fire-and-forget, no retry,
//     no queue), so a retry key isn't needed today. Add a client trade id and a
//     unique index before ever adding retries.

import {
  badRequest,
  isRecord,
  missingToken,
  resolveCaller,
  sanitizeText,
  type ApiResult,
  type CallerDeps,
  type CallerInput,
} from './callerAuth';

export type TradeType = 'BUY' | 'SELL';

export interface PaperTrade {
  assetSymbol: string;
  assetName: string | null;
  tradeType: TradeType;
  quantity: number;
  priceAtExecution: number;
  totalValue: number;
  cashDelta: number;
  skipPortfolio: boolean;
}

export const TRADE_LIMITS = {
  maxQuantity: 1e9,
  maxPrice: 1e9,
  /** total_value is numeric(18,2): keep far below 1e16. */
  maxTotalValue: 1e12,
  maxAbsCashDelta: 1e9,
} as const;

/** Yahoo-style tickers: AAPL, TA125.TA, GC=F, ^TA125.TA, BRK-B. */
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=_-]{1,32}$/;

export type ParsedTrade = { ok: true; trade: PaperTrade } | { ok: false; error: string };

function positive(value: unknown, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) return undefined;
  return value;
}

export function parseTrade(body: unknown): ParsedTrade {
  const b = isRecord(body) ? body : {};
  const assetSymbol = sanitizeText(b.assetSymbol, 32);
  if (!assetSymbol || !SYMBOL_PATTERN.test(assetSymbol)) return { ok: false, error: 'Missing assetSymbol' };
  const tradeType = b.tradeType;
  if (tradeType !== 'BUY' && tradeType !== 'SELL') return { ok: false, error: 'Invalid tradeType' };
  const quantity = positive(b.quantity, TRADE_LIMITS.maxQuantity);
  if (quantity === undefined) return { ok: false, error: 'Invalid quantity' };
  const priceAtExecution = positive(b.priceAtExecution, TRADE_LIMITS.maxPrice);
  if (priceAtExecution === undefined) return { ok: false, error: 'Invalid priceAtExecution' };
  const totalValue = quantity * priceAtExecution;
  if (!(totalValue <= TRADE_LIMITS.maxTotalValue)) return { ok: false, error: 'Invalid quantity' };

  // Optional for back-compat with clients that predate balance tracking.
  let cashDelta = 0;
  if (b.cashDelta !== undefined) {
    if (typeof b.cashDelta !== 'number' || !Number.isFinite(b.cashDelta)
        || Math.abs(b.cashDelta) > TRADE_LIMITS.maxAbsCashDelta) {
      return { ok: false, error: 'Invalid cashDelta' };
    }
    cashDelta = b.cashDelta;
  }

  return {
    ok: true,
    trade: {
      assetSymbol,
      assetName: sanitizeText(b.assetName, 100) ?? null,
      tradeType,
      quantity,
      priceAtExecution,
      totalValue,
      cashDelta,
      skipPortfolio: b.skipPortfolio === true,
    },
  };
}

export interface PaperTradeStore {
  /** Apply the trade for the user; the post-update virtual_balance (numeric as
   *  text), or null when the profile row doesn't exist (nothing written). */
  apply(userId: string, trade: PaperTrade): Promise<{ virtualBalance: string } | null>;
}

export interface TradeDeps extends CallerDeps {
  store: PaperTradeStore;
}

export async function handleTrade(input: CallerInput, deps: TradeDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;
  // New in production: there is no tokenless path to keep.
  if (who.caller.kind === 'none') return missingToken();

  const parsed = parseTrade(input.body);
  if (!parsed.ok) return badRequest(parsed.error);

  const applied = await deps.store.apply(who.caller.userId, parsed.trade);
  if (!applied) return { status: 404, body: { error: 'Profile not found' }, headers: who.caller.headers };

  // Response shape the app parses (src/db/sync/syncPaperTrading.ts): a numeric string.
  return { status: 200, body: { ok: true, virtualBalance: applied.virtualBalance }, headers: who.caller.headers };
}
