/**
 * Shared resolution spec for SETTLING prediction ("תחזית") questions against
 * real market outcomes. Single source of truth so the client shows, and the
 * server settles, the SAME measurable questions.
 *
 * MODEL — parimutuel peer-to-peer (Manifold-style, NO house): winners get their
 * stake back PLUS a proportional share of the losers' pool. There is no operator
 * cut. Only OBJECTIVELY-MEASURABLE questions live here — the legal skill-framing
 * requirement (game-coins only, never real money, non-redeemable). Sentiment /
 * personal-choice questions are NOT here and can never be staked.
 *
 * The bracket edges + thresholds below MUST match the labels users see in
 * seedQuestions.ts — the betting UI renders the static seed choices, so settling
 * against these same edges is exactly what the predictor saw.
 */

export type MarketInstrument = 'TA35' | 'SP500' | 'USDILS' | 'BTC' | 'TSLA' | 'BOI_RATE';
/** Instruments priced via Yahoo (everything except the central-bank rate). */
export type YahooInstrument = Exclude<MarketInstrument, 'BOI_RATE'>;

export type BetResolutionSpec =
  /** 5 brackets b1..b5 from 4 ascending edges: b1 < e0, b2 [e0,e1), b3 [e1,e2), b4 [e2,e3), b5 ≥ e3. */
  | { kind: 'bracket'; instrument: YahooInstrument; edges: [number, number, number, number] }
  /** instrument ≥ value → yesId wins, else noId. */
  | { kind: 'threshold'; instrument: YahooInstrument; value: number; yesId: string; noId: string }
  /** weekly % change ≤ -pct → yesId (a "correction"), else noId. */
  | { kind: 'weekly_drop'; instrument: YahooInstrument; pct: number; yesId: string; noId: string }
  /** central-bank rate lowered → downId, else holdId; hedge choices refunded. */
  | { kind: 'rate_direction'; downId: string; holdId: string; refundIds?: string[] };

/**
 * Per-questionId resolution spec. A question is stakeable IFF it appears here.
 * Keys are the stable seedQuestions ids (also the crowd_bets ledger key).
 */
export const BET_RESOLUTIONS: Record<string, BetResolutionSpec> = {
  forecast_ta35_friday: { kind: 'bracket', instrument: 'TA35', edges: [4080, 4120, 4160, 4200] },
  forecast_sp500_year_end: { kind: 'bracket', instrument: 'SP500', edges: [7000, 7300, 7700, 8000] },
  forecast_dollar_shekel: { kind: 'bracket', instrument: 'USDILS', edges: [2.9, 2.95, 3.05, 3.1] },
  yn_bitcoin_100k: { kind: 'threshold', instrument: 'BTC', value: 65000, yesId: 'yes', noId: 'no' },
  yn_tesla_correction: { kind: 'weekly_drop', instrument: 'TSLA', pct: 10, yesId: 'yes_correction', noId: 'no_holds' },
  yn_interest_cut: { kind: 'rate_direction', downId: 'cut', holdId: 'hold', refundIds: ['unknown'] },
};

/** True iff a question can be staked on (has an objective server resolver). */
export function isBettableQuestion(questionId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BET_RESOLUTIONS, questionId);
}

/** A real-world market reading gathered by the server to resolve one question. */
export interface RealMarketReading {
  /** Level / price / rate — for `bracket` and `threshold`. */
  value?: number;
  /** Weekly % change — for `weekly_drop`. */
  weeklyChangePct?: number;
  /** Central-bank rate delta in percentage points — for `rate_direction`
   *  (negative = lowered, 0 = held, positive = raised). */
  rateDelta?: number;
}

export interface ResolvedOutcome {
  /** The choice id reality proved right. */
  winningChoiceId: string;
  /** Choices that always get the stake back (hedge/non-outcome options). */
  refundChoiceIds: string[];
}

