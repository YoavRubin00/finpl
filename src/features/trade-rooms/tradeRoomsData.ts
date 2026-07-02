// Data for Trade Rooms — rooms, seed conversations, community reply pools,
// and Captain Shark tip pools. All Hebrew content here is original.
// Voice: members are Gen-Z Israelis; Captain Shark speaks per BRAND.md.

import type { AnonAlias } from '../anon-advice/anonAdviceTypes';
import type {
  TradeRoom,
  TradeRoomId,
  TradeRoomMessage,
  MessageSentiment,
} from './tradeRoomsTypes';

// ===== Rewards & caps =====
export const DAILY_FIRST_MESSAGE_COINS = 30;
export const DAILY_FIRST_MESSAGE_XP = 15;
export const MAX_MESSAGE_LENGTH = 240;
export const MAX_MESSAGES_PER_ROOM = 80;
/** Community messages injected on entry when the room was idle for a while. */
export const CATCH_UP_IDLE_HOURS = 3;

// ===== Rooms =====
export const TRADE_ROOMS: TradeRoom[] = [
  {
    id: 'daily-event',
    name: 'החדר החם של היום',
    emoji: '🔥',
    tagline: 'נושא אחד. יום אחד. כל הקהילה.',
    accentColor: '#f97316',
    accentBg: '#ffedd5',
    memberBase: 412,
    pinnedTip:
      'כאן מדברים על הנושא של היום בלבד. דעה בלי נימוק שווה כמו רשת בלי דגים.',
    isDailyEvent: true,
  },
  {
    id: 'wallstreet',
    name: 'וול סטריט',
    emoji: '🇺🇸',
    tagline: 'מניות אמריקאיות — טק, ענקיות וכל מה שביניהן',
    accentColor: '#1877f2',
    accentBg: '#e0f2fe',
    memberBase: 738,
    pinnedTip:
      'לפני שרודפים אחרי מניה שכולם מדברים עליה — רגע, חשבתם על זה עד הסוף?',
  },
  {
    id: 'telaviv',
    name: 'הבורסה בת״א',
    emoji: '🇮🇱',
    tagline: 'השוק הישראלי — ת״א 35, בנקים, נדל״ן',
    accentColor: '#0ea5e9',
    accentBg: '#e0f2fe',
    memberBase: 521,
    pinnedTip:
      'השוק הישראלי הוא הבית. גם בבית — קודם בודקים, אחר כך קונים.',
  },
  {
    id: 'crypto',
    name: 'קריפטו',
    emoji: '🪙',
    tagline: 'ביטקוין, את׳ריום והים הסוער שביניהם',
    accentColor: '#f59e0b',
    accentBg: '#fef3c7',
    memberBase: 634,
    pinnedTip:
      'קריפטו זה ים סוער. נכנסים רק עם כסף שאפשר להרשות לעצמכם לאבד.',
  },
  {
    id: 'beginners',
    name: 'מתחילים שואלים',
    emoji: '🌱',
    tagline: 'אין שאלה טיפשית. רק שאלה שלא נשאלה.',
    accentColor: '#22c55e',
    accentBg: '#dcfce7',
    memberBase: 892,
    pinnedTip:
      'החדר הזה קדוש: אין לעג, אין זלזול. כולנו התחלנו ממים רדודים.',
  },
  {
    id: 'league-talk',
    name: 'חדר הליגה',
    emoji: '🏆',
    tagline: 'טראש-טוק של ליגת הפנטזי — מי לוקח את השבוע?',
    accentColor: '#a855f7',
    accentBg: '#f3e8ff',
    memberBase: 347,
    pinnedTip:
      'טראש-טוק זה חלק מהמשחק. על התיק של היריב — לא על היריב.',
  },
];

export function getRoomById(id: TradeRoomId): TradeRoom {
  const room = TRADE_ROOMS.find((r) => r.id === id);
  return room ?? TRADE_ROOMS[0];
}

// ===== Daily event topics (deterministic rotation) =====
export interface DailyEventTopic {
  title: string;
  subtitle: string;
}

const DAILY_EVENT_TOPICS: DailyEventTopic[] = [
  { title: 'עונת הדוחות של ענקיות הטק', subtitle: 'מי מפתיעה ומי מאכזבת?' },
  { title: 'הריבית של בנק ישראל', subtitle: 'מה זה עושה למשכנתא ולבורסה?' },
  { title: 'ביטקוין חצה עוד שיא?', subtitle: 'האם זה רכבת או בלון?' },
  { title: 'המניה שכולם מדברים עליה', subtitle: 'הייפ אמיתי או עדר?' },
  { title: 'שקל חזק, דולר חלש', subtitle: 'מי מרוויח ומי בוכה?' },
  { title: 'קרן חירום או השקעה?', subtitle: 'הוויכוח הנצחי — צד אחד לבחירה' },
  { title: 'ת״א 35 מול S&P 500', subtitle: 'איפה הייתם שמים 1,000 שקל?' },
];

