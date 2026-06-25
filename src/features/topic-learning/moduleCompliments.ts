// Captain Shark compliments — shown inline when the user CONTINUES past the chest
// and when a module hits 100%. Voice = Captain Shark personal: 2nd-person SINGULAR,
// gender-neutral (docs/BRAND.md §"קפטן שארק מדבר אישית" — uses "שלך"/"אליך", no
// gendered 2nd-person verbs). Each picker returns a fresh, non-repeating line so
// "כל פעם מחמאה אחרת" (Yoav 2026-06-25).

const CONTINUE_COMPLIMENTS: readonly string[] = [
  'הבחירה להמשיך — בדיוק מה שמפריד בין חובבן למקצוען.',
  'עוד צעד קדימה. ההתמדה הזאת תשתלם בגדול.',
  'כבוד על ההמשך. ככה נראית דרך לחופש כלכלי.',
  'אין עצירה באמצע — וזה הולך עד הסוף. אהבתי.',
  'צעד אחרי צעד, וזה מצטבר. יפה מאוד.',
  'הרעב הזה ללמוד? נדיר ויקר.',
];

const MODULE_COMPLETE_COMPLIMENTS: readonly string[] = [
  'מודולה שלמה הושלמה! הזהב בדרך אליך.',
  'כל הכבוד — מודולה שלמה מאחורי הגב. צעד אמיתי לחופש כלכלי.',
  'סיום מודולה מלא! זה הקצב של אלופים.',
];

// Module-scoped cursors so consecutive picks never repeat. Math.random is fine at
// app runtime (same pattern as SharkChipCallout's shuffle).
let lastContinueIdx = -1;
let lastCompleteIdx = -1;

function pickNonRepeating(arr: readonly string[], lastIdx: number): { msg: string; idx: number } {
  if (arr.length === 0) return { msg: '', idx: -1 };
  if (arr.length === 1) return { msg: arr[0], idx: 0 };
  let idx = Math.floor(Math.random() * arr.length);
  if (idx === lastIdx) idx = (idx + 1) % arr.length;
  return { msg: arr[idx], idx };
}

/** A fresh "you chose to keep going" compliment (after the chest). */
export function pickContinueCompliment(): string {
  const { msg, idx } = pickNonRepeating(CONTINUE_COMPLIMENTS, lastContinueIdx);
  lastContinueIdx = idx;
  return msg;
}

/** A fresh "you finished the whole module" compliment (100%). */
export function pickModuleCompleteCompliment(): string {
  const { msg, idx } = pickNonRepeating(MODULE_COMPLETE_COMPLIMENTS, lastCompleteIdx);
  lastCompleteIdx = idx;
  return msg;
}
