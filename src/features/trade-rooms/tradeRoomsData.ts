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
    tagline: 'נושא אחד. יום אחד. הדעה שלכם.',
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

// Big-number, pick-a-side prompts (Yoav 2026-07-04: large sums, cooler hooks).
// Rotation is deterministic per IL calendar day — a fresh topic every day,
// the whole community sees the same one.
const DAILY_EVENT_TOPICS: DailyEventTopic[] = [
  { title: 'נפלו עליכם 100,000 ש״ח', subtitle: 'ת״א 35, S&P 500, קריפטו — או מקדמה לדירה?' },
  { title: 'עונת הדוחות של ענקיות הטק', subtitle: '250,000 ש״ח על טק אמריקאי — מי מפתיעה ומי קורסת?' },
  { title: 'ביטקוין ב-100% תוך שנה?', subtitle: '50,000 ש״ח פנויים — נכנסים או בורחים?' },
  { title: 'המניה שכולם מדברים עליה', subtitle: '30,000 ש״ח על ההייפ — אומץ או טעות של עדר?' },
  { title: 'שקל חזק, דולר חלש', subtitle: '80,000 ש״ח בעו״ש — ממירים לדולר או נשארים בשקל?' },
  { title: '100,000 ש״ח מירושה', subtitle: 'סוגרים משכנתא מוקדם — או משקיעים הכל במדדים?' },
  { title: 'ת״א 35 מול S&P 500', subtitle: 'איפה הייתם שמים 100,000 ש״ח לעשור הקרוב?' },
  { title: 'דירה להשקעה בפריפריה', subtitle: '400,000 ש״ח הון עצמי — נדל״ן או תיק מניות?' },
  { title: 'הבונוס השנתי נחת: 40,000 ש״ח', subtitle: 'טיול חלומות, קרן חירום או שוק ההון?' },
  { title: 'פנסיה בגיל 45 — אפשרי?', subtitle: 'כמה באמת צריך? מיליון? שלושה? עשרה?' },
];

/** Deterministic per IL calendar date — the whole community sees the same topic. */
export function getDailyEventTopic(now: Date = new Date()): DailyEventTopic {
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return DAILY_EVENT_TOPICS[dayOfYear % DAILY_EVENT_TOPICS.length];
}

/**
 * Honest member count — no fake hundreds. Built-in rooms show the seed crew
 * size (5); a room you created starts with just you.
 */
export function getRoomMemberCount(room: TradeRoom): number {
  return room.isCustom ? Math.max(1, room.memberBase) : 5;
}

// ===== Community personas (recurring per room, feel like regulars) =====
// Each carries a real game avatar id — AvatarImage renders the Pip mascots.
const COMMUNITY: Array<AnonAlias & { avatarId: string }> = [
  { emoji: '🦊', noun: 'החכם', number: 2841, avatarId: 'avatar-analyst' },
  { emoji: '🦅', noun: 'החזון', number: 7113, avatarId: 'avatar-investor' },
  { emoji: '🐢', noun: 'הסבלני', number: 1584, avatarId: 'avatar-saver' },
  { emoji: '🐝', noun: 'החרוץ', number: 4429, avatarId: 'avatar-grower' },
  { emoji: '🦉', noun: 'הנבון', number: 9021, avatarId: 'avatar-strategist' },
  { emoji: '🐬', noun: 'החברותי', number: 3376, avatarId: 'avatar-learner' },
  { emoji: '🦁', noun: 'הלוחם', number: 6540, avatarId: 'avatar-trader' },
  { emoji: '🐱', noun: 'הסקרן', number: 2205, avatarId: 'avatar-explorer' },
  { emoji: '🦋', noun: 'הצעירה', number: 8817, avatarId: 'avatar-strong-saver' },
  { emoji: '🐧', noun: 'הענייני', number: 5192, avatarId: 'avatar-defender' },
];

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
};

function makeSeedId(roomId: string, idx: number): string {
  return `seed-${roomId}-${idx}`;
}

export function buildSeedMessages(roomId: TradeRoomId): TradeRoomMessage[] {
  const lines = SEED_LINES[roomId] ?? [];
  const now = Date.now();
  return lines.map((line, idx) => {
    const persona = COMMUNITY[line.aliasIdx % COMMUNITY.length];
    return {
      id: makeSeedId(roomId, idx),
      roomId,
      alias: line.isShark ? null : persona,
      avatarId: line.isShark ? null : persona.avatarId,
      isSelf: false,
      isShark: line.isShark === true,
      body: line.body,
      sentiment: line.sentiment,
      ticker: line.ticker,
      likes: line.likes ?? 0,
      likedBySelf: false,
      sentAt: new Date(now - line.minutesAgo * 60_000).toISOString(),
    };
  });
}

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
