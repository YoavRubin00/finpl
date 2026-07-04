import type { AnonAdvicePost } from './anonAdviceTypes';

/**
 * Cold-start example dilemmas (Yoav 2026-07-04). Shown ONLY while the real
 * feed is empty, so a first visitor sees the format instead of a blank screen —
 * they self-retire the instant any real post exists. Written in the style of
 * real Israeli finance-community posts (first person, real numbers, a genuine
 * tension) — NOT generic textbook questions.
 *
 * Honesty guard-rails (these are NOT real users):
 *  - zero fabricated engagement: 0 replies, 0 option votes.
 *  - ids are `seed-*` → the feed screen renders them read-only (no navigation
 *    into a post screen that has no store entry, no voting).
 *  - clearly labeled "דוגמאות מהקהילה" above the list.
 */

export function isSeedDilemma(id: string): boolean {
  return id.startsWith('seed-');
}

export const SEED_DILEMMAS: AnonAdvicePost[] = [
  {
    id: 'seed-dl-friend-loan',
    alias: { emoji: '🦉', noun: 'השכן', number: 4821 },
    isSelf: false,
    situation:
      'יש לי חבר קרוב שנכנס לחוב של בערך 200 אלף ש״ח על עסק שלא הצליח — הכוונות שלו היו טובות, פשוט לא הלך. הוא משלם לבנק ריבית של כ-15% בשנה, כבר אחרי איחוד הלוואות, ועובד משלוחים בערבים רק כדי לעמוד בהחזרים. לי יש בדיוק סכום כזה שיושב בפיקדון על 4.5%. הוא בכלל לא יודע שיש לי את זה.',
    question: 'להציע לו הלוואה פרטית ב-5% שתחסוך לו עשרות אלפים — או שכסף וחברות זה שילוב שתמיד נגמר רע?',
    options: ['להציע לו — עם הסכם מסודר', 'לא לערבב כסף וחברות'],
    tags: ['חוב', 'חיסכון'],
    createdAt: '2026-07-01T20:15:00.000Z',
    replyCount: 0,
    optionVotes: [0, 0],
    status: 'approved',
  },
  {
    id: 'seed-dl-rent-vs-buy',
    alias: { emoji: '🐢', noun: 'הסבלנית', number: 1187 },
    isSelf: false,
    situation:
      'בת 27, חסכתי 320 אלף ש״ח (כן, לקח 6 שנים ושני עבודות). ההורים לוחצים "לסגור דירה עכשיו לפני שהמחירים בורחים" — עם ההון הזה אני יכולה לקנות רק בפריפריה, משכנתא של כ-6,500 ש״ח בחודש ל-30 שנה, והעבודה שלי במרכז. החלופה: להמשיך לשכור ב-4,200 ש״ח ולהשקיע את החיסכון במדדים רחבים.',
    question: 'דירה בפריפריה שאני לא אגור בה — או להמשיך לשכור ולתת לכסף לעבוד בשוק?',
    options: ['לקנות — נדל״ן זה ביטחון', 'לשכור ולהשקיע במדדים'],
    tags: ['דירה ראשונה', 'השקעות'],
    createdAt: '2026-06-30T08:40:00.000Z',
    replyCount: 0,
    optionVotes: [0, 0],
    status: 'approved',
  },
];
