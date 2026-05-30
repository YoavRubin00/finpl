/**
 * Per-tool first-visit tutorial scripts.
 *
 * Each active tool gets a 2-3 step Captain Shark walkthrough that opens
 * automatically the first time the user lands on the tool screen. The
 * Hebrew copy lives in the sibling `toolTutorials.scripts.json` (source of
 * truth for the audio generator); this file mirrors the same strings and
 * points each step at a Vercel Blob URL for Liam-V3 voice-over playback.
 *
 * Regenerate + re-upload audio after editing copy:
 *   npm run generate-tool-audio        # local MP3s
 *   npm run upload-tool-tutorial-audio # push to Vercel Blob
 *
 * Adding a new tool tutorial:
 *   1. Add the tool's steps to `toolTutorials.scripts.json`.
 *   2. Mirror the entry below.
 *   3. Run the two scripts above to publish the audio.
 *
 * Audio is optional — the overlay still renders the copy when no URL is
 * provided (useful while drafting before the MP3 has been uploaded).
 */

import type { ToolKey } from '../toolsRegistry';

const AUDIO_BASE =
  'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audios/tool-tutorials';

const audio = (slug: string, step: 1 | 2 | 3): string => `${AUDIO_BASE}/${slug}-step-${step}.mp3`;

export interface ToolTutorialStep {
  title: string;
  emoji: string;
  message: string;
  /** Vercel Blob URL for the Liam-V3 voice-over. Optional — overlay skips
   *  audio playback when undefined. */
  audioUrl?: string;
}

