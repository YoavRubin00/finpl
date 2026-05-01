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
   * When true, the trade is logged in paper_trades but paper_portfolio is NOT
   * updated. Set this when closing a short position: the closing BUY must appear
   * in the audit log but must never create a phantom long row in the portfolio.
   */
  skipPortfolio?: boolean;
}

/**
 * Fire-and-forget telemetry — appends one trade to the server log and updates
 * the denormalized portfolio (BUY upserts avg cost; SELL decrements quantity).
 *
 * The client-side Zustand store remains source of truth for in-session UI;
 * the server copy is for cross-device restore and analytics.
 */
export async function logTrade(params: LogTradeParams): Promise<void> {
  const { email: authId, syncToken } = useAuthStore.getState();
  if (!authId || params.quantity <= 0 || params.priceAtExecution <= 0) return;
  try {
    const base = getApiBase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (syncToken) headers['X-Sync-Token'] = syncToken;
    await fetch(`${base}/api/trading/trade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...params, authId }),
    });
  } catch {
    /* fire-and-forget */
  }
}