/** Deterministic per IL calendar date — the whole community sees the same topic. */
export function getDailyEventTopic(now: Date = new Date()): DailyEventTopic {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return DAILY_EVENT_TOPICS[dayOfYear % DAILY_EVENT_TOPICS.length];
}

/** Deterministic per-day jitter so member counts feel alive but stable within a day. */
export function getRoomMemberCount(room: TradeRoom, now: Date = new Date()): number {
  const seed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  const jitter = ((seed * 9301 + room.memberBase * 49297) % 233280) / 233280;
  return room.memberBase + Math.floor(jitter * 40) - 20;
}

// ===== Community personas (recurring per room, feel like regulars) =====
const COMMUNITY: AnonAlias[] = [
  { emoji: '🦊', noun: 'החכם', number: 2841 },
  { emoji: '🦅', noun: 'החזון', number: 7113 },
  { emoji: '🐢', noun: 'הסבלני', number: 1584 },
  { emoji: '🐝', noun: 'החרוץ', number: 4429 },
  { emoji: '🦉', noun: 'הנבון', number: 9021 },
  { emoji: '🐬', noun: 'החברותי', number: 3376 },
  { emoji: '🦁', noun: 'הלוחם', number: 6540 },
  { emoji: '🐱', noun: 'הסקרן', number: 2205 },
  { emoji: '🦋', noun: 'הצעירה', number: 8817 },
  { emoji: '🐧', noun: 'הענייני', number: 5192 },
];

