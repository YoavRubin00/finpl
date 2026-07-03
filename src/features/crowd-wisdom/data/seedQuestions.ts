import type { CrowdWisdomQuestion } from "../types";

/**
 * Seed crowd-wisdom questions covering all 4 categories.
 * Seed vote counts produce a realistic distribution; the UI overlays the
 * user's own vote on top once they participate.
 *
 * All Hebrew text RTL, ≤80 chars for prompts.
 */
export const SEED_QUESTIONS: readonly CrowdWisdomQuestion[] = [
  // ─────────────────────────── SENTIMENT ───────────────────────────
  {
    id: "sentiment_market_monthly",
    category: "sentiment",
    prompt: "האם השוק יעלה החודש?",
    contextChip: "מדד המניות הגדולות בבורסה בת״א",
    choices: [
      { id: "bull", label: "שורי", glyph: "🐂", seedVotes: 5114, accentColor: "#10b981" },
      { id: "neutral", label: "ניטרלי", glyph: "😐", seedVotes: 1895, accentColor: "#94a3b8" },
      { id: "bear", label: "דובי", glyph: "🐻", seedVotes: 1241, accentColor: "#dc2626" },
    ],
    seedTotalVoters: 8250,
    closesInHours: 168,
    educational: {
      title: "מהו סנטימנט שוק?",
      body: "מד הסנטימנט הוא ההרגשה הכללית של המשקיעים. סנטימנט חיובי = ציפייה לעליות, שלילי = ציפייה לירידות. השוק לא תמיד הולך עם הסנטימנט — לפעמים דווקא נגדו.",
    },
  },

  // ─────────────────────────── YES/NO ───────────────────────────
  {
    id: "yn_nvda_buy_now",
    category: "yes_no",
    prompt: "האם תקנו את מניית NVIDIA במחיר נוכחי?",
    contextChip: "מניית שבבי הבינה המלאכותית",
    choices: [
      { id: "yes_buy", label: "כן, קונה", seedVotes: 2030, accentColor: "#10b981" },
      { id: "no_too_expensive", label: "לא, יקרה מדי", seedVotes: 1640, accentColor: "#dc2626" },
      { id: "waiting_report", label: "מחכה לדיווח", seedVotes: 648, accentColor: "#3b82f6" },
    ],
    seedTotalVoters: 4318,
    closesInHours: 14,
    educational: {
      title: "מהו P/E (מכפיל רווח)?",
      body: "יחס בין מחיר המניה לרווח שלה. מכפיל גבוה = השוק מצפה לצמיחה, אבל גם סיכון גבוה יותר.",
      example: "NVIDIA: P/E ≈ 30",
    },
  },
  {
    // Id kept as-is (vote/bet ledger key) though the threshold moved: BTC is near
    // a 21-month low (~$60K), so the old 100K target needed +66% — near-impossible
    // and no skill value. Near-money target + balanced seed (Waren 2026-07-03).
    id: "yn_bitcoin_100k",
    category: "yes_no",
    bettable: true,
    prompt: "האם ביטקוין יעבור 65K$ החודש?",
    contextChip: "מטבע דיגיטלי",
    choices: [
      { id: "yes", label: "כן, יעבור", seedVotes: 2280, accentColor: "#10b981" },
      { id: "no", label: "לא, ייתקע", seedVotes: 2109, accentColor: "#dc2626" },
    ],
    seedTotalVoters: 4389,
    closesInHours: 96,
  },
  {
    id: "yn_interest_cut",
    category: "yes_no",
    bettable: true,
    prompt: "האם בנק ישראל יוריד ריבית בישיבה הקרובה?",
    contextChip: "ריבית בנק ישראל",
    choices: [
      { id: "cut", label: "כן, ירידה", seedVotes: 803, accentColor: "#10b981" },
      { id: "hold", label: "לא, יישאר", seedVotes: 1841, accentColor: "#dc2626" },
      { id: "unknown", label: "לא יודע", seedVotes: 230, accentColor: "#94a3b8" },
    ],
    seedTotalVoters: 2874,
    closesInHours: 120,
    // Hard deadline the evening BEFORE the Bank of Israel decision (9.7.2026), so
    // nobody can vote once the outcome is public (Waren 2026-07-03).
    closesAt: "2026-07-08T22:00:00+03:00",
    educational: {
      title: "למה חשובה ההחלטה?",
      body: "ריבית בנק ישראל משפיעה על משכנתאות, פיקדונות והשקעות. ירידה = משכנתא זולה יותר, אבל גם פיקדונות פחות אטרקטיביים.",
    },
  },
  {
    id: "yn_tesla_correction",
    category: "yes_no",
    bettable: true,
    prompt: "האם טסלה תתקן 10% או יותר השבוע?",
    contextChip: "מניית יצרנית הרכב החשמלי",
    choices: [
      { id: "yes_correction", label: "כן, ירידה", seedVotes: 1820, accentColor: "#dc2626" },
      { id: "no_holds", label: "לא, יישאר", seedVotes: 2150, accentColor: "#10b981" },
    ],
    seedTotalVoters: 3970,
    closesInHours: 120,
  },

  // ─────────────────────────── CHOICE ───────────────────────────
  {
    id: "choice_next_buy",
    category: "choice",
    prompt: "מה תקנו בחודש הקרוב?",
    choices: [
      { id: "etf_world", label: "ETF עולמי", glyph: "🌍", seedVotes: 1842, accentColor: "#3b82f6" },
      { id: "single_stock", label: "מניה בודדת", glyph: "📈", seedVotes: 1124, accentColor: "#ea580c" },
      { id: "keren_hishtalmut", label: "קרן השתלמות", glyph: "💎", seedVotes: 988, accentColor: "#10b981" },
      { id: "not_buying", label: "לא קונה", glyph: "⏸️", seedVotes: 446, accentColor: "#94a3b8" },
    ],
    seedTotalVoters: 4400,
    closesInHours: 72,
    educational: {
      title: "ETF מול מניה בודדת",
      body: "ETF = סל של עשרות/מאות מניות, פיזור מובנה. מניה בודדת = תנודה גבוהה, פוטנציאל גדול אבל גם סיכון.",
    },
  },
  {
    id: "choice_emergency_fund",
    category: "choice",
    prompt: "כמה חודשים של הוצאות יש לכם בקרן חירום?",
    choices: [
      { id: "none", label: "אין לי", seedVotes: 980, accentColor: "#dc2626" },
      { id: "less_3", label: "פחות מ-3", seedVotes: 1450, accentColor: "#ea580c" },
      { id: "3_6", label: "3-6 חודשים", seedVotes: 1620, accentColor: "#10b981" },
      { id: "more_6", label: "יותר מ-6", seedVotes: 780, accentColor: "#0891b2" },
    ],
    seedTotalVoters: 4830,
    closesInHours: 168,
    educational: {
      title: "למה צריך קרן חירום?",
      body: "3-6 חודשי הוצאות מינימליים בחשבון נזיל — מגן עליכם מהלוואות בריבית גבוהה כשמשהו משתבש (פיטורים, רכב מתקלקל, רפואי).",
    },
  },

  // ─────────────────────────── FORECAST ───────────────────────────
  {
    id: "forecast_ta35_friday",
    category: "forecast",
    bettable: true,
    // Post-reform, TASE trades Mon–Fri, so the WEEKLY close is FRIDAY (aligned to
    // the global week). BETTABLE → these labels are ALWAYS shown as-is (never
    // re-anchored by buildLiveBrackets): they must match the static settlement
    // edges in BET_RESOLUTIONS exactly, or a stake could settle against ranges
    // the predictor never saw.
    prompt: "איפה ת״א 35 ייסגר ביום שישי?",
    contextChip: "מדד המניות הגדולות בבורסה בת״א",
    choices: [
      { id: "b1", label: "מתחת ל-4,080", seedVotes: 320, accentColor: "#dc2626" },
      { id: "b2", label: "4,080 – 4,120", seedVotes: 740, accentColor: "#ea580c" },
      { id: "b3", label: "4,120 – 4,160", seedVotes: 1480, accentColor: "#facc15" },
      { id: "b4", label: "4,160 – 4,200", seedVotes: 920, accentColor: "#10b981" },
      { id: "b5", label: "מעל 4,200", seedVotes: 280, accentColor: "#0891b2" },
    ],
    seedTotalVoters: 3740,
    closesInHours: 84,
    educational: {
      title: "מהו ת״א 35?",
      body: "מדד 35 החברות הגדולות בבורסה בת״א — הבנקים, טבע, נייס, חברה לישראל. הוא מייצג את הדופק של הכלכלה הישראלית.",
    },
  },
  {
    id: "forecast_sp500_year_end",
    category: "forecast",
    bettable: true,
    prompt: "איפה S&P 500 ייסגר בסוף השנה?",
    contextChip: "מדד 500 החברות הגדולות בארה״ב",
    // No live source (LIVE_LABELS = null) → these seed brackets are always shown,
    // so they must straddle today's real ~7,500 level with a year-end-width band.
    choices: [
      { id: "b1", label: "מתחת 7,000", seedVotes: 580, accentColor: "#dc2626" },
      { id: "b2", label: "7,000 – 7,300", seedVotes: 920, accentColor: "#ea580c" },
      { id: "b3", label: "7,300 – 7,700", seedVotes: 1820, accentColor: "#facc15" },
      { id: "b4", label: "7,700 – 8,000", seedVotes: 1380, accentColor: "#10b981" },
      { id: "b5", label: "מעל 8,000", seedVotes: 410, accentColor: "#0891b2" },
    ],
    seedTotalVoters: 5110,
    closesInHours: 360,
  },
  {
    id: "forecast_dollar_shekel",
    category: "forecast",
    bettable: true,
    prompt: "איפה הדולר/שקל יהיה בסוף החודש?",
    contextChip: "שער הדולר מול השקל",
    // 5 brackets (b1..b5), straddling today's real ~3.00 USD/ILS level (Waren
    // 2026-07-03: the shekel is ~2.98, so the old 3.5–3.7 range was ~20% stale).
    // BETTABLE → shown as-is, never re-anchored by buildLiveBrackets: the labels
    // must match the static settlement edges in BET_RESOLUTIONS exactly.
    choices: [
      { id: "b1", label: "מתחת ל-2.90", seedVotes: 300, accentColor: "#dc2626" },
      { id: "b2", label: "2.90 – 2.95", seedVotes: 500, accentColor: "#ea580c" },
      { id: "b3", label: "2.95 – 3.05", seedVotes: 720, accentColor: "#facc15" },
      { id: "b4", label: "3.05 – 3.10", seedVotes: 460, accentColor: "#10b981" },
      { id: "b5", label: "מעל 3.10", seedVotes: 170, accentColor: "#0891b2" },
    ],
    seedTotalVoters: 2150,
    closesInHours: 240,
  },
  {
    id: "yn_pension_increase",
    category: "yes_no",
    prompt: "תוסיפו לפנסיה החודש מעבר ל-6% החובה?",
    choices: [
      { id: "yes_more", label: "כן, אוסיף", seedVotes: 1240, accentColor: "#10b981" },
      { id: "minimum", label: "מינימום בלבד", seedVotes: 2840, accentColor: "#94a3b8" },
      { id: "less", label: "לא יכול עכשיו", seedVotes: 720, accentColor: "#dc2626" },
    ],
    seedTotalVoters: 4800,
    closesInHours: 168,
    educational: {
      title: "למה כדאי להוסיף לפנסיה?",
      body: "כל שקל שמופרש לפנסיה חוסך מס + צובר ריבית דריבית. תוספת של 1% בלבד מהשכר במשך 30 שנה יכולה להוסיף עשרות אלפי שקלים לפנסיה.",
    },
  },
  {
    id: "sentiment_inflation_direction",
    category: "sentiment",
    prompt: "לאן הולכת האינפלציה בשנה הקרובה?",
    contextChip: "קצב עליית המחירים במשק",
    choices: [
      { id: "down", label: "תרד", glyph: "📉", seedVotes: 2210, accentColor: "#10b981" },
      { id: "stay", label: "תישאר", glyph: "↔️", seedVotes: 1640, accentColor: "#94a3b8" },
      { id: "up", label: "תעלה", glyph: "📈", seedVotes: 940, accentColor: "#dc2626" },
    ],
    seedTotalVoters: 4790,
    closesInHours: 168,
  },
] as const;

/** Returns questions filtered by category, or all when category is null. */
export function getQuestionsByCategory(
  category: CrowdWisdomQuestion["category"] | null,
): readonly CrowdWisdomQuestion[] {
  if (!category) return SEED_QUESTIONS;
  return SEED_QUESTIONS.filter((q) => q.category === category);
}

/** Helper to look up a specific question. */
export function getQuestionById(id: string): CrowdWisdomQuestion | undefined {
  return SEED_QUESTIONS.find((q) => q.id === id);
}