/**
 * SIM 3-18: בוחר המסלולים (Track Selector) — Module 3-18
 * 30 years of market data inspired by real Israeli/US markets.
 * Includes crashes in years 8, 18, 25.
 */

import type {
  InvestmentTrack,
  MarketYear,
  TrackSelectorConfig,
} from './trackSelectorTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Initial investment amount (₪) */
const INITIAL_INVESTMENT = 100_000;

// ── Investment Tracks ─────────────────────────────────────────────────

const TRACKS: InvestmentTrack[] = [
  {
    id: 'aggressive',
    name: 'מנייתי',
    emoji: '📈',
    stockPercent: 0.80,
    bondPercent: 0.20,
    annualFeePercent: 0.0015, // 0.15%
  },
  {
    id: 'balanced',
    name: 'מאוזן',
    emoji: '⚖️',
    stockPercent: 0.50,
    bondPercent: 0.50,
    annualFeePercent: 0.0025, // 0.25%
  },
  {
    id: 'conservative',
    name: 'שמרני',
    emoji: '🛡️',
    stockPercent: 0.20,
    bondPercent: 0.80,
    annualFeePercent: 0.0040, // 0.4%
  },
];

// ── Annual Returns (inspired by real Israeli/US market data) ──────────
// Stocks: avg ~8%, range -35% to +35%
// Bonds:  avg ~3%, range -5% to +8%

/** Stock annual returns — 30 years with crashes at 8, 18, 25 */
const STOCK_RETURNS = [
  0.12,   // Year  1: solid
  0.08,   // Year  2: average
  0.15,   // Year  3: strong
  0.07,   // Year  4: slow
  0.18,   // Year  5: boom
  0.10,   // Year  6: good
  0.05,   // Year  7: flat
  -0.35,  // Year  8: CRASH (dot-com style)
  0.25,   // Year  9: sharp recovery
  0.12,   // Year 10: steady
  0.10,   // Year 11: decent
  0.14,   // Year 12: good
  0.20,   // Year 13: strong bull
  0.06,   // Year 14: slow
  0.11,   // Year 15: decent
  0.11,   // Year 16: decent
  -0.06,  // Year 17: mild correction
  -0.30,  // Year 18: CRASH (GFC style)
  0.28,   // Year 19: recovery
  0.15,   // Year 20: bounce
  0.10,   // Year 21: steady
  0.09,   // Year 22: average
  0.22,   // Year 23: bull
  -0.03,  // Year 24: mild dip
  -0.25,  // Year 25: CRASH (COVID style)
  0.35,   // Year 26: massive recovery
  0.18,   // Year 27: strong
  -0.10,  // Year 28: correction
  0.14,   // Year 29: recovery
  0.10,   // Year 30: finish
];

/** Bond annual returns — inversely correlated during crashes */
const BOND_RETURNS = [
  0.03,   // Year  1
  0.04,   // Year  2
  0.02,   // Year  3
  0.03,   // Year  4
  0.02,   // Year  5: bonds lag in boom
  0.03,   // Year  6
  0.04,   // Year  7
  0.07,   // Year  8: flight to safety
  0.02,   // Year  9
  0.03,   // Year 10
  0.04,   // Year 11
  0.02,   // Year 12
  0.03,   // Year 13
  0.04,   // Year 14
  0.03,   // Year 15
  0.02,   // Year 16
  0.05,   // Year 17
  0.08,   // Year 18: flight to safety
  -0.02,  // Year 19
  0.04,   // Year 20
  0.03,   // Year 21
  0.04,   // Year 22
  0.03,   // Year 23
  0.05,   // Year 24
  0.06,   // Year 25: flight to safety
  -0.03,  // Year 26
  -0.05,  // Year 27: rate hike pain
  0.04,   // Year 28
  0.03,   // Year 29
  0.03,   // Year 30
];

// ── Market Years ──────────────────────────────────────────────────────

const MARKET_YEARS: MarketYear[] = STOCK_RETURNS.map((stockReturn, i) => ({
  year: i + 1,
  stockReturn,
  bondReturn: BOND_RETURNS[i],
}));

// ── Pre-computed Expected Outcomes ────────────────────────────────────

interface TrackOutcome {
  finalBalance: number;
  totalFeesLost: number;
}

function computeTrackOutcome(track: InvestmentTrack): TrackOutcome {
  let balance = INITIAL_INVESTMENT;
  let noFeeBalance = INITIAL_INVESTMENT;

  for (const year of MARKET_YEARS) {
    const blendedReturn =
      year.stockReturn * track.stockPercent +
      year.bondReturn * track.bondPercent;
    noFeeBalance = noFeeBalance * (1 + blendedReturn);
    balance = balance * (1 + blendedReturn - track.annualFeePercent);
  }

  return {
    finalBalance: Math.round(balance),
    totalFeesLost: Math.round(noFeeBalance - balance),
  };
}

/** Pre-computed 30-year results per track (for score screen reference) */
export const EXPECTED_OUTCOMES: Record<string, TrackOutcome> = Object.fromEntries(
  TRACKS.map((track) => [track.id, computeTrackOutcome(track)]),
);

// ── Config Export ───────────────────────────────────────────────────────

export const trackSelectorConfig: TrackSelectorConfig = {
  tracks: TRACKS,
  marketYears: MARKET_YEARS,
  initialInvestment: INITIAL_INVESTMENT,
};
