/**
 * Rotating preview text for "מחר התיבה בנושא X" — surfaces inside the
 * chest CTAs as a small Captain Shark hint. Goal: pre-load anticipation
 * so the user thinks "I want to come back tomorrow" (Yoav R6 2026-06-10
 * via the LiveOps + Duolingo PM agents). One week of topics; cycles.
 *
 * Avoid jargon — the preview text reads to a user who hasn't started
 * the module yet, so the topic should sound concrete and inviting.
 */
const TOPICS: readonly string[] = [
  'איך לחסוך 1,000 ₪ בחודש בלי להרגיש',
  'איזו השקעה מנצחת על פני 25 שנה',
  'הסוד של דמי הניהול שאף אחד לא מספר לך',
  'איך לזהות פרסומת פיננסית של נוכלות',
  'מתי לקחת משכנתא ומתי לוותר',
  'איך לפזר תיק השקעות בלי להבזבז',
  'הטריק לקבלת תשואה כפולה על חיסכון',
];

/**
 * Pick today's forecast topic. Cycles through `TOPICS` based on day of
 * year so the same topic shows for everyone on the same day (lets the
 * push copy match the in-app copy without per-user state).
 */
export function nextChestForecastTopic(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return TOPICS[(dayOfYear + 1) % TOPICS.length];
}
