/**
 * Per-module "aha" line for the chest celebration (Yoav 11.7, from the
 * strategy review: "התיבה היא חיזוק; ה-aha הוא הסיבה לחזור"). One sentence
 * that names the VALUE the user just earned — what they now know/can do —
 * so the win moment is anchored to their life, not only to coins.
 *
 * Voice: singular (learning-flow voice per docs/BRAND.md), no shark emoji.
 * Fallback keeps every module covered until curated lines are written.
 */
const MODULE_AHA_LINES: Record<string, string> = {
  'mod-0-1': 'עכשיו אתה מדבר את שפת הכסף — תקציב, ריבית ונכסים כבר לא סינית',
  'mod-0-1b': 'עכשיו יש לך את ארגז הכלים הבסיסי שרוב האנשים לומדים רק בגיל 40',
  'mod-0-2': 'עכשיו אתה מבין למה כסף שווה משהו — ולמה הוא נשחק כשלא עושים איתו כלום',
};

const FALLBACK_AHA = 'עוד צעד אמיתי בשליטה שלך בכסף';

export function ahaLineFor(moduleId: string): string {
  return MODULE_AHA_LINES[moduleId] ?? FALLBACK_AHA;
}