export function pickCommunityAlias(exclude?: AnonAlias | null): AnonAlias {
  const pool = exclude
    ? COMMUNITY.filter((a) => a.number !== exclude.number)
    : COMMUNITY;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===== Seed conversations =====
interface SeedLine {
  aliasIdx: number;
  body: string;
  sentiment?: MessageSentiment;
  ticker?: string;
  likes?: number;
  isShark?: boolean;
  minutesAgo: number;
}

const SEED_LINES: Record<TradeRoomId, SeedLine[]> = {
  'daily-event': [
    { aliasIdx: 1, body: 'אני אומר שהדוח הבא יפיל את המניה. המכפילים שם על ירח אחר.', sentiment: 'bear', likes: 4, minutesAgo: 95 },
    { aliasIdx: 5, body: 'ולמה בעצם? הצמיחה שם עדיין דו-ספרתית, לא?', minutesAgo: 82 },
    { aliasIdx: 1, body: 'כי כשהציפיות בשמיים, גם דוח טוב יכול לאכזב. זה כל הסיפור.', likes: 7, minutesAgo: 78 },
    { isShark: true, aliasIdx: 0, body: 'שווה לזכור: מחיר של מניה משקף ציפיות, לא רק ביצועים. דוח "טוב" מתחת לציפיות = ירידה. זה לא קסם, זה מתמטיקה של אכזבות.', likes: 12, minutesAgo: 70 },
    { aliasIdx: 8, body: 'אוקיי זה בעצם מסביר למה מניות יורדות אחרי דוחות טובים. תודה, תמיד תהיתי', minutesAgo: 55 },
    { aliasIdx: 3, body: 'אני נשאר אופטימי. חברות חזקות יודעות להפתיע גם כשכולם צופים בהן.', sentiment: 'bull', likes: 3, minutesAgo: 30 },
  ],
  wallstreet: [
    { aliasIdx: 0, body: 'מישהו עוקב אחרי אנבידיה? התנודתיות שם השבוע משגעת אותי', ticker: 'NVDA', minutesAgo: 130 },
    { aliasIdx: 4, body: 'עוקב ומחזיק. לטווח ארוך אני רגוע, הביקוש לשבבים לא הולך לשום מקום.', sentiment: 'bull', ticker: 'NVDA', likes: 6, minutesAgo: 121 },
    { aliasIdx: 2, body: 'אני דווקא מחכה בצד. אחרי ראלי כזה מגיע תיקון, ככה זה תמיד.', sentiment: 'bear', likes: 2, minutesAgo: 110 },
    { isShark: true, aliasIdx: 0, body: '"מחכה לתיקון" ו"מפספס את העלייה" הם לפעמים אותו דג. אף אחד לא מתזמן את השוק בעקביות — גם לא כרישים.', likes: 15, minutesAgo: 104 },
    { aliasIdx: 9, body: 'בגלל זה אני בכלל בקרן מחקה. שהשוק יריב עם עצמו בלעדיי', likes: 9, minutesAgo: 90 },
    { aliasIdx: 6, body: 'משעמם אבל חכם. קחו לייק', minutesAgo: 84 },
    { aliasIdx: 8, body: 'שאלה — טסלה אחרי הירידות זו הזדמנות או סכין נופלת?', ticker: 'TSLA', minutesAgo: 40 },
    { aliasIdx: 4, body: 'תלוי אם אתה מאמין בסיפור לעשור או מנסה לתפוס באונס. שני משחקים שונים לגמרי.', likes: 5, minutesAgo: 33 },
  ],
  telaviv: [
    { aliasIdx: 3, body: 'ת״א 35 ממשיך לטפס בשקט. אף אחד לא מדבר על זה וזה החלק הכי מצחיק', sentiment: 'bull', minutesAgo: 150 },
    { aliasIdx: 7, body: 'הבנקים סוחבים את כל המדד. תסתכלו על הגרפים שלהם השנה', likes: 4, minutesAgo: 140 },
    { aliasIdx: 0, body: 'מה דעתכם על מניות הנדל״ן עכשיו? עם הריבית הנוכחית זה מרגיש מסוכן', sentiment: 'bear', minutesAgo: 120 },
    { isShark: true, aliasIdx: 0, body: 'ריבית גבוהה = הלוואות יקרות = פחות קונים לדירות. בגלל זה מניות נדל״ן רגישות לריבית. עכשיו השאלה שלכם: מה יעשה בנק ישראל בהחלטה הבאה?', likes: 11, minutesAgo: 112 },
    { aliasIdx: 9, body: 'היתרון של השוק שלנו — אתה מכיר את החברות מהחיים. קונה במשביר, מושקע במשביר', likes: 7, minutesAgo: 60 },
    { aliasIdx: 5, body: 'זה גם החיסרון. להתאהב בחברה כי אתה לקוח שלה זו מלכודת', likes: 8, minutesAgo: 52 },
  ],
  crypto: [
    { aliasIdx: 6, body: 'מי שנכנס לביטקוין לפני שנתיים ולא מכר — שאפו על העצבים', ticker: 'BTC', minutesAgo: 160 },
    { aliasIdx: 8, body: 'אני בקטנה עם 5% מהתיק. עוזר לי לישון בלילה', likes: 6, minutesAgo: 148 },
    { aliasIdx: 1, body: 'את׳ריום נראה חזק טכנית אבל אני לא סומך על עצמי לקרוא גרפים', ticker: 'ETH', minutesAgo: 130 },
    { isShark: true, aliasIdx: 0, body: 'כלל אצבע לים הסוער: אם ירידה של 50% בשבוע תהרוס לכם את החודש — הסכום גדול מדי. קריפטו זה תיבול, לא המנה העיקרית.', likes: 18, minutesAgo: 118 },
    { aliasIdx: 2, body: 'החבר שלי מכר הכל בפאניקה בירידה האחרונה וקנה בחזרה יקר יותר. שילם שכר לימוד', likes: 10, minutesAgo: 75 },
    { aliasIdx: 6, body: 'פאניקה זה האויב הכי גדול בשוק הזה. יותר מכל רגולציה', sentiment: 'bull', likes: 3, minutesAgo: 66 },
  ],
  beginners: [
    { aliasIdx: 8, body: 'שאלה מביכה: מה ההבדל בין מניה לקרן מחקה? כולם זורקים מושגים ואני מהנהן', minutesAgo: 170 },
    { aliasIdx: 5, body: 'אין מביכה! מניה = חתיכה מחברה אחת. קרן מחקה = סל עם מאות חברות בבת אחת. פיזור מובנה.', likes: 14, minutesAgo: 161 },
    { aliasIdx: 8, body: 'אוהה. אז קרן מחקה זה כמו לקנות את כל השוק במקום לנחש מנצח?', minutesAgo: 155 },
    { isShark: true, aliasIdx: 0, body: 'בדיוק. ובגלל זה רוב המתחילים מתחילים משם — קודם לומדים לשחות עם המים, אחר כך נגד הזרם. השיעור על קרנות מחכה לכם בלמידה.', likes: 20, minutesAgo: 150 },
    { aliasIdx: 3, body: 'שנה פה ועדיין לומד משהו חדש כל שבוע. החדר הזה זהב', likes: 9, minutesAgo: 95 },
    { aliasIdx: 9, body: 'שאלה: כמה כסף בכלל צריך כדי להתחיל? חשבתי שזה רק לעשירים', minutesAgo: 45 },
    { aliasIdx: 5, body: 'ממש לא. היום אפשר להתחיל גם עם מאות שקלים. העיקרון חשוב מהסכום — קביעות מנצחת גודל.', likes: 11, minutesAgo: 38 },
  ],
  'league-talk': [
    { aliasIdx: 6, body: 'מי שם קריפטו כקפטן השבוע — נתראה בתחתית הטבלה', sentiment: 'bear', likes: 5, minutesAgo: 140 },
    { aliasIdx: 1, body: 'תצחק תצחק. הקפטן שלי עשה 12% שבוע שעבר בזמן שהטק שלך ישן', sentiment: 'bull', likes: 8, minutesAgo: 132 },
    { aliasIdx: 4, body: 'הדראפט נסגר עוד מעט וחצי מהליגה עוד לא בחרה. קלאסי', minutesAgo: 120 },
    { isShark: true, aliasIdx: 0, body: 'טיפ לדראפט: הקפטן שלכם שווה כפול — אבל כפול עובד גם בירידות. יציבות בקפטן, הרפתקאות בשאר התיק.', likes: 13, minutesAgo: 110 },
    { aliasIdx: 7, body: 'שלוש עונות ברצף שאני מסיים מעל החכם. שיבוא השבוע', likes: 4, minutesAgo: 80 },
    { aliasIdx: 0, body: 'דיברת ועכשיו תפסיד. חוקי הליגה', likes: 6, minutesAgo: 72 },
  ],
};

function makeSeedId(roomId: string, idx: number): string {
  return `seed-${roomId}-${idx}`;
}

export function buildSeedMessages(roomId: TradeRoomId): TradeRoomMessage[] {
  const lines = SEED_LINES[roomId] ?? [];
  const now = Date.now();
  return lines.map((line, idx) => ({
    id: makeSeedId(roomId, idx),
    roomId,
    alias: line.isShark ? null : COMMUNITY[line.aliasIdx % COMMUNITY.length],
    isSelf: false,
    isShark: line.isShark === true,
    body: line.body,
    sentiment: line.sentiment,
    ticker: line.ticker,
    likes: line.likes ?? 0,
    likedBySelf: false,
    sentAt: new Date(now - line.minutesAgo * 60_000).toISOString(),
  }));
}

// ===== Community reply pools (simulator picks from these while you're in a room) =====
export const AUTO_REPLY_POOLS: Record<TradeRoomId, string[]> = {
  'daily-event': [
    'הנושא של היום חזק. מחכה לראות איך זה נסגר בסוף השבוע',
    'קראתי על זה כתבה הבוקר, המספרים יותר מורכבים ממה שנראה',
    'מי שיש לו דעה — שינמק. ככה לומדים פה',
    'אני עוד לא סגור על הכיוון. יש טיעונים טובים לשני הצדדים',
    'הצבעתי הפוך מהרוב בחכמת ההמונים. מישהו עוד נגד הזרם?',
  ],
  wallstreet: [
    'הפרה-מרקט נראה ירוק. נראה אם זה מחזיק עד הפתיחה',
    'מי שמפוזר על כמה סקטורים ישן טוב יותר השבוע',
    'הדוחות של הרבעון הזה מפתיעים לטובה עד עכשיו',
    'זוכרים שלפני חודש כולם היו בפאניקה? השוק כבר שכח',
    'שאלה למחזיקי הטק — מישהו הוסיף בירידה של אתמול?',
    'קרן מחקה וסבלנות. משעמם אבל עובד לי כבר שנתיים',
  ],
  telaviv: [
    'המחזורים בת״א נמוכים היום, כולם בחופש כנראה',
    'הבנקים שוב סוחבים את המדד. איזו עקביות',
    'הדולר-שקל עושה דרמות. מי שמושקע בחו״ל מרגיש את זה',
    'מניות הביטוח שקטות מדי. מריח לי לפני מהלך',
    'שימו לב להחלטת הריבית הקרובה, זה יזיז את כל השוק',
  ],
  crypto: [
    'הוולטיליות היום עדינה יחסית. חשוד',
    'מי שעושה DCA קבוע לא מרגיש את הדרמות האלה בכלל',
    'ראיתם את הזרימות לקרנות הביטקוין? מוסדיים נכנסים בשקט',
    'תזכורת ידידותית: רק כסף שמותר לו להיעלם',
    'האלטים זזים היום יותר מהביטקוין. סימן לתיאבון סיכון',
  ],
  beginners: [
    'שאלתי פה שאלה לפני חודש שחשבתי שהיא מטופשת. קיבלתי 5 תשובות מעולות',
    'ההבדל בין חיסכון להשקעה סוף סוף ברור לי. תודה לחדר הזה',
    'מישהו יכול להסביר בפשטות מה זה ריבית דריבית? שמעתי שזה קסם',
    'התחלתי עם סכום קטן רק בשביל ללמוד. הרגשה של שחקן אמיתי',
    'הטעות הכי טובה שעשיתי — להתחיל קטן ולשאול הרבה',
  ],
  'league-talk': [
    'התיק שלי ירוק והביטחון בשיא. תבדקו את הטבלה',
    'מי שבחר קפטן ספקולטיבי השבוע — אמיץ או מטורף, נגלה בשישי',
    'שלושה ימים לסוף התחרות ואני נושף בעורף של המקום הראשון',
    'הדראפט הבא אני הולך על אסטרטגיה חדשה לגמרי. בלי ספוילרים',
    'הליגה הזאת עשתה לי יותר לידע על מניות מכל סרטון ביוטיוב',
  ],
};

// ===== Captain Shark tip pools (injected every few community messages) =====
export const SHARK_TIP_POOLS: Record<TradeRoomId, string[]> = {
  'daily-event': [
    'דעה חזקה + נימוק חלש = דגל אדום. תשאלו "למה" לפני שמתיישרים עם הקהל.',
    'ההמון צודק לעיתים קרובות — אבל בדיוק כשכולם בטוחים, שווה לבדוק שוב.',
  ],
  wallstreet: [
    'מניה שעלתה אתמול לא "חייבת" לעלות היום. לשוק אין זיכרון, רק לנו יש.',
    'לפני שקונים כי "כולם מדברים על זה" — בדקו מי מרוויח מזה שכולם מדברים.',
    'פיזור זה לא פחד. זה להודות שאף אחד לא יודע את העתיד — וזו חוכמה.',
  ],
  telaviv: [
    'יתרון הבית: את החברות הישראליות אתם מכירים מהחיים. חיסרון הבית: רגש.',
    'מדד ת״א 35 = 35 החברות הגדולות בבורסה שלנו. לדעת מה בפנים = חצי מהעבודה.',
  ],
  crypto: [
    'בקריפטו התנודות של יום אחד הן כמו שנה בבורסה. תזמנו את הלב בהתאם.',
    'אם אתם בודקים את המחיר כל שעה — הסכום שהשקעתם גדול מדי בשבילכם.',
  ],
  beginners: [
    'כל כריש התחיל כדג קטן. השאלות שלכם היום הן הביטחון של מחר.',
    'אל תשוו את ההתחלה שלכם לאמצע של מישהו אחר. קצב אישי מנצח השוואות.',
    'מי שעונה למתחילים בסבלנות — מסמנים אותו. אלה האנשים ללמוד מהם.',
  ],
  'league-talk': [
    'הליגה היא מגרש אימונים: תרגישו חופשי להסתכן פה — הכיסים וירטואליים, הלקחים אמיתיים.',
    'מי שמנצח בליגה שבוע אחד זה מזל. מי שבטופ 5 כל שבוע — זו שיטה. תלמדו מהשיטה.',
  ],
};

// ===== Light chat moderation (client-side, fast) =====
const ID_REGEX = /\b\d{9}\b/;
const PHONE_REGEX = /\b05\d[-\s]?\d{3}[-\s]?\d{4}\b/;
const BLOCKED_PATTERNS: RegExp[] = [
  /קנו עכשיו|הצטרפו לקבוצה|לינק בביו|טלגרם שלי|וואטסאפ שלי/,
  /מבטיח תשואה|רווח מובטח|כפול תוך/,
];

export function moderateChatMessage(text: string): { ok: boolean; reason?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'אין מה לשלוח הודעה ריקה.' };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, reason: `הודעה עד ${MAX_MESSAGE_LENGTH} תווים. קצר וקולע מנצח.` };
  }
  if (ID_REGEX.test(trimmed)) {
    return { ok: false, reason: 'נראה שיש כאן מספר ת״ז. בלי פרטים מזהים בחדרים.' };
  }
  if (PHONE_REGEX.test(trimmed)) {
    return { ok: false, reason: 'נראה שיש כאן מספר טלפון. בלי פרטים מזהים בחדרים.' };
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: 'ההודעה נראית כמו ספאם או הבטחת רווח. לא אצלנו.' };
    }
  }
  return { ok: true };
}
