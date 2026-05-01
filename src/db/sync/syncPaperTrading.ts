import { getApiBase } from '../apiBase';

export type TradeType = 'BUY' | 'SELL';

interface LogTradeParams {
  authId: string;
  assetSymbol: string;
  assetName?: string;
  tradeType: TradeType;
  /** Number of units traded (can be fractional for crypto). */
  quantity: number;
  /** Per-unit price at execution. */
  priceAtExecution: number;
}

/**
 * Fire-and-forget telemetry — appends one trade to the server log and updates
 * the denormalized portfolio (BUY upserts avg cost; SELL decrements quantity).
 *
 * The client-side Zustand store remains source of truth for in-session UI;
 * the server copy is for cross-device restore and analytics.
 */
export async function logTrade(params: LogTradeParams): Promise<void> {
  if (!params.authId || params.quantity <= 0 || params.priceAtExecution <= 0) return;
  try {
    const base = getApiBase();
    await fetch(`${base}/api/trading/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    /* fire-and-forget */
  }
}