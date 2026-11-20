import { api, ApiError } from '../../lib/api/client';

export type TradeType = 'BUY' | 'SELL';

interface LogTradeParams {
  assetSymbol: string;
  assetName?: string;
  tradeType: TradeType;
  /** Number of units traded (can be fractional for crypto). */
  quantity: number;
  /** Per-unit price at execution. */
  priceAtExecution: number;
  /**
   * Signed change to user_profiles.virtual_balance for this trade.
   * Negative on opens (debit), positive on closes (credit, PnL-adjusted).
   * The server applies it as a ledger entry (it no longer rejects trades on
   * that balance — the app spends `coins`, see api/_shared/paperTrade.ts).
   */
  cashDelta: number;
  /**
   * When true, the trade is logged in paper_trades but paper_portfolio is NOT
   * updated. Set this when closing a short position: the closing BUY must appear
   * in the audit log but must never create a phantom long row in the portfolio.
   */
  skipPortfolio?: boolean;
}

/**
 * Result of a trade-API call.
 *   ok=true:  server applied cashDelta atomically. `virtualBalance` is the
 *             post-update server-authoritative value (caller may hard-set it
 *             into the local store to reconcile any drift).
 *   ok=false, status=402: server rejected for insufficient balance —
 *             caller MUST undo the optimistic local mutation. (The current
 *             server never answers 402; kept for compatibility.)
 *   ok=false, other status / none: auth, validation, network or parse error —
 *             caller keeps optimistic state; the next profile GET reconciles.
 */
export type LogTradeResult =
  | { ok: true; virtualBalance: number }
  | { ok: false; status?: number };

/**
 * Appends one trade to the server log, updates the denormalized portfolio
 * (BUY upserts avg cost; SELL decrements quantity), and applies cashDelta
 * to user_profiles.virtual_balance — all within a single statement on the
 * server.
 *
 * Goes through the shared API client: the server identifies the user from the
 * session token only (no authId in the body). Without a token (guest) the
 * client answers 401 locally and nothing is sent. Sent once, never retried —
 * the server endpoint is not idempotent.
 *
 * The client-side Zustand store remains source of truth for in-session UI;
 * the server copy is for cross-device restore, analytics, and authoritative
 * balance reconciliation.
 */
export async function logTrade(params: LogTradeParams): Promise<LogTradeResult> {
  if (params.quantity <= 0 || params.priceAtExecution <= 0) {
    return { ok: false };
  }
  try {
    const json = await api.post<LogTradeParams, { ok: boolean; virtualBalance?: string } | null>(
      '/api/trading/trade',
      params,
    );
    const balance = json?.virtualBalance !== undefined ? parseFloat(json.virtualBalance) : NaN;
    if (!Number.isFinite(balance)) return { ok: false };
    return { ok: true, virtualBalance: balance };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, status: err.status };
    return { ok: false };
  }
}
