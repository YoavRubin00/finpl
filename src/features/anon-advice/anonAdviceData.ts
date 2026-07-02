import type { AnonAlias } from './anonAdviceTypes';

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

/**
 * Neutral anonymous label for the advice screens — "אנונימי · #NNNN".
 * Replaces the animal-emoji persona identity so every author reads as a real,
 * anonymous community member (not a game mascot). The 4-digit number is derived
 * deterministically from the alias (no Math.random) so the same alias always
 * renders the same tag across the feed and post screens.
 */
export function formatAnonLabel(alias: AnonAlias): string {
  const seed = `${alias.emoji}|${alias.noun}|${alias.number}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const n = 1000 + (Math.abs(hash) % 9000); // stable 1000..9999
  return `אנונימי · #${n}`;
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

// ===== Seed data removed (P0-5, Iron Rule: zero fabrication) =====
// Previously this file shipped SEED_POSTS / SEED_REPLIES with hardcoded upvote
// counts (12/9/7) that rendered as real community activity. Per the founder's
// zero-fabrication rule, the feed now builds ONLY from real posts (the user's
// own isSelf posts + future server posts). An empty feed is honest — the hub
// card shows an inviting empty state instead of fake questions.
