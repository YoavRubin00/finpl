/**
 * SIM 4-28: קורא הגרפים (Chart Reader), Module 4-28
 * 4 chart scenarios with generated candlestick data (40 candles each).
 */

import type { CandleData, ChartRound, ChartReaderConfig } from './chartReaderTypes';

// ── Candle builder ──────────────────────────────────────────────────────────

/** Build OHLC candles from a close-price series and volume array */
function buildCandles(
  closes: number[],
  volumes: number[],
  startYear: number,
  startMonth: number,
): { candles: CandleData[]; volumeData: number[] } {
  const candles: CandleData[] = [];
  let day = 2;
  let month = startMonth;
  let year = startYear;

  for (let i = 0; i < closes.length; i++) {
    const close = closes[i];
    const prevClose = i > 0 ? closes[i - 1] : close * 0.998;
    const open = prevClose;
    const range = Math.abs(close - open) || close * 0.005;
    const wickUp = range * 0.3;
    const wickDown = range * 0.25;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    candles.push({
      date: dateStr,
      open: Math.round(open * 100) / 100,
      close: Math.round(close * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      volume: volumes[i],
    });

    // Advance to next trading day (approximate weekend skip)
    day += i % 5 === 4 ? 3 : 1;
    if (day > 28) {
      day = 1;
      month++;
    }
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return { candles, volumeData: volumes };
}

// ── Round 1: Nvidia 2023, Uptrend with rising volume ──────────────────────

const NVIDIA_CLOSES = [
  150, 155, 152, 158, 165, 160, 168, 175, 172, 180,
  185, 192, 188, 196, 205, 200, 210, 218, 215, 225,
  232, 240, 235, 245, 258, 265, 260, 272, 280, 290,
  300, 315, 310, 325, 340, 355, 370, 390, 420, 460,
];

const NVIDIA_VOLUMES = [
  30, 28, 32, 35, 38, 33, 40, 42, 37, 45,
  43, 48, 46, 50, 52, 47, 55, 58, 53, 60,
  58, 62, 56, 65, 68, 72, 64, 70, 75, 78,
  80, 85, 82, 90, 95, 100, 105, 110, 120, 130,
];

const nvidiaRound = buildCandles(NVIDIA_CLOSES, NVIDIA_VOLUMES, 2023, 5);

// ── Round 2: Meta 2022, Broken support with high volume sell-off ──────────

const META_CLOSES = [
  330, 325, 328, 320, 315, 318, 310, 305, 308, 300,
  295, 290, 285, 280, 275, 270, 265, 260, 255, 250,
  248, 240, 228, 210, 195, 180, 168, 155, 145, 135,
  128, 120, 115, 110, 108, 105, 102, 100, 95, 90,
];

const META_VOLUMES = [
  25, 22, 24, 28, 30, 26, 32, 35, 30, 38,
  40, 42, 45, 48, 50, 55, 58, 62, 65, 70,
  85, 100, 120, 140, 155, 135, 115, 95, 85, 80,
  75, 70, 65, 60, 55, 50, 48, 45, 42, 40,
];

const metaRound = buildCandles(META_CLOSES, META_VOLUMES, 2022, 2);

// ── Round 3: Coca-Cola 2019, Sideways range, low volume ───────────────────

const COKE_CLOSES = [
  47.0, 47.8, 46.5, 48.2, 47.5, 48.0, 49.5, 48.3, 46.8, 47.2,
  48.5, 49.8, 48.0, 47.3, 46.5, 47.8, 49.0, 47.5, 48.2, 49.5,
  48.8, 46.8, 47.5, 48.8, 49.5, 48.2, 47.0, 46.5, 48.0, 49.2,
  47.8, 48.5, 49.8, 48.0, 47.2, 46.8, 48.2, 49.0, 47.5, 48.0,
];

const COKE_VOLUMES = [
  6, 5, 7, 6, 5, 8, 7, 6, 5, 7,
  6, 8, 5, 7, 6, 5, 8, 6, 7, 5,
  6, 7, 5, 8, 6, 7, 5, 6, 8, 7,
  5, 6, 7, 5, 8, 6, 7, 5, 6, 7,
];

const cokeRound = buildCandles(COKE_CLOSES, COKE_VOLUMES, 2019, 4);

// ── Round 4: Apple 2020, Golden cross (50MA crosses 200MA) ────────────────

const APPLE_CLOSES = [
  260, 255, 250, 248, 245, 242, 240, 238, 235, 232,
  230, 232, 235, 240, 245, 250, 255, 262, 270, 278,
  285, 292, 300, 308, 315, 322, 328, 335, 342, 350,
  358, 365, 372, 380, 388, 395, 400, 408, 415, 420,
];

const APPLE_VOLUMES = [
  15, 14, 16, 13, 15, 14, 12, 13, 14, 16,
  18, 20, 22, 25, 28, 30, 32, 35, 38, 42,
  45, 48, 52, 55, 58, 60, 62, 65, 68, 70,
  72, 75, 78, 80, 82, 85, 88, 90, 95, 100,
];

const appleRound = buildCandles(APPLE_CLOSES, APPLE_VOLUMES, 2020, 3);

// ── Rounds ──────────────────────────────────────────────────────────────────

const CHART_ROUNDS: ChartRound[] = [
  {
    id: 'nvidia-2023',
    candles: nvidiaRound.candles,
    volumeData: nvidiaRound.volumeData,
    correctAction: 'buy',
    companyName: 'Nvidia (NVDA)',
    whatHappened: 'Nvidia זינקה ב-240% ב-2023 בזכות ביקוש מטורף לשבבי AI',
    pattern: 'מגמת עלייה עם נפח עולה',
  },
  {
    id: 'meta-2022',
    candles: metaRound.candles,
    volumeData: metaRound.volumeData,
    correctAction: 'sell',
    companyName: 'Meta (META)',
    whatHappened:
      'מניית Meta צנחה 65% ב-2022, המטאוורס בלע מיליארדים והמשקיעים ברחו',
    pattern: 'שבירת תמיכה עם נפח מכירות גבוה',
  },
  {
    id: 'cocacola-2019',
    candles: cokeRound.candles,
    volumeData: cokeRound.volumeData,
    correctAction: 'hold',
    companyName: 'Coca-Cola (KO)',
    whatHappened:
      'קוקה-קולה נסחרה בטווח צר ב-2019, מניה יציבה שמשלמת דיבידנד',
    pattern: 'טווח מסחר צדדי עם נפח נמוך',
  },
  {
    id: 'apple-2020',
    candles: appleRound.candles,
    volumeData: appleRound.volumeData,
    correctAction: 'buy',
    companyName: 'Apple (AAPL)',
    whatHappened:
      'Apple זינקה 80% ב-2020, הקורונה האיצה מכירות iPhone ו-Mac',
    pattern: 'צלב זהב, ממוצע 50 חצה את ממוצע 200 כלפי מעלה',
  },
];

// ── Config Export ───────────────────────────────────────────────────────────

export const chartReaderConfig: ChartReaderConfig = {
  rounds: CHART_ROUNDS,
};

/** Total number of chart rounds */
export const TOTAL_ROUNDS = CHART_ROUNDS.length;