export const TOOL_TUTORIALS: Partial<Record<ToolKey, ToolTutorialStep[]>> = {
  payslip: [
    { title: 'תלוש שכר', emoji: '📄', message: 'ברוכים הבאים לקורא התלוש. צלמו או העלו את תלוש השכר ואני אסביר לכם כל שורה.',
      audioUrl: audio('payslip', 1) },
    { title: 'מה בודקים', emoji: '🔍', message: 'אני מאתר אנומליות, חישובי הפרשות לפנסיה ולקרן השתלמות, ומוודא שאתם לא מפסידים כסף.',
      audioUrl: audio('payslip', 2) },
    { title: 'טיפ', emoji: '💡', message: 'שמונה מתוך עשרה ישראלים מגלים טעויות בתלוש. כדאי לבדוק אחת לכמה חודשים.',
      audioUrl: audio('payslip', 3) },
  ],
  compound: [
    { title: 'ריבית דריבית', emoji: '📈', message: 'ברוכים הבאים למחשבון ריבית דריבית — המנגנון החזק ביותר בעולם הפיננסי.',
      audioUrl: audio('compound', 1) },
    { title: 'איך משתמשים', emoji: '🛠️', message: 'הזינו סכום התחלתי, הפקדה חודשית, ריבית שנתית וטווח שנים — תראו איך הכסף מכפיל את עצמו.',
      audioUrl: audio('compound', 2) },
    { title: 'טיפ', emoji: '✨', message: 'אינשטיין כינה את זה הפלא השמיני. נסו מאה שקלים בחודש למשך שלושים שנה ותופתעו.',
      audioUrl: audio('compound', 3) },
  ],
  fire: [
    { title: 'חופש פיננסי', emoji: '🔥', message: 'ברוכים הבאים למחשבון ה-FIRE. כאן נחשב בכמה שנים תוכלו לפרוש.',
      audioUrl: audio('fire', 1) },
    { title: 'איך משתמשים', emoji: '🛠️', message: 'הזינו את ההוצאות החודשיות, החיסכון החודשי וכמה כבר חסכתם, ואומר לכם מתי תגיעו לאי תלות פיננסית.',
      audioUrl: audio('fire', 2) },
    { title: 'טיפ', emoji: '💡', message: 'הסוד פשוט: חסכו חצי מההכנסה והשקיעו במדדים. תוך חמש עשרה עד עשרים שנה אתם חופשיים.',
      audioUrl: audio('fire', 3) },
  ],
  'salary-net': [
    { title: 'ברוטו ↔ נטו', emoji: '💰', message: 'בואו נבדוק כמה באמת נכנס לכם לכיס מהשכר ברוטו.',
      audioUrl: audio('salary-net', 1) },
    { title: 'מה מקבלים', emoji: '🧾', message: 'אני מחשב מס הכנסה, ביטוח לאומי ומס בריאות — תקבלו את הנטו האמיתי שלכם.',
      audioUrl: audio('salary-net', 2) },
    { title: 'טיפ', emoji: '💡', message: 'אם המעסיק מציע "תוספת לטובת המס" — תבדקו פעמיים. לפעמים זה רק כסף שגם ככה היה מגיע לכם.',
      audioUrl: audio('salary-net', 3) },
  ],
  'tax-refund': [
    { title: 'החזר מס', emoji: '🧾', message: 'שמונה מתוך עשרה ישראלים זכאים להחזר מס ולא יודעים. בואו נבדוק אם גם אתם.',
      audioUrl: audio('tax-refund', 1) },
    { title: 'איך זה עובד', emoji: '🛠️', message: 'ענו על כמה שאלות — מצב משפחתי, השתלמות, נסיעות — ואני אגיד לכם כמה כסף שווה לבקש בחזרה.',
      audioUrl: audio('tax-refund', 2) },
    { title: 'טיפ', emoji: '💡', message: 'אפשר לבקש החזר על שש השנים האחרונות. עדיף לפעול לפני סוף השנה.',
      audioUrl: audio('tax-refund', 3) },
  ],
  mortgage: [
    { title: 'משכנתא', emoji: '🏠', message: 'ברוכים הבאים למחשבון המשכנתא. כאן תבדקו אם משכנתא היא עסקה משתלמת בשבילכם.',
      audioUrl: audio('mortgage', 1) },
    { title: 'מה מקבלים', emoji: '🧮', message: 'הזינו מחיר דירה, הון עצמי, ריבית ותקופה — תראו את ההחזר החודשי, סך הריבית והאם הבנק יאשר.',
      audioUrl: audio('mortgage', 2) },
    { title: 'טיפ', emoji: '💡', message: 'כלל אצבע: ההחזר החודשי לא צריך לעבור שלושים אחוז מההכנסה. נסו תמהילים שונים.',
      audioUrl: audio('mortgage', 3) },
  ],
  'pension-fees': [
    { title: 'דמי ניהול', emoji: '🐖', message: 'דמי ניהול הם המס הסמוי שמכרסם בפנסיה שלכם. בואו נבדוק כמה אתם משלמים.',
      audioUrl: audio('pension-fees', 1) },
    { title: 'מה משווים', emoji: '📊', message: 'הזינו גיל, שכר ודמי ניהול — אני אשווה לדמי הניהול הזולים בשוק ואגיד לכם כמה תפסידו עד הפרישה.',
      audioUrl: audio('pension-fees', 2) },
    { title: 'טיפ', emoji: '💡', message: 'מעבר משלושה אחוז הפרשה לאחוז אחד יכול להוסיף לכם מאות אלפי שקלים. שווה את הטלפון.',
      audioUrl: audio('pension-fees', 3) },
  ],
  analyst: [
    { title: 'אנליסט מניות', emoji: '🔮', message: 'ברוכים הבאים לאנליסט המניות. בקשו ממני סקירה על כל מניה ואני אנתח אותה לעומק.',
      audioUrl: audio('analyst', 1) },
    { title: 'מה אני בודק', emoji: '🔬', message: 'תזרים, רווחיות, צמיחה, מתחרים ויתרון תחרותי — תקבלו דעה ברורה: לקנות, להחזיק או למכור.',
      audioUrl: audio('analyst', 2) },
    { title: 'טיפ', emoji: '⚠️', message: 'זה לא ייעוץ השקעות. אל תקנו מניות רק על סמך ניתוח אחד — תמיד תפזרו את הסיכון.',
      audioUrl: audio('analyst', 3) },
  ],
  'breaking-news': [
    { title: 'חדשות מתפרצות', emoji: '🔥', message: 'כאן תקבלו את סיכום ה-AI היומי של מה שזז בשוק — בצורה ברורה ומובנת.',
      audioUrl: audio('breaking-news', 1) },
    { title: 'מה מקבלים', emoji: '📰', message: 'כל יום אני מסכם שלוש עד חמש חדשות מרכזיות, עם השפעתן על השוק ומדד הייפ של כל מניה.',
      audioUrl: audio('breaking-news', 2) },
    { title: 'טיפ', emoji: '💡', message: 'החדשות לא תמיד אומרות שצריך לפעול. לפעמים שווה רק להבין מה קורה ולהמשיך באסטרטגיה.',
      audioUrl: audio('breaking-news', 3) },
  ],
  // portfolio + cashflow: coming_soon — no tutorial; the route is /coming-soon, not the tool.
};
