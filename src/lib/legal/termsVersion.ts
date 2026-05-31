/**
 * Single source of truth for the current legal terms version.
 * Bump this string whenever docs/finplay-terms-and-privacy.md is materially
 * updated. Date format: YYYY-MM-DD (so lexicographic string comparison gives
 * the correct ordering: '2026-06-01' > '2026-04-01').
 *
 * When you bump this, also update TERMS_UPDATE_SUMMARY_HE below to describe
 * what changed — that's what the user sees in the re-consent modal.
 */
export const CURRENT_TERMS_VERSION = '2026-06-01';

/** Short Hebrew bullets shown in the re-consent modal. Keep each under ~100 chars. */
export const TERMS_UPDATE_SUMMARY_HE: ReadonlyArray<string> = [
  'הוספנו כלי לניתוח תלוש שכר. הקובץ מעובד אצל Google Gemini ולא נשמר.',
  'הוספנו 9 כלים פיננסיים (משכנתא, פנסיה, מס ועוד). הקלט נשמר רק במכשיר.',
  'הצ\'אט עם Captain Shark משתמש ב-AI של Google ו-Anthropic.',
  'ניתוח מניות עמוק משתמש ב-Anthropic Claude.',
  'הבהרנו ששמירת סטטיסטיקות אנונימיות של תלוש (טווחים בלבד) מבוצעת מקומית.',
];

/** Same summary in English, for users who switch language. */
export const TERMS_UPDATE_SUMMARY_EN: ReadonlyArray<string> = [
  'Added a payslip analyzer tool. The file is processed by Google Gemini and not stored.',
  'Added 9 financial calculators (mortgage, pension, tax, etc.). Input is stored on-device only.',
  'Captain Shark chat uses AI from Google and Anthropic.',
  'Deep stock analysis uses Anthropic Claude.',
  'Clarified that aggregated anonymized payslip statistics (ranges only) are stored locally.',
];

/** Public URL of the full hosted terms — kept here so the modal + email use the same link. */
export const TERMS_PUBLIC_URL = 'https://yoavrubin00.github.io/finpl/privacy-policy.html';
export const DELETE_ACCOUNT_URL = 'https://yoavrubin00.github.io/finpl/delete-account.html';
