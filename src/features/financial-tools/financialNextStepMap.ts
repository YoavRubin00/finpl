/**
 * Tool → (lesson, next-action) map. Single source of truth for the
 * `ToolNextStepCard` that renders at the bottom of every financial tool.
 *
 * Two outputs per tool:
 *   1. `lessonId` + `chapterId` — deep-link to the lesson that explains
 *      the underlying concept (lesson IDs were verified against the
 *      current `chapter*Data.ts` files; see git history for the audit).
 *   2. Either `actionRoute` (internal navigation, usually to a sibling
 *      tool that just got pre-filled from the shared financial profile)
 *      or `actionUrl` (external link — currently only the gov.il refund
 *      flow). Never both.
 *
 * The actionRoute loops are deliberate:
 *   payslip → salary-net → tax-refund → (gov.il external)
 *   compound → fire → mortgage → compound
 * Each step uses data the previous one saved, so the next tool feels
 * pre-aware of the user's situation.
 */

export type FinancialToolKey =
  | 'salary-net'
  | 'tax-refund'
  | 'mortgage'
  | 'pension-fees'
  | 'compound'
  | 'fire'
  | 'payslip';

interface NextStepEntry {
  /** Lesson id inside the chapter's modules array (e.g. `mod-2-11`). */
  lessonId: string;
  /** Chapter slug used in the `/lesson/[id]?chapterId=...` query param. */
  chapterId: string;
  /** Short Hebrew label for the "למד עוד" chip. */
  lessonLabel: string;
  /** Hebrew label for the primary action button. */
  actionLabel: string;
  /** In-app route to push when the action is tapped. Mutually exclusive with `actionUrl`. */
  actionRoute?: string;
  /** External URL to open via Linking. Mutually exclusive with `actionRoute`. */
  actionUrl?: string;
}

export const NEXT_STEPS: Record<FinancialToolKey, NextStepEntry> = {
  'salary-net': {
    lessonId: 'mod-2-11',
    chapterId: 'chapter-2',
    lessonLabel: 'נקודות זיכוי — איך הן משפיעות',
    // Dilution 11.7: tax-refund left the shelf — route the next step to a
    // visible tool instead of advertising a hidden one.
    actionLabel: 'תראה מה הנטו יכול לצמוח',
    actionRoute: '/compound-calculator',
  },
  'tax-refund': {
    lessonId: 'mod-2-11',
    chapterId: 'chapter-2',
    lessonLabel: 'מי זכאי להחזר ולמה',
    actionLabel: 'להגיש בקשה ברשות המסים',
    actionUrl: 'https://www.gov.il/he/service/income-tax-credit',
  },
  mortgage: {
    lessonId: 'mod-5-26',
    chapterId: 'chapter-5',
    lessonLabel: 'נדל"ן ומשכנתא — איך זה עובד',
    actionLabel: 'תכנן את ההון העצמי',
    actionRoute: '/compound-calculator',
  },
  'pension-fees': {
    lessonId: 'mod-2-11',
    chapterId: 'chapter-2',
    lessonLabel: 'למה כל אחוז של דמי ניהול חשוב',
    actionLabel: 'חברו את החשבונות',
    actionRoute: '/bridge',
  },
  compound: {
    lessonId: 'mod-1-1',
    chapterId: 'chapter-1',
    lessonLabel: 'ריבית דריבית — הקסם השמיני',
    actionLabel: 'תכנן את הפנסיה שלך',
    actionRoute: '/fire-calculator',
  },
  fire: {
    lessonId: 'mod-5-25',
    chapterId: 'chapter-5',
    lessonLabel: 'תנועת FIRE — חופש כלכלי מוקדם',
    // Dilution 11.7: mortgage left the shelf — close the loop back into
    // compound (fire ↔ compound) instead of a hidden tool.
    actionLabel: 'תראה איך ההון גדל בדרך',
    actionRoute: '/compound-calculator',
  },
  payslip: {
    lessonId: 'mod-1-5',
    chapterId: 'chapter-1',
    lessonLabel: 'איך לקרוא תלוש שכר',
    actionLabel: 'חשב את הנטו האמיתי',
    actionRoute: '/salary-net-calculator',
  },
};
