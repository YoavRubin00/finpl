import type { IndicatorId } from './tradingHubTypes';

export interface IndicatorInfo {
  title: string;
  body: string;
  example: string;
}

/**
 * Hebrew explanations shown in `IndicatorInfoSheet` when the user taps ℹ️
 * next to an indicator in the advanced chart mode.
 * Kept short and educational — aimed at learners, not traders.
 * The MA info is period-aware: the user-selected period (20/50/100/200) is
 * interpolated so the explanation always matches what's on-screen.
 */
export function getIndicatorInfo(id: IndicatorId, period: number): IndicatorInfo {
  if (id === 'ma20') {
    return {
      title: `MA${period} — ממוצע נע של ${period} ימים`,
      body: `הקו מראה את המחיר הממוצע ב-${period} ימי המסחר האחרונים. כשהמחיר מעליו, בדרך כלל מדובר במגמת עלייה; מתחתיו — במגמת ירידה. תקופות גדולות (200 ימים) מראות מגמה ארוכת-טווח, קטנות (20) — מגמה קצרה.`,
      example: `לדוגמה: SPY ב-$450 כשה-MA${period} ב-$440 = הנכס נסחר חזק מהממוצע של הטווח.`,
    };
  }
  return {
    title: 'RSI — מדד עוצמה יחסית',
    body: 'ערך בין 0 ל-100 שמודד את עוצמת התנועה האחרונה של הנכס. מעל 70 = קנייה-יתר (עלול לתקן כלפי מטה). מתחת 30 = מכירה-יתר (עשוי להיות הזדמנות). רמזים — לא ודאות.',
    example: 'לדוגמה: RSI=75 במנייה שעלתה חזק השבוע — אולי תיקון בקרוב, אבל ייתכן שהעלייה תימשך.',
  };
}
