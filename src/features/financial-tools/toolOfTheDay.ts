/**
 * toolOfTheDay — single source of truth for the "Tool of the Day" rotation.
 *
 * Why: PostHog (2026-06-05) showed only ~2.5% of WAU touch a financial tool.
 * The 7 tools exist but had almost no discovery surface. This engine drives
 * ONE tool per calendar day across EVERY surface (home banner, in-lesson CTA,
 * daily push) so the user discovers a different tool each day and the whole
 * set cycles roughly weekly — and the SAME tool appears everywhere that day,
 * so the nudges reinforce rather than contradict each other.
 *
 * Pure + deterministic (keyed on the calendar day) — no persistence needed:
 * every surface computing toolOfTheDay() on the same day gets the same tool.
 *
 * Copy follows BRAND.md: Captain Shark's voice, singular "you" (AI voice),
 * emoji-free push titles (CALM push-copy audit 2026-05-30).
 */

export interface DailyTool {
  /** Stable analytics id (tool_key). Also the rotation identity. */
  toolKey: string;
  /** expo-router route opened on tap. */
  route: string;
  /** Headline for the home banner + in-lesson CTA (shark voice, singular). */
  title: string;
  /** Notification title — emoji-free per CALM push-copy rule. */
  pushTitle: string;
  /** Notification body. */
  pushBody: string;
}

/**
 * The rotation pool — all 7 financial tools. Order defines the weekly cycle.
 * Routes verified against app/*.tsx (2026-06-16).
 */
export const DAILY_TOOLS: readonly DailyTool[] = [
  {
    toolKey: 'fire',
    route: '/fire-calculator',
    title: 'מתי תוכל להפסיק לעבוד? תגלה בדקה',
    pushTitle: 'מתי תוכל להפסיק לעבוד',
    pushBody: 'מחשבון העצמאות הכלכלית מחכה לך. בדיקה של דקה.',
  },
  {
    toolKey: 'compound',
    route: '/compound-calculator',
    title: 'תראה איך 100₪ הופכים ל-10,000₪',
    pushTitle: 'הכוח של ריבית דריבית',
    pushBody: 'תראה איך סכום קטן גדל עם הזמן. שווה דקה.',
  },
  {
    toolKey: 'payslip',
    route: '/payslip-analyzer',
    title: 'מה באמת מנכים לך מהתלוש?',
    pushTitle: 'מה מנכים לך מהתלוש',
    pushBody: 'תן ל-AI לנתח את התלוש שלך. אולי תופתע.',
  },
  {
    toolKey: 'pension-fees',
    route: '/pension-fees-comparator',
    title: 'דמי הניהול גוזלים ממך מאות אלפים',
    pushTitle: 'דמי הניהול שלך',
    pushBody: 'אחוז קטן היום = מאות אלפים בפנסיה. תשווה עכשיו.',
  },
  {
    toolKey: 'mortgage',
    route: '/mortgage-calculator',
    title: 'כמה באמת תשלם על המשכנתא?',
    pushTitle: 'כמה תעלה לך המשכנתא',
    pushBody: 'תראה את התמונה המלאה לפני שתחתום. דקה.',
  },
  {
    toolKey: 'salary-net',
    route: '/salary-net-calculator',
    title: 'מהברוטו לנטו — כמה נכנס באמת?',
    pushTitle: 'כמה נכנס לך לחשבון',
    pushBody: 'מברוטו לנטו בלי הפתעות. תחשב בדקה.',
  },
  {
    toolKey: 'tax-refund',
    route: '/tax-refund-calculator',
    title: 'מגיע לך החזר מס? תבדוק',
    pushTitle: 'אולי מגיע לך החזר מס',
    pushBody: 'הרבה אנשים לא יודעים שמגיע להם כסף בחזרה. תבדוק.',
  },
] as const;

/** Day-of-year (1-based-ish), matching the existing ToolsDiscoveryBanner
 *  computation so all surfaces rotate in lockstep. */
export function dayOfYear(now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Today's tool — the same across every surface on a given calendar day. */
export function toolOfTheDay(now: Date = new Date()): DailyTool {
  return DAILY_TOOLS[dayOfYear(now) % DAILY_TOOLS.length]!;
}
