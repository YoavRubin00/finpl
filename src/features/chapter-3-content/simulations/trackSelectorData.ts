/**
 * SIM 3-18: בוחר המסלולים (Track Selector), Module 3-18
 * 30 years of REAL historical annual returns (1994-2023).
 * Stocks: S&P 500 Total Return (dividends reinvested).
 * Bonds: Bloomberg US Aggregate Bond Index.
 * Captures real dot-com (2000-02), GFC (2008), COVID (2020) cycles.
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
    name: 'מסלול מנייתי',
    emoji: '📈',
    stockPercent: 0.80,
    bondPercent: 0.20,
    annualFeePercent: 0.0015, // 0.15%
  },
  {
    id: 'balanced',
    name: 'מסלול כללי',
    emoji: '⚖️',
    stockPercent: 0.50,
    bondPercent: 0.50,
    annualFeePercent: 0.0025, // 0.25%
  },
  {
    id: 'conservative',
    name: 'מסלול אג"ח',
    emoji: '🛡️',
    stockPercent: 0.20,
    bondPercent: 0.80,
    annualFeePercent: 0.0040, // 0.4%
  },
];

// ── REAL Annual Returns (1994-2023) ────────────────────────────────────
// Source: S&P 500 Total Return + Bloomberg US Aggregate Bond Index
export const DATA_START_YEAR = 1994;
export const DATA_END_YEAR = 2023;

/** S&P 500 Total Return 1994-2023, dividends reinvested */
const STOCK_RETURNS = [
   0.013,  // 1994
   0.376,  // 1995
   0.230,  // 1996
   0.334,  // 1997
   0.286,  // 1998
   0.210,  // 1999
  -0.091,  // 2000, dot-com crash
  -0.119,  // 2001
  -0.221,  // 2002
   0.287,  // 2003
   0.109,  // 2004
   0.049,  // 2005
   0.158,  // 2006
   0.055,  // 2007
  -0.370,  // 2008, Global Financial Crisis
   0.265,  // 2009
   0.151,  // 2010
   0.021,  // 2011
   0.160,  // 2012
   0.324,  // 2013
   0.137,  // 2014
   0.014,  // 2015
   0.120,  // 2016
   0.218,  // 2017
  -0.044,  // 2018
   0.315,  // 2019
   0.184,  // 2020, COVID crash + recovery
   0.287,  // 2021
  -0.181,  // 2022
   0.263,  // 2023
];

/** Bloomberg US Aggregate Bond Index 1994-2023 */
const BOND_RETURNS = [
  -0.029,  // 1994
   0.185,  // 1995
   0.036,  // 1996
   0.097,  // 1997
   0.087,  // 1998
  -0.008,  // 1999
   0.116,  // 2000
   0.084,  // 2001
   0.103,  // 2002
   0.041,  // 2003
   0.043,  // 2004
   0.024,  // 2005
   0.043,  // 2006
   0.070,  // 2007
   0.052,  // 2008
   0.059,  // 2009
   0.065,  // 2010
   0.078,  // 2011
   0.042,  // 2012
  -0.020,  // 2013
   0.060,  // 2014
   0.005,  // 2015
   0.026,  // 2016
   0.035,  // 2017
   0.001,  // 2018
   0.087,  // 2019
   0.075,  // 2020
  -0.015,  // 2021
  -0.130,  // 2022
   0.055,  // 2023
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
