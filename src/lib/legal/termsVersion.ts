/**
 * Single source of truth for the current legal terms version.
 * Bump this string whenever docs/finplay-terms-and-privacy.md is materially
 * updated. Date format: YYYY-MM-DD (so lexicographic string comparison gives
 * the correct ordering: '2026-06-01' > '2026-04-01').
 *
 * When you bump this, also update TERMS_UPDATE_SUMMARY_HE below to describe
 * what changed — that's what the user sees in the re-consent modal.
 */
export const CURRENT_TERMS_VERSION = '2026-07-03';

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
  // 2026-07-03 cycle — social / community features
  'נפתח עמוד "חברים" חברתי: חדרי שיח, ייעוץ אנונימי, חכמת ההמונים, שיתוף תיקים (וירטואליים), ליגת פנטזי, לוחות מובילים ומאגר חברים.',
  'פרופיל ציבורי בהסכמה בלבד (Opt-In): רק אם תאשר/י, שם התצוגה, האווטאר, הרמה ומספר המטבעות הווירטואליים שלך יוצגו למשתמשים אחרים. אימייל ופרטים אישיים לעולם לא נחשפים. ניתן לבטל את הגלוּת בכל עת.',
  'תוכן שאת/ה מפרסם/ת בקהילה (הודעות, פוסטים, תיקים משותפים) נשמר בשרת, מוצג לאחרים ועובר מודרציה. ניתן לדווח ולחסום. חל איסור על הטרדה ותוכן פוגעני.',
  'תחזיות והתערבויות בחכמת ההמונים ובפנטזי הן במטבעות וירטואליים בלבד, ללא כל ערך כספי וללא אפשרות להמרה לכסף — אין באפליקציה הימור בכסף אמיתי.',
  // 2026-06-04 cycle — parental-consent flow shipped
  'בני 16–17 שמעוניינים במנוי Pro יכולים כעת לקבל אישור הורה ישירות באפליקציה: מזינים אימייל של הורה ושולחים קישור אישור. רכישה תיפתח רק לאחר שההורה ילחץ על האישור.',
  // 2026-06-03 cycle — legal-compliance pass
  'גיל מינימום באפליקציה: 16. רכישת מנוי Pro והצעות מסחריות פתוחות לגיל 18 ומעלה, או לבני 16–17 עם אישור הורה.',
  'מודעות (AdMob) למשתמשים בני 16–17 מתויגות אוטומטית ללא מיקוד התנהגותי (TFUA).',
  // 2026-06-01 cycle — payslip + tools + AI clarifications
  'כלי ניתוח תלוש שכר: הקובץ מעובד באמצעות שירות AI ואינו נשמר. סטטיסטיקות אנונימיות נשמרות במכשיר.',
  'תשעה כלים פיננסיים (משכנתא, פנסיה, מס, ועוד). הקלט נשמר רק במכשיר, ללא העברה לשרת.',
  'צ\'אט עם Captain Shark, ניתוח מניות (מהיר/עמוק) ותובנות אישיות — מעובדים באמצעות שירותי AI.',
];

/** Same consolidated summary in English. Keep ordering identical to HE. */
export const TERMS_UPDATE_SUMMARY_EN: ReadonlyArray<string> = [
  // 2026-07-03 cycle — social / community features
  'A social "Friends" hub launched: chat rooms, anonymous advice, crowd wisdom, (virtual) portfolio sharing, a fantasy league, leaderboards, and a friends directory.',
  'Public profile by consent only (opt-in): only if you approve, your display name, avatar, level, and virtual-coin count become visible to other users. Email and personal details are never exposed. You can turn visibility off at any time.',
  'Content you post to the community (messages, posts, shared portfolios) is stored on the server, shown to others, and moderated. You can report and block. Harassment and offensive content are prohibited.',
  'Predictions and wagers in crowd wisdom and fantasy use virtual coins only — no monetary value and no cash conversion. There is no real-money gambling in the app.',
  // 2026-06-04 cycle
  'Users aged 16–17 can now obtain parental consent for a Pro subscription directly in the app: enter a parent\'s email, an approval link is sent, and purchase unlocks once the parent clicks to confirm.',
  // 2026-06-03 cycle
  'Minimum age in the app: 16. Pro purchases and commercial offers are restricted to users 18+, or 16–17 with parental consent.',
  'AdMob ads served to users aged 16–17 are auto-tagged without behavioral targeting (TFUA).',
  // 2026-06-01 cycle
  'Payslip analyzer: the file is processed by an AI service and is not stored. Anonymized stats are kept on-device.',
  'Nine financial calculators (mortgage, pension, tax, etc.). Input is stored on-device only — not sent to any server.',
  'Captain Shark chat, stock analysis (quick/deep), and personal insights — processed by AI services.',
];

/** Public URL of the full hosted terms — kept here so the modal + email use the same link.
 *  Lives on the finplay.me landing project (Vercel, cleanUrls=true). */
export const TERMS_PUBLIC_URL = 'https://finplay.me/privacy-policy';
export const TERMS_OF_SERVICE_URL = 'https://finplay.me/terms-of-service';
export const DELETE_ACCOUNT_URL = 'https://finplay.me/delete-account';
