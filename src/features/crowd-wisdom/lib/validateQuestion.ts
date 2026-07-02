// Sanity guard for numeric forecast questions ("חכמת המונים").
// A question is only fair if its targets are PLAUSIBLE for the horizon —
// e.g. Bitcoin at $56K cannot honestly ask "will it hit $100K by Friday".

export type ForecastAssetClass = 'index' | 'stock' | 'crypto';

/** Maximum plausible move (±%) for a ~1-week horizon, by asset class. */
export const MAX_WEEKLY_MOVE_PCT: Record<ForecastAssetClass, number> = {
  index: 6,
  stock: 12,
  crypto: 15,
};

/** True when a numeric target is within a plausible weekly move of the live value. */
export function isPlausibleForecastTarget(
  assetClass: ForecastAssetClass,
  currentValue: number,
  target: number,
): boolean {
  if (!isFinite(currentValue) || currentValue <= 0 || !isFinite(target) || target <= 0) {
    return false;
  }
  const maxMove = MAX_WEEKLY_MOVE_PCT[assetClass] / 100;
  return target >= currentValue * (1 - maxMove) && target <= currentValue * (1 + maxMove);
}

/**
 * Clamp a forecast slider range to the plausible band around the live value.
 * Returns clean rounded edges so the UI reads well.
 */
export function buildForecastRange(
  assetClass: ForecastAssetClass,
  currentValue: number,
): { min: number; max: number; step: number } {
  const maxMove = MAX_WEEKLY_MOVE_PCT[assetClass] / 100;
  const rawMin = currentValue * (1 - maxMove);
  const rawMax = currentValue * (1 + maxMove);
  // Step ≈ 0.5% of the value, rounded to a clean unit.
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(currentValue * 0.005)));
  const step = Math.max(1, Math.round((currentValue * 0.005) / magnitude) * magnitude);
  return {
    min: Math.floor(rawMin / step) * step,
    max: Math.ceil(rawMax / step) * step,
    step,
  };
}