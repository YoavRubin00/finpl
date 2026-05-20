import { getApiBase } from '../apiBase';
import { useAuthStore } from '../../features/auth/useAuthStore';

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
   * The server gates negative deltas; insufficient-balance trades return 402
   * and write nothing — the next /api/sync/profile pull will reconcile state.
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
 *             caller MUST undo the optimistic local mutation.
 *   ok=false, no status:  network/parse error — caller keeps optimistic
 *             state; the next /api/sync/profile GET will reconcile.
 */
export type LogTradeResult =
  | { ok: true; virtualBalance: number }
  | { ok: false; status?: number };

/**
 * Appends one trade to the server log, updates the denormalized portfolio
 * (BUY upserts avg cost; SELL decrements quantity), and applies cashDelta
 * to user_profiles.virtual_balance — all within a single CTE on the server.
 *
 * The client-side Zustand store remains source of truth for in-session UI;
 * the server copy is for cross-device restore, analytics, and authoritative
 * balance reconciliation.
 */
export async function logTrade(params: LogTradeParams): Promise<LogTradeResult> {
  const { email: authId, syncToken } = useAuthStore.getState();
  if (!authId || params.quantity <= 0 || params.priceAtExecution <= 0) {
    return { ok: false };
  }
  try {
    const base = getApiBase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (syncToken) headers['X-Sync-Token'] = syncToken;
    const res = await fetch(`${base}/api/trading/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...params, authId }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { ok: boolean; virtualBalance?: string };
    const balance = json.virtualBalance !== undefined ? parseFloat(json.virtualBalance) : NaN;
    if (!Number.isFinite(balance)) return { ok: false };
    return { ok: true, virtualBalance: balance };
  } catch {
    return { ok: false };
  }
}