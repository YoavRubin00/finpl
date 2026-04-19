/** Market event data and configuration for the "Panic Index" simulation (Module 3-16) */

import type { MarketEvent, PanicIndexConfig } from './panicIndexTypes';

// ── Constants ──────────────────────────────────────────────────────────

/** Starting investment amount (₪) */
const INITIAL_INVESTMENT = 50_000;

/** Bonus multiplier for holding through all events */
const RECOVERY_BONUS = 1.05;

// ── Market Events (inspired by real market history) ────────────────────
// Journey: ₪50,000 → dip to ~₪32,000 → recover to ~₪72,000
// Cumulative: 1.15 × 0.90 × 0.85 × 0.73 × 1.00 × 1.20 × 1.35 × 1.38 ≈ 1.44
// 50,000 × 1.44 ≈ 72,000

const marketEvents: MarketEvent[] = [
  {
    id: 'event-1',
    year: 1,
    headline: '📈 שוק שוורי! מניות בשיא חדש',
    marketChange: 0.15,
    sentiment: 'greed',
    historicalContext: 'שוק עולה, כולם אופטימיים, תשואות דו-ספרתיות',
  },
  {
    id: 'event-2',
    year: 2,
    headline: '⚠️ קורקציה בשוק: ירידה של 10%',
    marketChange: -0.10,
    sentiment: 'fear',
    historicalContext: 'תיקון טבעי אחרי עליות חדות, קורה בממוצע פעם בשנתיים',
  },
  {
    id: 'event-3',
    year: 3,
    headline: '🚨 מיתון בפתח! מומחים מזהירים: "תמכרו הכל!"',
    marketChange: -0.15,
    sentiment: 'fear',
    historicalContext: 'כותרות פאניקה בתקשורת, רוב המומחים טועים בתזמון',
  },
  {
    id: 'event-4',
    year: 4,
    headline: '💥 קריסה! ירידה חדה, השוק במשבר',
    marketChange: -0.27,
    sentiment: 'fear',
    historicalContext: 'ירידה דומה למשבר 2008. רוב המשקיעים נכנסים לפאניקה ומוכרים',
  },
  {
    id: 'event-5',
    year: 5,
    headline: '😰 "מומחה בכיר מזהיר: תמכרו לפני שיהיה מאוחר!"',
    marketChange: 0,
    sentiment: 'fear',
    historicalContext: 'תחתית השוק, שטוח. הלחץ למכור בשיא. אבל ההיסטוריה מלמדת: זה הזמן להחזיק',
  },
  {
    id: 'event-6',
    year: 6,
    headline: '🌱 סימני התאוששות ראשונים, השוק עולה 20%',
    marketChange: 0.20,
    sentiment: 'neutral',
    historicalContext: 'אחרי כל משבר מגיעה התאוששות. מי שמכר, פספס אותה',
  },
  {
    id: 'event-7',
    year: 7,
    headline: '🚀 ראלי חזק! מניות זינקו 35%',
    marketChange: 0.35,
    sentiment: 'greed',
    historicalContext: 'השוק מתאושש מעבר לרמה שלפני המשבר, מי שהחזיק מרוויח',
  },
  {
    id: 'event-8',
    year: 8,
    headline: '🏆 שיא חדש! +38%, תיק ההשקעות שלך בשיא כל הזמנים',
    marketChange: 0.38,
    sentiment: 'greed',
    historicalContext: 'שיא היסטורי. סבלנות השתלמה, ₪50,000 הפכו ל-₪72,000+',
  },
];

// ── Config Export ───────────────────────────────────────────────────────

export const panicIndexConfig: PanicIndexConfig = {
  initialInvestment: INITIAL_INVESTMENT,
  events: marketEvents,
  recoveryBonus: RECOVERY_BONUS,
};
