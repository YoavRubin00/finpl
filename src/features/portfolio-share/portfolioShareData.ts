// Reward + rules config for the portfolio-share feed.
// Honest-data policy (2026-07-02): NO seeded/demo portfolios ship here — the
// feed shows only REAL portfolios the user shared. The old fabricated authors /
// invented returns / fake likes+comments were removed at the source.

import type { SharedPick } from './portfolioShareTypes';

/** Coins for sharing a portfolio you built — once per day. */
export const SHARE_REWARD_COINS = 500;
/** Coins for rating someone's portfolio (Yoav 2026-07-03). Granted only the
 *  FIRST time you rate a given portfolio, and capped per day so it can't be
 *  farmed by re-rating or rating-then-changing. */
export const RATE_REWARD_COINS = 20;
export const RATE_REWARD_DAILY_CAP = 10;
export const MIN_PICKS = 2;
export const MAX_PICKS = 6;
export const ALLOCATION_STEP = 5;
export const MAX_CAPTION_LENGTH = 140;

/** Allocation-weighted return; leveraged picks count double. */
export function computePortfolioReturn(picks: SharedPick[]): number {
  const total = picks.reduce(
    (sum, p) => sum + (p.weeklyChange * (p.isLeverage ? 2 : 1) * p.allocationPct) / 100,
    0,
  );
  return parseFloat(total.toFixed(2));
}
