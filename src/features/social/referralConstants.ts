/**
 * Single source of truth for referral reward magnitudes.
 *
 * Why this file exists: every UI text that mentions referral rewards (share
 * message, nudge modals, ReferralScreen, push notifications, emails) MUST
 * import from here. We had a bug where some places said "ותקבל בונוס" without
 * a number — users had no idea what they'd get, eroding trust. If a magnitude
 * changes, change it ONCE here and the UI updates everywhere.
 *
 * If you find yourself hardcoding 500, 5%, "מטבעות לכיס" anywhere outside
 * this file — stop and import the constants instead.
 */

/** Coins granted to BOTH the referrer and the referee when the referee redeems an invite link, once per pair. */
export const REFERRAL_SIGNUP_BONUS_COINS = 500;

/** Daily dividend rate (5%) on the referee's previous-day learning coins. */
export const REFERRAL_DAILY_DIVIDEND_RATE = 0.05;

/** Domain used for invite share links (Universal Links / App Links target). */
export const REFERRAL_INVITE_DOMAIN = "finplay.me";

/** Coin sources that count toward the daily dividend calculation.
 *  Excludes: games, ads, gem→coin conversions, dividends-from-others, signup bonuses. */
export const DIVIDEND_ELIGIBLE_SOURCES = ["lesson", "quiz", "daily-quest"] as const;

export type DividendEligibleSource = (typeof DIVIDEND_ELIGIBLE_SOURCES)[number];

/** All valid sources that the server accepts for coin_events.source.
 *  Mirrors the CHECK constraint on the coin_events table. */
export const COIN_EVENT_SOURCES = [
  "lesson",
  "quiz",
  "daily-quest",
  "signup-bonus",
  "referral-signup-bonus",
  "referral-dividend",
  "trading",
] as const;

export type CoinEventSource = (typeof COIN_EVENT_SOURCES)[number];

/** Builds the canonical share URL for an invite code. */
export function buildInviteUrl(code: string): string {
  return `https://${REFERRAL_INVITE_DOMAIN}/invite/${code}`;
}

/** Builds the canonical share message body. Used by Share / Clipboard / WhatsApp text.
 *  Must include exact reward amounts — never vague "בונוס". */
export function buildInviteShareMessage(code: string): string {
  const url = buildInviteUrl(code);
  return [
    "הצטרפו אליי ל-FinPlay — אפליקציית הלמידה הפיננסית 🦈",
    "",
    `${REFERRAL_SIGNUP_BONUS_COINS} מטבעות מתנה לכם כשתירשמו + ${REFERRAL_SIGNUP_BONUS_COINS} מטבעות גם לי 🎁`,
    `בנוסף: ${Math.round(REFERRAL_DAILY_DIVIDEND_RATE * 100)}% מהמטבעות שתרוויחו בלמידה ישר לחשבון שלי — כל יום 💙`,
    "",
    url,
  ].join("\n");
}

/** Short copy fragments for nudge modals / referral screen. */
export const REFERRAL_COPY = {
  /** Short headline for invite CTA — used in feed nudges and share dialogs. */
  signupBonusHeadline: `${REFERRAL_SIGNUP_BONUS_COINS} 🪙 לחבר + ${REFERRAL_SIGNUP_BONUS_COINS} 🪙 לכם`,
  /** Long explanation for the referral screen body. */
  fullRewardExplain:
    `כל חבר שיירשם דרך הקישור שלכם — שניכם מקבלים ${REFERRAL_SIGNUP_BONUS_COINS} מטבעות מיידית. ` +
    `בנוסף, כל יום שהחבר ילמד באפליקציה — תקבלו ${Math.round(REFERRAL_DAILY_DIVIDEND_RATE * 100)}% מהמטבעות שהוא הרוויח אתמול, ישר לחשבון שלכם.`,
  /** One-liner for top of nudge modals / push notifications. */
  shortHook: `הזמינו חברים — ${REFERRAL_SIGNUP_BONUS_COINS} מטבעות לכם וגם לחבר 🎁`,
} as const;
