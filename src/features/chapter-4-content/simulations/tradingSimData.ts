/**
 * SIM 22: סימולטור מסחר (Trading Simulator) — Module 4-22
 * Trading round data with 3 rounds: Market Order, Limit Order, Stop-Loss.
 */

import type { StockTick, TradingRound, TradingSimConfig } from './tradingSimTypes';

// ── Helper: generate price ticks ─────────────────────────────────────
function buildTicks(prices: number[]): StockTick[] {
  return prices.map((price, i) => ({ time: i, price }));
}

// ── Round 1: Market Order ────────────────────────────────────────────
// TSLA trades around ₪250 with normal volatility. Player buys at market.
// Lesson: instant execution but no price control.
const ROUND_1_PRICES = [
  250, 251, 249, 252, 253, 250, 248, 251, 254, 252,
  255, 253, 256, 254, 257, 255, 258, 256, 253, 255,
  257, 259, 256, 258, 260, 258, 261, 259, 262, 260,
];

// ── Round 2: Limit Order ─────────────────────────────────────────────
// Stock starts at ₪250, drifts down to ₪230 mid-round, then recovers.
// Player sets limit buy at ₪230. Patience gets a better price.
const ROUND_2_PRICES = [
  250, 248, 246, 244, 242, 240, 238, 236, 234, 232,
  230, 228, 229, 231, 233, 235, 237, 240, 242, 245,
  248, 250, 253, 255, 258, 260, 263, 265, 268, 270,
];

// ── Round 3: Stop-Loss ───────────────────────────────────────────────
// Stock starts at ₪260, crashes hard through ₪200. Stop-loss at ₪200
// saves player from further freefall to ₪160. Automatic protection.
const ROUND_3_PRICES = [
  260, 258, 255, 252, 248, 245, 240, 235, 230, 225,
  220, 215, 210, 205, 200, 195, 190, 185, 180, 175,
  172, 170, 168, 165, 163, 162, 161, 160, 160, 160,
];

// ── Trading Rounds ───────────────────────────────────────────────────
export const TRADING_ROUNDS: TradingRound[] = [
  {
    id: 'round-1-market',
    instruction: 'מניית TSLA נסחרת ב-₪250. קנה עכשיו בפקודת שוק!',
    orderType: 'market',
    stockData: buildTicks(ROUND_1_PRICES),
    targetLesson: 'פקודת שוק = מיידי אבל אין שליטה על המחיר. שילמת את מה שהשוק דרש.',
  },
  {
    id: 'round-2-limit',
    instruction: 'חכה שהמחיר ירד ל-₪230 לפני שתקנה. הגדר פקודת Limit!',
    orderType: 'limit',
    stockData: buildTicks(ROUND_2_PRICES),
    targetLesson: 'פקודת Limit = סבלנות משתלמת. קנית ב-₪230 במקום ב-₪250. אבל אם המחיר לא היה יורד — היית מפסיד את ההזדמנות.',
  },
  {
    id: 'round-3-stop-loss',
    instruction: 'הגן על עצמך — אם המניה יורדת ל-₪200, מכור אוטומטית!',
    orderType: 'stop-loss',
    stockData: buildTicks(ROUND_3_PRICES),
    targetLesson: 'Stop-Loss = ביטוח אוטומטי. המניה המשיכה לרדת ל-₪160, אבל אתה מכרת ב-₪200. חסכת 30% הפסד נוסף!',
  },
];

// ── Config ────────────────────────────────────────────────────────────
export const tradingSimConfig: TradingSimConfig = {
  rounds: TRADING_ROUNDS,
  startingCash: 10_000,
};
