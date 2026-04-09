/**
 * SIM: מחיר vs. ערך — Price vs Value Chart
 * Data: 120 monthly data points for a fictional stock.
 * Intrinsic value grows ~8%/year. Price oscillates with crashes, bubbles, and noise.
 */

import type { TimePoint, TradeAction } from './priceValueTypes';

// ── Generate 120 months of data ──────────────────────────────────────────

function generateData(): TimePoint[] {
  const points: TimePoint[] = [];
  const monthlyGrowth = Math.pow(1.08, 1 / 12); // ~0.64% monthly
  let intrinsic = 100;

  // Deterministic "random" noise using simple seed
  let seed = 42;
  function nextRand(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed / 2147483647) - 0.5; // -0.5 to +0.5
  }

  // Define events: [startMonth, endMonth, direction multiplier]
  // Crash 1: months 18-24 (-35%)
  // Recovery 1: months 25-36
  // Bubble: months 55-70 (+50% above value)
  // Crash 2: months 78-86 (-40%)
  // Recovery 2: months 87-100

  for (let i = 0; i < 120; i++) {
    const year = Math.floor(i / 12) + 1;
    const month = (i % 12) + 1;

    intrinsic = i === 0 ? 100 : intrinsic * monthlyGrowth;

    let priceBias = 0;

    // Crash 1: months 18-24
    if (i >= 18 && i <= 24) {
      const progress = (i - 18) / 6;
      priceBias = -0.35 * progress;
    } else if (i > 24 && i <= 36) {
      // Recovery from crash 1
      const progress = (i - 24) / 12;
      priceBias = -0.35 * (1 - progress);
    }

    // Bubble: months 55-70
    if (i >= 55 && i <= 62) {
      const progress = (i - 55) / 7;
      priceBias += 0.50 * progress;
    } else if (i > 62 && i <= 70) {
      const progress = (i - 62) / 8;
      priceBias += 0.50 * (1 - progress);
    }

    // Crash 2: months 78-86
    if (i >= 78 && i <= 86) {
      const progress = (i - 78) / 8;
      priceBias += -0.40 * progress;
    } else if (i > 86 && i <= 100) {
      const progress = (i - 86) / 14;
      priceBias += -0.40 * (1 - progress);
    }

    const noise = nextRand() * 0.08; // ±4% noise
    const price = Math.round(intrinsic * (1 + priceBias + noise) * 100) / 100;

    points.push({
      year,
      month,
      price: Math.max(price, 5), // floor at 5
      intrinsicValue: Math.round(intrinsic * 100) / 100,
    });
  }

  return points;
}

export const PRICE_VALUE_DATA: TimePoint[] = generateData();

// ── Graham's ideal trades ────────────────────────────────────────────────
// Buy when margin of safety > 30%, sell when price > value by 20%

function computeGrahamTrades(data: TimePoint[]): TradeAction[] {
  const trades: TradeAction[] = [];
  let holding = false;

  for (let i = 0; i < data.length; i++) {
    const { price, intrinsicValue } = data[i];
    const margin = (intrinsicValue - price) / intrinsicValue;

    if (!holding && margin > 0.30) {
      trades.push({ type: 'buy', yearIndex: i, price });
      holding = true;
    } else if (holding && price > intrinsicValue * 1.20) {
      trades.push({ type: 'sell', yearIndex: i, price });
      holding = false;
    }
  }

  // If still holding at end, sell at last price
  if (holding) {
    const last = data[data.length - 1];
    trades.push({ type: 'sell', yearIndex: data.length - 1, price: last.price });
  }

  return trades;
}

export const GRAHAM_TRADES: TradeAction[] = computeGrahamTrades(PRICE_VALUE_DATA);

// ── Finn feedback messages ───────────────────────────────────────────────

export const FINN_MESSAGES: Record<string, string> = {
  buyBelowValue: 'בנג\'מין גראהם היה גאה! קנית עם מרווח ביטחון 💪',
  buyAboveValue: 'מר שוק שכנע אותך... שיקול דעת! 🤔',
  sellProfit: 'מימשת רווח — חכם! 📈',
  sellLoss: 'מכירת בהפסד — אולי מוקדם מדי? 😬',
  skipCrash: 'דילגת על הזדמנות? המחיר נמוך מהערך...',
  skipBubble: 'נכון לא לקנות כשיקר! סבלנות משתלמת.',
};

// ── Compute Graham's total return for comparison ─────────────────────────

export function computeGrahamReturn(data: TimePoint[]): number {
  const trades = GRAHAM_TRADES;
  let cash = 100000;
  let shares = 0;

  for (const trade of trades) {
    if (trade.type === 'buy' && cash >= 10000) {
      const bought = Math.floor(10000 / trade.price);
      shares += bought;
      cash -= bought * trade.price;
    } else if (trade.type === 'sell' && shares > 0) {
      cash += shares * trade.price;
      shares = 0;
    }
  }

  // Final value
  const lastPrice = data[data.length - 1].price;
  const finalValue = cash + shares * lastPrice;
  return ((finalValue - 100000) / 100000) * 100;
}