/** Which bracket id (b1..b5) `value` falls into, given 4 ascending edges. */
export function bracketFor(value: number, edges: readonly number[]): string {
  for (let i = 0; i < edges.length; i++) {
    if (value < edges[i]) return `b${i + 1}`;
  }
  return `b${edges.length + 1}`;
}

/**
 * PURE resolver: winning choice + refundable choices from a real reading.
 * Returns null when the reading is insufficient to resolve honestly — the caller
 * then REFUNDS every bet (never fabricate a winner).
 */
export function resolveOutcome(spec: BetResolutionSpec, reading: RealMarketReading): ResolvedOutcome | null {
  switch (spec.kind) {
    case 'bracket':
      if (reading.value === undefined || !Number.isFinite(reading.value)) return null;
      return { winningChoiceId: bracketFor(reading.value, spec.edges), refundChoiceIds: [] };
    case 'threshold':
      if (reading.value === undefined || !Number.isFinite(reading.value)) return null;
      return { winningChoiceId: reading.value >= spec.value ? spec.yesId : spec.noId, refundChoiceIds: [] };
    case 'weekly_drop':
      if (reading.weeklyChangePct === undefined || !Number.isFinite(reading.weeklyChangePct)) return null;
      return { winningChoiceId: reading.weeklyChangePct <= -spec.pct ? spec.yesId : spec.noId, refundChoiceIds: [] };
    case 'rate_direction':
      if (reading.rateDelta === undefined || !Number.isFinite(reading.rateDelta)) return null;
      return { winningChoiceId: reading.rateDelta < 0 ? spec.downId : spec.holdId, refundChoiceIds: spec.refundIds ?? [] };
  }
}

export interface SettleableBet {
  id: string;
  choiceId: string;
  stake: number;
}

export interface BetSettlement {
  id: string;
  status: 'won' | 'lost' | 'refunded';
  /** Coins to credit the user on claim (stake back + winnings; 0 for a loss). */
  payout: number;
}

/**
 * PURE parimutuel peer-to-peer settlement (Manifold, NO house cut).
 *   • winners: stake back + a stake-proportional share of the whole losers' pool
 *   • losers: 0
 *   • refund-choices (hedge/non-outcome): stake back
 *   • no winners at all, or unresolvable question → everyone refunded
 * Integer coins; the rounding remainder stays unpaid (favours the pool, never
 * the house — there is no house). Order-independent and idempotent to compute.
 */
export function settleBets(bets: SettleableBet[], outcome: ResolvedOutcome | null): BetSettlement[] {
  if (!outcome) {
    return bets.map((b) => ({ id: b.id, status: 'refunded', payout: b.stake }));
  }
  const refundSet = new Set(outcome.refundChoiceIds);
  const isRefund = (b: SettleableBet): boolean => refundSet.has(b.choiceId);
  const isWinner = (b: SettleableBet): boolean => !isRefund(b) && b.choiceId === outcome.winningChoiceId;
  const isLoser = (b: SettleableBet): boolean => !isRefund(b) && b.choiceId !== outcome.winningChoiceId;

  const winnerPool = bets.filter(isWinner).reduce((s, b) => s + b.stake, 0);
  const loserPool = bets.filter(isLoser).reduce((s, b) => s + b.stake, 0);

  // Nobody predicted the real outcome → refund every non-hedge bet (no one to
  // hand the pool to). Hedge choices are refunded regardless.
  if (winnerPool === 0) {
    return bets.map((b) => ({ id: b.id, status: 'refunded', payout: b.stake }));
  }

  return bets.map((b) => {
    if (isRefund(b)) return { id: b.id, status: 'refunded', payout: b.stake };
    if (b.choiceId === outcome.winningChoiceId) {
      const share = Math.floor((b.stake / winnerPool) * loserPool);
      return { id: b.id, status: 'won', payout: b.stake + share };
    }
    return { id: b.id, status: 'lost', payout: 0 };
  });
}
