import type { AnonAlias, AnonAdvicePost, AnonAdviceReply } from './anonAdviceTypes';

// ===== Alias generation =====
// 16 emojis + nouns from avatar system, plus a few extras tuned for anonymous tone.
const ALIAS_POOL: { emoji: string; noun: string }[] = [
  { emoji: '🦁', noun: 'הלוחם' },
  { emoji: '🦊', noun: 'החכם' },
  { emoji: '🐺', noun: 'הצייד' },
  { emoji: '🦅', noun: 'החזון' },
  { emoji: '🐬', noun: 'החברותי' },
  { emoji: '🐢', noun: 'הסבלני' },
  { emoji: '🐼', noun: 'הרגוע' },
  { emoji: '🐱', noun: 'הסקרן' },
  { emoji: '🦋', noun: 'הצעירה' },
  { emoji: '🦉', noun: 'הנבון' },
  { emoji: '🐝', noun: 'החרוץ' },
  { emoji: '🐧', noun: 'הענייני' },
];

export function generateAlias(): AnonAlias {
  const pick = ALIAS_POOL[Math.floor(Math.random() * ALIAS_POOL.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 1000..9999
  return { emoji: pick.emoji, noun: pick.noun, number };
}

export function formatAlias(alias: AnonAlias): string {
  return `${alias.emoji} ${alias.noun} #${alias.number}`;
}

// ===== Reward configuration =====
export const REWARD_POST_XP = 25;
export const REWARD_POST_COINS = 50;
export const REWARD_REPLY_XP = 5;
export const REWARD_REPLY_COINS = 10;
export const REWARD_REPLY_VOTE_BONUS_COINS = 2;
export const FIRST_POST_BONUS_COINS = 100;
export const POST_AUTHOR_REPLY_XP = 1; // XP each time their post receives a reply

export const DAILY_POST_CAP = 3;
export const DAILY_REPLY_CAP = 10;
export const MIN_REPLY_LENGTH_FOR_REWARD = 10;

// ===== Validation limits =====
export const MIN_SITUATION_LENGTH = 30;
export const MAX_SITUATION_LENGTH = 500;
export const MIN_QUESTION_LENGTH = 10;
export const MAX_QUESTION_LENGTH = 200;
export const MAX_OPTION_LENGTH = 100;
export const MAX_REPLY_LENGTH = 300;

// ===== Client-side fallback moderation =====
export const FALLBACK_FINANCIAL_KEYWORDS = [
  'שכר', 'משכורת', 'הכנסה', 'משכנתא', 'חיסכון', 'השקעה', 'השקעות',
  'מניות', 'קרן', 'ש״ח', 'ש"ח', 'שח', 'אחוז', 'ריבית', 'חוב',
  'הלוואה', 'עו״ש', 'עוש', 'תקציב', 'הוצאות', 'דירה', 'רכב', 'פנסיה',
  '₪', '%',
];

const ID_REGEX = /\b\d{9}\b/;
const PHONE_REGEX = /\b05\d[-\s]?\d{3}[-\s]?\d{4}\b/;

export function clientFallbackModerate(text: string): { ok: boolean; reason?: string } {
  if (text.length < MIN_SITUATION_LENGTH) {
    return { ok: false, reason: 'התיאור קצר מדי. הוסף פרטים נוספים על המצב הכספי שלך.' };
  }
  if (ID_REGEX.test(text)) {
    return { ok: false, reason: 'נראה שיש בטקסט מספר ת״ז. אל תכלול פרטים מזהים.' };
  }
  if (PHONE_REGEX.test(text)) {
    return { ok: false, reason: 'נראה שיש בטקסט מספר טלפון. אל תכלול פרטים מזהים.' };
  }
  const hasFinancialKeyword = FALLBACK_FINANCIAL_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasFinancialKeyword) {
    return { ok: false, reason: 'התוכן לא נראה קשור לשאלה כספית. נסה לתאר את המצב הפיננסי שלך.' };
  }
  return { ok: true };
}

// ===== Seed posts (original Hebrew, written from scratch) =====
// IMPORTANT: All content below is original. Topics are common Israeli financial dilemmas,
// but text is composed fresh — not transcribed from any external source.

const NOW_ISO = new Date().toISOString();
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const SEED_POSTS: AnonAdvicePost[] = [
  {
    id: 'seed-post-1',
    alias: { emoji: '🦊', noun: 'החכם', number: 2841 },
    isSelf: false,
    situation:
      'בן 36, נשוי + 2 ילדים בגן. הכנסה משותפת 18,500 ש״ח נטו. לקחנו משכנתא של 1.4 מיליון לפני 4 שנים, ההחזר החודשי 6,200 ש״ח, נשארו 26 שנים. אחרי כל ההוצאות הקבועות נשאר לנו כל חודש בסביבות 3,000 ש״ח שאני יכול להפנות לחיסכון או להשקעה. אין חובות אחרים, יש בעו״ש 60K לחירום.',
    question: 'מה כדאי לי לעשות עם 3,000 ש״ח שנשארים בחודש?',
    options: [
      'להעלות החזר חודשי על המשכנתא ב-3K ולקצר אותה משמעותית',
      'להשקיע 3K בחודש בקרן מחקה S&P 500 לטווח ארוך',
    ],
    tags: ['משכנתא', 'השקעות'],
    createdAt: daysAgo(2),
    replyCount: 4,
    optionVotes: [2, 2],
    status: 'approved',
  },
  {
    id: 'seed-post-2',
    alias: { emoji: '🦋', noun: 'הצעירה', number: 1924 },
    isSelf: false,
    situation:
      'בת 29, רווקה, מהנדסת תוכנה במשכורת 14K נטו. יש לי 95K בקרן השתלמות שהפכה נזילה לפני חודשיים. גרה בשכירות 4,500 ש״ח. מתכננת לקנות דירה ראשונה בעוד שנה-שנתיים, מחפשת באזור פתח תקווה. חוץ מהקרן אין לי הון עצמי משמעותי, חוסכת בערך 2K לחודש מעבר לזה.',
    question: 'האם למשוך עכשיו ולשמור בצד להון עצמי, או להשאיר בקרן?',
    options: [
      'למשוך עכשיו ולשים בפיקדון/מק״מ — בטוח, נזיל, מוכן להון העצמי',
      'להשאיר בקרן (פטור ממס + תשואה) ולקחת משכנתא גבוהה יותר',
    ],
    tags: ['קרן השתלמות', 'דירה ראשונה'],
    createdAt: daysAgo(5),
    replyCount: 5,
    optionVotes: [3, 2],
    status: 'approved',
  },
  {
    id: 'seed-post-3',
    alias: { emoji: '🦁', noun: 'הלוחם', number: 5103 },
    isSelf: false,
    situation:
      'בן 27, רווק, גר עם הורים, מרוויח 9,200 ש״ח נטו ועובד מהבית. חוסך 4K בחודש בקביעות, יש לי בערך 55K בחיסכון נזיל. הרכב הישן שלי (2010) התחיל לעלות יותר בתיקונים ממה שהוא שווה, אני חייב להחליף בקרוב. שוקל בין יד 2 איכותית ב-50K (2018, ~80K ק״מ) לבין ליסינג חדש ב-1,650 ש״ח לחודש ל-3 שנים.',
    question: 'מה הצעד הכלכלי הנכון בשבילי?',
    options: [
      'יד 2 במזומן — ריבית 0, אין החזר חודשי, מוריד את כל החיסכון אבל אין חוב',
      'ליסינג חדש — שומר את החיסכון, מקבל רכב חדש עם אחריות ושירות',
    ],
    tags: ['רכב', 'תקציב'],
    createdAt: daysAgo(1),
    replyCount: 4,
    optionVotes: [3, 1],
    status: 'approved',
  },
];

export const SEED_REPLIES: AnonAdviceReply[] = [
  // Post 1 replies
  {
    id: 'seed-reply-1a',
    postId: 'seed-post-1',
    alias: { emoji: '🐺', noun: 'הצייד', number: 7212 },
    isSelf: false,
    body: 'תלוי באיזו ריבית לקחת את המשכנתא. אם פריים+0 או נמוך מהתשואה הצפויה של S&P (~7-8% היסטורית), עדיף להשקיע. אם המשכנתא בריבית גבוהה (4%+ קבועה צמודה) — להחזיר.',
    agreedWith: 1,
    createdAt: daysAgo(1),
  },
  {
    id: 'seed-reply-1b',
    postId: 'seed-post-1',
    alias: { emoji: '🐼', noun: 'הרגוע', number: 3098 },
    isSelf: false,
    body: 'אני הייתי מחלק 50/50. גם להוריד מינוף וגם לבנות תיק השקעות. השלווה הנפשית של חוב יורד שווה יותר מאחוז וחצי תשואה.',
    createdAt: daysAgo(1),
  },
  {
    id: 'seed-reply-1c',
    postId: 'seed-post-1',
    alias: { emoji: '🦅', noun: 'החזון', number: 4521 },
    isSelf: false,
    body: 'בגיל 36 עם משכנתא ל-26 שנה, חבל לוותר על אפקט ריבית דריבית. אם תשקיע 3K בחודש 25 שנה ב-7% — זה כ-2.4 מיליון. החזרה מוקדמת לא תיתן לך את זה.',
    agreedWith: 1,
    createdAt: daysAgo(0.5),
  },
  {
    id: 'seed-reply-1d',
    postId: 'seed-post-1',
    alias: { emoji: '🐢', noun: 'הסבלני', number: 8841 },
    isSelf: false,
    body: 'שאלה לפני: מה החיסכון לחירום? 60K זה ~3 חודשי הוצאות, חזק. לא חסר. אז כן, השקעות עדיפות במצב שלך.',
    agreedWith: 1,
    createdAt: daysAgo(0.3),
  },

  // Post 2 replies
  {
    id: 'seed-reply-2a',
    postId: 'seed-post-2',
    alias: { emoji: '🦉', noun: 'הנבון', number: 6234 },
    isSelf: false,
    body: 'משכנתא ל-30 שנה תעלה לך הרבה יותר במצטבר מהתשואה של הקרן. בנוסף — בנקים אוהבים יותר לוואים עם הון עצמי גדול. אני הייתי מושך.',
    agreedWith: 0,
    createdAt: daysAgo(4),
  },
  {
    id: 'seed-reply-2b',
    postId: 'seed-post-2',
    alias: { emoji: '🐱', noun: 'הסקרן', number: 2105 },
    isSelf: false,
    body: 'הקרן פטורה ממס רווחי הון! זה יתרון ענק. אם תוציא ב-95K מקרן, ב-30 שנה זה היה יכול להיות 700K נטו. תשאירי שם כל זמן שאת יכולה.',
    agreedWith: 1,
    createdAt: daysAgo(4),
  },
  {
    id: 'seed-reply-2c',
    postId: 'seed-post-2',
    alias: { emoji: '🐝', noun: 'החרוץ', number: 9012 },
    isSelf: false,
    body: 'תלוי כמה הון עצמי תצטרכי. אם הדירה 2.2M, את צריכה 550K הון עצמי (25%). 95K + מה שתחסכי בשנתיים = ~150K. עדיין חסר. אולי משיכה חלקית?',
    createdAt: daysAgo(3),
  },
  {
    id: 'seed-reply-2d',
    postId: 'seed-post-2',
    alias: { emoji: '🦊', noun: 'החכם', number: 5566 },
    isSelf: false,
    body: 'אני במצב דומה ובחרתי להשאיר. הריבית במשכנתא גם אם 5% — היא על קרן שיורדת. הקרן צוברת על הקרן + רווחים פטורים.',
    agreedWith: 1,
    createdAt: daysAgo(2),
  },
  {
    id: 'seed-reply-2e',
    postId: 'seed-post-2',
    alias: { emoji: '🦋', noun: 'הצעירה', number: 7777 },
    isSelf: false,
    body: 'תזכרי שמשכנתא = הוצאה חודשית קבועה לעוד 30 שנה. אם משכנתא של 1.7M במקום 1.5M, ההחזר החודשי גבוה יותר משמעותית. קחי את זה לחישוב.',
    agreedWith: 0,
    createdAt: daysAgo(1),
  },

  // Post 3 replies
  {
    id: 'seed-reply-3a',
    postId: 'seed-post-3',
    alias: { emoji: '🐧', noun: 'הענייני', number: 3344 },
    isSelf: false,
    body: 'יד 2 ב-50K זה הגיוני אם בודקים אותו טוב (כולל בדיקה במכון). ליסינג זה 60K ל-3 שנים בלי שום נכס בסוף. חישוב פשוט.',
    agreedWith: 0,
    createdAt: daysAgo(0.5),
  },
  {
    id: 'seed-reply-3b',
    postId: 'seed-post-3',
    alias: { emoji: '🦅', noun: 'החזון', number: 1188 },
    isSelf: false,
    body: 'אם אתה גר עם הורים וחוסך 4K — קח יד 2. זה הזמן לבנות הון, לא להוציא 1,650 בחודש על ניידות.',
    agreedWith: 0,
    createdAt: daysAgo(0.5),
  },
  {
    id: 'seed-reply-3c',
    postId: 'seed-post-3',
    alias: { emoji: '🐬', noun: 'החברותי', number: 4901 },
    isSelf: false,
    body: 'אני בליסינג ושמח. אין כאב ראש של תיקונים, ביטוח ורישוי בסכום אחד. אבל זה החלטה של אורח חיים, לא רק כלכלה.',
    agreedWith: 1,
    createdAt: daysAgo(0.4),
  },
  {
    id: 'seed-reply-3d',
    postId: 'seed-post-3',
    alias: { emoji: '🐼', noun: 'הרגוע', number: 6677 },
    isSelf: false,
    body: 'תשמור 10K לחירום, השאר 45K לקנייה. רכב יד 2 בעדיפות. הליסינג מתאים יותר למי שמרוויח 15K+ ולא חוסך.',
    agreedWith: 0,
    createdAt: daysAgo(0.2),
  },
];