import type { ActivePosition } from '../../trading-hub/tradingHubTypes';
import type { PortfolioContextSnapshot } from '../types';

/**
 * Computes a derived portfolio snapshot from the user's open positions.
 * Used to power the "ומה לגבי התיק שלי?" context card after a stock
 * analysis lands.
 *
 * Returns null when the user has no positions — caller skips the card.
 */
export function buildPortfolioContext(
  positions: ActivePosition[],
): PortfolioContextSnapshot | null {
  if (!positions || positions.length === 0) return null;

  let totalValue = 0;
  let totalCost = 0;
  let best: { ticker: string; changePct: number } | null = null;
  let worst: { ticker: string; changePct: number } | null = null;

  for (const p of positions) {
    const currentValue = p.amountInvested * (1 + p.pnlPercent / 100);
    totalValue += currentValue;
    totalCost += p.amountInvested;

    if (!best || p.pnlPercent > best.changePct) {
      best = { ticker: p.assetId, changePct: p.pnlPercent };
    }
    if (!worst || p.pnlPercent < worst.changePct) {
      worst = { ticker: p.assetId, changePct: p.pnlPercent };
    }
  }

  const todayChangePct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  // Naive concentration check: if a single position represents > 40% of
  // total value, flag it. We don't know sector here so the warning is on
  // ticker concentration only.
  const concentration = positions
    .map((p) => ({
      ticker: p.assetId,
      pct: totalValue > 0 ? ((p.amountInvested * (1 + p.pnlPercent / 100)) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  const topPosition = concentration[0];
  const sectorConcentrationWarning =
    topPosition && topPosition.pct > 40
      ? `${topPosition.ticker} מהווה ${topPosition.pct.toFixed(0)} אחוז מהתיק`
      : null;

  return {
    totalValue,
    todayChangePct,
    bestPerformer: best,
    worstPerformer: worst,
    sectorConcentrationWarning,
  };
}
