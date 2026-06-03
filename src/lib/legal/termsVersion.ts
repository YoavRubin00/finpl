/**
 * Single source of truth for the current legal terms version.
 * Bump this string whenever docs/finplay-terms-and-privacy.md is materially
 * updated. Date format: YYYY-MM-DD (so lexicographic string comparison gives
 * the correct ordering: '2026-06-01' > '2026-04-01').
 *
 * When you bump this, also update TERMS_UPDATE_SUMMARY_HE below to describe
 * what changed — that's what the user sees in the re-consent modal.
 */
export const CURRENT_TERMS_VERSION = '2026-06-03';

/**
 * Consolidated Hebrew bullets shown in the re-consent modal.
 *
 * IMPORTANT: This is a CUMULATIVE summary, not a delta from the previous
 * version. Many existing users were backfilled with the LEGACY sentinel
 * ('2026-05-01') or have acceptedVersion === null, so they never saw the
 * previous bullet list. The modal must show every material item that was
 * added since the last public publish of the terms — so they understand
 * the full scope of what they're consenting to.
 *
 * Order: newest/most material first, then prior-cycle items.
 * Each bullet under ~110 chars.
 */
export const TERMS_UPDATE_SUMMARY_HE: ReadonlyArray<string> = [
  // 2026-06-03 cycle — legal-compliance pass
  'גיל מינימום באפליקציה: 16. רכישת מנוי Pro והצעות מסחריות פתוחות לגיל 18 ומעלה בלבד.',
  'זכות ביטול מנוי תוך 14 יום מהרכישה (Cooling-Off) עם החזר מלא דרך App Store / Google Play.',
  'מודעות (AdMob) למשתמשים בני 16–17 מתויגות אוטומטית ללא מיקוד התנהגותי (TFUA).',
  // 2026-06-01 cycle — payslip + tools + AI clarifications
  'כלי ניתוח תלוש שכר: הקובץ מעובד ב-Google Gemini בלבד, לא נשמר. סטטיסטיקות אנונימיות נשמרות במכשיר.',
  'תשעה כלים פיננסיים (משכנתא, פנסיה, מס, ועוד). הקלט נשמר רק במכשיר, ללא העברה לשרת.',
  'צ\'אט עם Captain Shark, ניתוח מניות (מהיר/עמוק) ותובנות אישיות — עיבוד ב-Google Gemini ו-Anthropic Claude.',
];

/** Same consolidated summary in English. Keep ordering identical to HE. */
export const TERMS_UPDATE_SUMMARY_EN: ReadonlyArray<string> = [
  // 2026-06-03 cycle
  'Minimum age in the app: 16. Pro purchases and commercial offers are restricted to users 18+.',
  '14-day cancellation right (cooling-off) for subscriptions with full refund via App Store / Google Play.',
  'AdMob ads served to users aged 16–17 are auto-tagged without behavioral targeting (TFUA).',
  // 2026-06-01 cycle
  'Payslip analyzer: the file is processed by Google Gemini only, not stored. Anonymized stats are kept on-device.',
  'Nine financial calculators (mortgage, pension, tax, etc.). Input is stored on-device only — not sent to any server.',
  'Captain Shark chat, stock analysis (quick/deep), and personal insights — processed by Google Gemini and Anthropic Claude.',
];

/** Public URL of the full hosted terms — kept here so the modal + email use the same link.
 *  Lives on the finplay.me landing project (Vercel, cleanUrls=true). */
export const TERMS_PUBLIC_URL = 'https://finplay.me/privacy-policy';
export const TERMS_OF_SERVICE_URL = 'https://finplay.me/terms-of-service';
export const DELETE_ACCOUNT_URL = 'https://finplay.me/delete-account';
