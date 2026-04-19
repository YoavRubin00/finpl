/**
 * SIM: מחיר vs. ערך, Price vs Value Chart
 * Hook: manage timeline navigation, trades, and scoring.
 */

import { useState, useCallback, useMemo } from 'react';

import type { TradeAction, PVGrade, PVResult } from './priceValueTypes';
import { PRICE_VALUE_DATA, FINN_MESSAGES, computeGrahamReturn } from './priceValueData';

const INITIAL_CASH = 100_000;
const BUY_AMOUNT = 10_000;

interface PriceValueState {
  currentIndex: number;
  trades: TradeAction[];
  holdings: number;   // shares held
  cash: number;
  isComplete: boolean;
  lastMessage: string;
}

function createInitialState(): PriceValueState {
  return {
    currentIndex: 0,
    trades: [],
    holdings: 0,
    cash: INITIAL_CASH,
    isComplete: false,
    lastMessage: '',
  };
}

function gradeFromScore(score: number): PVGrade {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'F';
}

export function usePriceValue() {
  const [state, setState] = useState<PriceValueState>(createInitialState);

  const currentPoint = PRICE_VALUE_DATA[state.currentIndex];
  const totalPoints = PRICE_VALUE_DATA.length;

  // Portfolio value at current moment
  const portfolioValue = useMemo(() => {
    if (!currentPoint) return state.cash;
    return state.cash + state.holdings * currentPoint.price;
  }, [state.cash, state.holdings, currentPoint]);

  // Margin of safety at current point
  const marginOfSafety = useMemo(() => {
    if (!currentPoint || currentPoint.intrinsicValue === 0) return 0;
    return ((currentPoint.intrinsicValue - currentPoint.price) / currentPoint.intrinsicValue) * 100;
  }, [currentPoint]);

  // Buy shares at current price (spend BUY_AMOUNT)
  const buy = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete || prev.cash < BUY_AMOUNT) return prev;

      const point = PRICE_VALUE_DATA[prev.currentIndex];
      if (!point) return prev;

      const shares = Math.floor(BUY_AMOUNT / point.price);
      if (shares <= 0) return prev;

      const cost = shares * point.price;
      const isBelowValue = point.price < point.intrinsicValue;
      const message = isBelowValue ? FINN_MESSAGES.buyBelowValue : FINN_MESSAGES.buyAboveValue;

      return {
        ...prev,
        holdings: prev.holdings + shares,
        cash: prev.cash - cost,
        trades: [...prev.trades, { type: 'buy' as const, yearIndex: prev.currentIndex, price: point.price }],
        lastMessage: message,
      };
    });
  }, []);

  // Sell all holdings at current price
  const sell = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete || prev.holdings <= 0) return prev;

      const point = PRICE_VALUE_DATA[prev.currentIndex];
      if (!point) return prev;

      const revenue = prev.holdings * point.price;
      const avgCost = computeAvgCost(prev.trades, prev.holdings);
      const isProfit = point.price >= avgCost;
      const message = isProfit ? FINN_MESSAGES.sellProfit : FINN_MESSAGES.sellLoss;

      return {
        ...prev,
        cash: prev.cash + revenue,
        holdings: 0,
        trades: [...prev.trades, { type: 'sell' as const, yearIndex: prev.currentIndex, price: point.price }],
        lastMessage: message,
      };
    });
  }, []);

  // Advance to next month
  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;

      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= totalPoints) {
        return { ...prev, currentIndex: prev.currentIndex, isComplete: true };
      }

      // Contextual skip message
      const nextPoint = PRICE_VALUE_DATA[nextIndex];
      let skipMsg = '';
      if (nextPoint) {
        const margin = (nextPoint.intrinsicValue - nextPoint.price) / nextPoint.intrinsicValue;
        if (margin > 0.25 && prev.cash >= BUY_AMOUNT) {
          skipMsg = FINN_MESSAGES.skipCrash;
        } else if (nextPoint.price > nextPoint.intrinsicValue * 1.15 && prev.holdings > 0) {
          skipMsg = FINN_MESSAGES.skipBubble;
        }
      }

      return {
        ...prev,
        currentIndex: nextIndex,
        lastMessage: skipMsg || prev.lastMessage,
      };
    });
  }, [totalPoints]);

  // Fast-forward to end
  const fastForward = useCallback(() => {
    setState((prev) => {
      if (prev.isComplete) return prev;
      return { ...prev, currentIndex: totalPoints - 1, isComplete: true };
    });
  }, [totalPoints]);

  // Calculate final result
  const calculateResult = useCallback((): PVResult | null => {
    if (!state.isComplete) return null;

    const lastPoint = PRICE_VALUE_DATA[totalPoints - 1];
    const finalValue = state.cash + state.holdings * lastPoint.price;
    const totalReturn = ((finalValue - INITIAL_CASH) / INITIAL_CASH) * 100;
    const grahamReturn = computeGrahamReturn(PRICE_VALUE_DATA);

    // Count good vs bad buys
    let goodBuys = 0;
    let badBuys = 0;
    const buyTrades = state.trades.filter((t) => t.type === 'buy');

    for (const trade of buyTrades) {
      const point = PRICE_VALUE_DATA[trade.yearIndex];
      if (!point) continue;
      const margin = (point.intrinsicValue - point.price) / point.intrinsicValue;
      if (margin > 0.20) {
        goodBuys++;
      } else if (point.price > point.intrinsicValue) {
        badBuys++;
      }
    }

    // Score: combination of return vs Graham + buy quality
    let score = 50; // base

    // Return component (up to ±30)
    if (grahamReturn > 0) {
      const returnRatio = totalReturn / grahamReturn;
      score += Math.min(30, Math.max(-30, (returnRatio - 0.5) * 60));
    } else {
      score += totalReturn > 0 ? 20 : -10;
    }

    // Buy quality component (up to ±20)
    const totalBuys = goodBuys + badBuys;
    if (totalBuys > 0) {
      const qualityRatio = goodBuys / totalBuys;
      score += (qualityRatio - 0.5) * 40;
    }

    score = Math.round(Math.max(0, Math.min(100, score)));

    // Feedback
    let feedback: string;
    if (score >= 85) {
      feedback = 'השקעת כמו גראהם! קנית בזול, מכרת ביוקר, והשתמשת במרווח ביטחון.';
    } else if (score >= 70) {
      feedback = 'ביצועים מצוינים! רוב הקניות שלך היו מתחת לערך הפנימי.';
    } else if (score >= 50) {
      feedback = 'לא רע! אבל אפשר לשפר, נסה לקנות רק כשיש מרווח ביטחון משמעותי.';
    } else if (score >= 30) {
      feedback = 'קנית יותר מדי כשהמחיר היה מעל הערך. מר שוק ניצח אותך הפעם.';
    } else {
      feedback = 'מר שוק שלט ברגשות שלך. בפעם הבאה, קנה בפחד, מכור בחמדנות!';
    }

    return {
      totalReturn: Math.round(totalReturn * 10) / 10,
      grahamReturn: Math.round(grahamReturn * 10) / 10,
      grade: gradeFromScore(score),
      score,
      feedback,
      tradeCount: state.trades.length,
      goodBuys,
      badBuys,
    };
  }, [state.isComplete, state.cash, state.holdings, state.trades, totalPoints]);

  // Reset
  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    currentPoint,
    totalPoints,
    portfolioValue,
    marginOfSafety,
    buy,
    sell,
    advance,
    fastForward,
    calculateResult,
    reset,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Compute average cost basis from buy trades. */
function computeAvgCost(trades: TradeAction[], currentHoldings: number): number {
  if (currentHoldings <= 0) return 0;

  // Walk through trades to find cost basis of current holdings
  let totalShares = 0;
  let totalCost = 0;

  for (const trade of trades) {
    if (trade.type === 'buy') {
      const shares = Math.floor(BUY_AMOUNT / trade.price);
      totalShares += shares;
      totalCost += shares * trade.price;
    } else if (trade.type === 'sell') {
      // Reset on full sell
      totalShares = 0;
      totalCost = 0;
    }
  }

  return totalShares > 0 ? totalCost / totalShares : 0;
}
