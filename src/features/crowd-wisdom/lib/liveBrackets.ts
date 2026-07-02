/**
 * Live-anchored forecast brackets (Yoav 2026-07-02: "אם הדולר שקל כרגע 3.0 אז
 * צריך להיות דברים קרובים לזה"). Instead of hardcoded stale price ranges, a
 * forecast question's 5 brackets are derived at runtime from the LIVE level of
 * its asset, so the ranges always straddle today's real price.
 *
 * Edges by horizon (± of the live level):
 *   weekly  → ±0.5% / ±1.5%
 *   monthly → ±1.5% / ±4%
 *   yearly  → ±4%  / ±10%
 *
 * Bracket ids are ALWAYS b1..b5 (stable across weeks / re-renders) so a user's
 * stored vote never breaks when the underlying numbers move.
 */

export type BracketHorizon = "weekly" | "monthly" | "yearly";

export interface LiveBracket {
  id: string;
  label: string;
}

/** Near / far edge fractions per horizon. */
const HORIZON_EDGES: Record<BracketHorizon, readonly [number, number]> = {
  weekly: [0.005, 0.015],
  monthly: [0.015, 0.04],
  yearly: [0.04, 0.1],
};

/** Rounding grid so bracket edges read as clean numbers, keyed by asset kind. */
function gridForAsset(assetLabel: string): number {
  const l = assetLabel.toLowerCase();
  if (assetLabel.includes("דולר") || assetLabel.includes("שקל") || l.includes("usd") || l.includes("ils")) {
    return 0.05; // USD/ILS — fine grid
  }
  if (assetLabel.includes("ביטקוין") || l.includes("btc") || l.includes("bitcoin")) {
    return 1000; // BTC — thousand-dollar steps
  }
  return 5; // indices (ת"א / S&P) — 5-point grid
}

/** Format a bracket edge: 2 decimals for sub-unit grids (FX), thousands for the rest. */
function formatEdge(value: number, grid: number): string {
  if (grid < 1) return value.toFixed(2);
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Build 5 realistic brackets anchored to a live `level`.
 * Labels are Hebrew: "מתחת ל-X", "X – Y", "Y – Z", "Z – W", "מעל W".
 * Ids are stable b1..b5.
 */
export function buildLiveBrackets(
  assetLabel: string,
  level: number,
  horizon: BracketHorizon,
): LiveBracket[] {
  const [near, far] = HORIZON_EDGES[horizon];
  const grid = gridForAsset(assetLabel);
  const snap = (n: number): number => Math.round(n / grid) * grid;

  const e1 = snap(level * (1 - far));
  const e2 = snap(level * (1 - near));
  const e3 = snap(level * (1 + near));
  const e4 = snap(level * (1 + far));

  const f = (n: number): string => formatEdge(n, grid);
  const labels = [
    `מתחת ל-${f(e1)}`,
    `${f(e1)} – ${f(e2)}`,
    `${f(e2)} – ${f(e3)}`,
    `${f(e3)} – ${f(e4)}`,
    `מעל ${f(e4)}`,
  ];

  return labels.map((label, i) => ({ id: `b${i + 1}`, label }));
}

/**
 * Maps a forecast question id → the /api/market/live rate label whose live level
 * anchors its brackets. `null` = no live source, so the caller keeps the seed
 * (relative) bracket labels as a fallback.
 */
export const LIVE_LABELS: Record<string, string | null> = {
  forecast_dollar_shekel: "דולר / שקל",
  forecast_ta35_friday: 'ת"א 35',
  forecast_sp500_year_end: null,
};
