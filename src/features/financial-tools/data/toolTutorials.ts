/**
 * Per-tool first-visit tutorial scripts.
 *
 * Each active tool gets a 2-3 step Captain Shark walkthrough that opens
 * automatically the first time the user lands on the tool screen. The
 * Hebrew copy lives in the sibling `toolTutorials.scripts.json` (source of
 * truth for the audio generator); this file mirrors the same strings and
 * `require()`s the generated MP3s so Metro bundles them.
 *
 * Regenerate audio after editing copy:
 *   npm run generate-tool-audio
 *
 * Adding a new tool tutorial:
 *   1. Add the tool's steps to `toolTutorials.scripts.json`.
 *   2. Mirror the entry below with a `require()` per step.
 *   3. Run `npm run generate-tool-audio` to create the MP3s.
 *
 * Audio is intentionally optional — the overlay still renders the copy when
 * the MP3 hasn't been generated yet (run the script above to enable VO).
 */

import type { ToolKey } from '../toolsRegistry';

export interface ToolTutorialStep {
  title: string;
  emoji: string;
  message: string;
  /** Local MP3 asset id. Result of `require('../../../../assets/audio/tool-tutorials/...mp3')`.
   *  Optional — overlay skips audio playback when undefined. */
  audio?: number;
}

export const TOOL_TUTORIALS: Partial<Record<ToolKey, ToolTutorialStep[]>> = {
  payslip: [
    { title: 'תלוש שכר', emoji: '📄', message: 'ברוכים הבאים לקורא התלוש. צלמו או העלו את תלוש השכר ואני אסביר לכם כל שורה.',
      audio: require('../../../../assets/audio/tool-tutorials/payslip-step-1.mp3') },
    { title: 'מה בודקים', emoji: '🔍', message: 'אני מאתר אנומליות, חישובי הפרשות לפנסיה ולקרן השתלמות, ומוודא שאתם לא מפסידים כסף.',
      audio: require('../../../../assets/audio/tool-tutorials/payslip-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'שמונה מתוך עשרה ישראלים מגלים טעויות בתלוש. כדאי לבדוק אחת לכמה חודשים.',
      audio: require('../../../../assets/audio/tool-tutorials/payslip-step-3.mp3') },
  ],
  compound: [
    { title: 'ריבית דריבית', emoji: '📈', message: 'ברוכים הבאים למחשבון ריבית דריבית — המנגנון החזק ביותר בעולם הפיננסי.',
      audio: require('../../../../assets/audio/tool-tutorials/compound-step-1.mp3') },
    { title: 'איך משתמשים', emoji: '🛠️', message: 'הזינו סכום התחלתי, הפקדה חודשית, ריבית שנתית וטווח שנים — תראו איך הכסף מכפיל את עצמו.',
      audio: require('../../../../assets/audio/tool-tutorials/compound-step-2.mp3') },
    { title: 'טיפ', emoji: '✨', message: 'אינשטיין כינה את זה הפלא השמיני. נסו מאה שקלים בחודש למשך שלושים שנה ותופתעו.',
      audio: require('../../../../assets/audio/tool-tutorials/compound-step-3.mp3') },
  ],
  fire: [
    { title: 'חופש פיננסי', emoji: '🔥', message: 'ברוכים הבאים למחשבון ה-FIRE. כאן נחשב בכמה שנים תוכלו לפרוש.',
      audio: require('../../../../assets/audio/tool-tutorials/fire-step-1.mp3') },
    { title: 'איך משתמשים', emoji: '🛠️', message: 'הזינו את ההוצאות החודשיות, החיסכון החודשי וכמה כבר חסכתם, ואומר לכם מתי תגיעו לאי תלות פיננסית.',
      audio: require('../../../../assets/audio/tool-tutorials/fire-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'הסוד פשוט: חסכו חצי מההכנסה והשקיעו במדדים. תוך חמש עשרה עד עשרים שנה אתם חופשיים.',
      audio: require('../../../../assets/audio/tool-tutorials/fire-step-3.mp3') },
  ],
  'salary-net': [
    { title: 'ברוטו ↔ נטו', emoji: '💰', message: 'בואו נבדוק כמה באמת נכנס לכם לכיס מהשכר ברוטו.',
      audio: require('../../../../assets/audio/tool-tutorials/salary-net-step-1.mp3') },
    { title: 'מה מקבלים', emoji: '🧾', message: 'אני מחשב מס הכנסה, ביטוח לאומי ומס בריאות — תקבלו את הנטו האמיתי שלכם.',
      audio: require('../../../../assets/audio/tool-tutorials/salary-net-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'אם המעסיק מציע "תוספת לטובת המס" — תבדקו פעמיים. לפעמים זה רק כסף שגם ככה היה מגיע לכם.',
      audio: require('../../../../assets/audio/tool-tutorials/salary-net-step-3.mp3') },
  ],
  'tax-refund': [
    { title: 'החזר מס', emoji: '🧾', message: 'שמונה מתוך עשרה ישראלים זכאים להחזר מס ולא יודעים. בואו נבדוק אם גם אתם.',
      audio: require('../../../../assets/audio/tool-tutorials/tax-refund-step-1.mp3') },
    { title: 'איך זה עובד', emoji: '🛠️', message: 'ענו על כמה שאלות — מצב משפחתי, השתלמות, נסיעות — ואני אגיד לכם כמה כסף שווה לבקש בחזרה.',
      audio: require('../../../../assets/audio/tool-tutorials/tax-refund-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'אפשר לבקש החזר על שש השנים האחרונות. עדיף לפעול לפני סוף השנה.',
      audio: require('../../../../assets/audio/tool-tutorials/tax-refund-step-3.mp3') },
  ],
  mortgage: [
    { title: 'משכנתא', emoji: '🏠', message: 'ברוכים הבאים למחשבון המשכנתא. כאן תבדקו אם משכנתא היא עסקה משתלמת בשבילכם.',
      audio: require('../../../../assets/audio/tool-tutorials/mortgage-step-1.mp3') },
    { title: 'מה מקבלים', emoji: '🧮', message: 'הזינו מחיר דירה, הון עצמי, ריבית ותקופה — תראו את ההחזר החודשי, סך הריבית והאם הבנק יאשר.',
      audio: require('../../../../assets/audio/tool-tutorials/mortgage-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'כלל אצבע: ההחזר החודשי לא צריך לעבור שלושים אחוז מההכנסה. נסו תמהילים שונים.',
      audio: require('../../../../assets/audio/tool-tutorials/mortgage-step-3.mp3') },
  ],
  'pension-fees': [
    { title: 'דמי ניהול', emoji: '🐖', message: 'דמי ניהול הם המס הסמוי שמכרסם בפנסיה שלכם. בואו נבדוק כמה אתם משלמים.',
      audio: require('../../../../assets/audio/tool-tutorials/pension-fees-step-1.mp3') },
    { title: 'מה משווים', emoji: '📊', message: 'הזינו גיל, שכר ודמי ניהול — אני אשווה לדמי הניהול הזולים בשוק ואגיד לכם כמה תפסידו עד הפרישה.',
      audio: require('../../../../assets/audio/tool-tutorials/pension-fees-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'מעבר משלושה אחוז הפרשה לאחוז אחד יכול להוסיף לכם מאות אלפי שקלים. שווה את הטלפון.',
      audio: require('../../../../assets/audio/tool-tutorials/pension-fees-step-3.mp3') },
  ],
  analyst: [
    { title: 'אנליסט מניות', emoji: '🔮', message: 'ברוכים הבאים לאנליסט המניות. בקשו ממני סקירה על כל מניה ואני אנתח אותה לעומק.',
      audio: require('../../../../assets/audio/tool-tutorials/analyst-step-1.mp3') },
    { title: 'מה אני בודק', emoji: '🔬', message: 'תזרים, רווחיות, צמיחה, מתחרים ויתרון תחרותי — תקבלו דעה ברורה: לקנות, להחזיק או למכור.',
      audio: require('../../../../assets/audio/tool-tutorials/analyst-step-2.mp3') },
    { title: 'טיפ', emoji: '⚠️', message: 'זה לא ייעוץ השקעות. אל תקנו מניות רק על סמך ניתוח אחד — תמיד תפזרו את הסיכון.',
      audio: require('../../../../assets/audio/tool-tutorials/analyst-step-3.mp3') },
  ],
  'breaking-news': [
    { title: 'חדשות מתפרצות', emoji: '🔥', message: 'כאן תקבלו את סיכום ה-AI היומי של מה שזז בשוק — בצורה ברורה ומובנת.',
      audio: require('../../../../assets/audio/tool-tutorials/breaking-news-step-1.mp3') },
    { title: 'מה מקבלים', emoji: '📰', message: 'כל יום אני מסכם שלוש עד חמש חדשות מרכזיות, עם השפעתן על השוק ומדד הייפ של כל מניה.',
      audio: require('../../../../assets/audio/tool-tutorials/breaking-news-step-2.mp3') },
    { title: 'טיפ', emoji: '💡', message: 'החדשות לא תמיד אומרות שצריך לפעול. לפעמים שווה רק להבין מה קורה ולהמשיך באסטרטגיה.',
      audio: require('../../../../assets/audio/tool-tutorials/breaking-news-step-3.mp3') },
  ],
  // portfolio + cashflow: coming_soon — no tutorial; the route is /coming-soon, not the tool.
};
