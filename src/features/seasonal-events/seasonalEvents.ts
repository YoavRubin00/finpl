// ---------------------------------------------------------------------------
// Seasonal Events Calendar — FinPlay (Israeli context)
//
// 90-day rolling calendar of themed events. Each event has start/end dates,
// theme copy, and a content/reward hook. Unlike static macro-events, these
// events surface a banner/CTA in the feed during their active window.
//
// Israeli rhythm: weekend (Friday-Saturday), Jewish holidays, tax-year close,
// Independence Day, etc. Yom HaZikaron is intentionally a SILENT day —
// the helper returns `silent: true` so the UI suppresses pushes/banners.
//
// Pattern inspired by Coin Master (themed raids), Brawl Stars (Brawl Cup)
// and Slotomania (holiday slot themes).
// ---------------------------------------------------------------------------

export type SeasonalEventTheme =
  | 'tax-year-close'
  | 'pesach-freedom'
  | 'memorial-silent'
  | 'independence'
  | 'lag-baomer'
  | 'rosh-hashana-summary'
  | 'sukkot-stability'
  | 'hanukkah-light'
  | 'tu-bishvat-investing'
  | 'black-friday'
  | 'new-year-strategy';

export interface SeasonalEvent {
  id: string;
  theme: SeasonalEventTheme;
  /** Display title shown in the feed banner. Hebrew, RTL. */
  titleHe: string;
  /** Sub-title / hook copy shown under the title. */
  subtitleHe: string;
  /** Inclusive start date — ISO "YYYY-MM-DD". */
  startDate: string;
  /** Inclusive end date — ISO "YYYY-MM-DD". */
  endDate: string;
  /** When true, suppress all push/banner content for this day (Yom HaZikaron). */
  silent?: boolean;
  /** Optional theme color (hex) used to tint the event banner. */
  accentColor?: string;
  /** Coin / XP / gem multiplier applied to lesson rewards while active.
   *  1.0 = baseline. Values >1 should be modest (1.1–1.5) to protect economy. */
  rewardMultiplier?: number;
  /** Optional emoji used as a visual anchor in the banner. */
  emoji?: string;
}

/**
 * Calendar — 12 months out from project launch (May 2026 → April 2027).
 * Dates rounded to standard Israeli civil calendar; Jewish holidays use the
 * approximate Gregorian dates for 2026 (verify yearly with Hebcal before
 * shipping next year's calendar).
 */
export const SEASONAL_EVENTS: readonly SeasonalEvent[] = [
  {
    id: 'memorial-2026',
    theme: 'memorial-silent',
    titleHe: 'יום הזיכרון',
    subtitleHe: 'יום שקט. אנחנו זוכרים.',
    startDate: '2026-04-22',
    endDate: '2026-04-22',
    silent: true,
    accentColor: '#1e293b',
    emoji: '🕯️',
  },
  {
    id: 'independence-2026',
    theme: 'independence',
    titleHe: '78 שנות חופש',
    subtitleHe: 'יום העצמאות — בונוס 25% מטבעות לכל שיעור היום',
    startDate: '2026-04-23',
    endDate: '2026-04-23',
    rewardMultiplier: 1.25,
    accentColor: '#0ea5e9',
    emoji: '🇮🇱',
  },
  {
    id: 'lag-baomer-2026',
    theme: 'lag-baomer',
    titleHe: 'מדורת חופש פיננסי',
    subtitleHe: 'ל"ג בעומר — שריפו את החובות, בונוס 15%',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
    rewardMultiplier: 1.15,
    accentColor: '#f97316',
    emoji: '🔥',
  },
  {
    id: 'rosh-hashana-2026',
    theme: 'rosh-hashana-summary',
    titleHe: 'סיכום שנה פיננסית',
    subtitleHe: 'ראש השנה תשפ"ז — בונוס מטבעות + תוכן ייעודי',
    startDate: '2026-09-12',
    endDate: '2026-09-18',
    rewardMultiplier: 1.20,
    accentColor: '#f59e0b',
    emoji: '🍎',
  },
  {
    id: 'sukkot-2026',
    theme: 'sukkot-stability',
    titleHe: 'יציבות בסוכה',
    subtitleHe: 'סוכות — שיעורים על קרן חירום ויציבות פיננסית',
    startDate: '2026-09-26',
    endDate: '2026-10-03',
    rewardMultiplier: 1.10,
    accentColor: '#84cc16',
    emoji: '🍃',
  },
  {
    id: 'black-friday-2026',
    theme: 'black-friday',
    titleHe: 'הקרב על בלאק פריידיי',
    subtitleHe: 'תוכן מיוחד על מלכודות שיווקיות + בונוס מטבעות',
    startDate: '2026-11-25',
    endDate: '2026-11-30',
    rewardMultiplier: 1.30,
    accentColor: '#dc2626',
    emoji: '🛍️',
  },
  {
    id: 'hanukkah-2026',
    theme: 'hanukkah-light',
    titleHe: 'שמונה ימים, שמונה שיעורים',
    subtitleHe: 'חנוכה — שיעור חדש ייפתח כל יום',
    startDate: '2026-12-04',
    endDate: '2026-12-12',
    rewardMultiplier: 1.15,
    accentColor: '#fbbf24',
    emoji: '🕎',
  },
  {
    id: 'new-year-2027',
    theme: 'new-year-strategy',
    titleHe: 'אסטרטגיה לשנה החדשה',
    subtitleHe: '31/12 — בנו תוכנית פיננסית ל-2027',
    startDate: '2026-12-29',
    endDate: '2027-01-02',
    rewardMultiplier: 1.20,
    accentColor: '#8b5cf6',
    emoji: '✨',
  },
  {
    id: 'tu-bishvat-2027',
    theme: 'tu-bishvat-investing',
    titleHe: 'נטיעת השקעות',
    subtitleHe: 'ט"ו בשבט — תוכן על השקעה לטווח ארוך',
    startDate: '2027-02-02',
    endDate: '2027-02-02',
    rewardMultiplier: 1.15,
    accentColor: '#22c55e',
    emoji: '🌳',
  },
  {
    id: 'tax-year-close-2027',
    theme: 'tax-year-close',
    titleHe: 'סוף שנת מס',
    subtitleHe: 'מ-15/3 עד 31/3 — תוכן על דיווח, נקודות זיכוי, החזרי מס',
    startDate: '2027-03-15',
    endDate: '2027-03-31',
    rewardMultiplier: 1.20,
    accentColor: '#0891b2',
    emoji: '🧾',
  },
  {
    id: 'pesach-2027',
    theme: 'pesach-freedom',
    titleHe: 'יציאה לחירות פיננסית',
    subtitleHe: 'פסח — שבעה ימים, תכולה פרימיום נפתחת',
    startDate: '2027-04-01',
    endDate: '2027-04-08',
    rewardMultiplier: 1.20,
    accentColor: '#3b82f6',
    emoji: '🌾',
  },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the active event for today, if any. */
export function getActiveSeasonalEvent(now: string = todayISO()): SeasonalEvent | null {
  return SEASONAL_EVENTS.find((e) => now >= e.startDate && now <= e.endDate) ?? null;
}

/** Returns the next upcoming event after today (used for "X days until..." copy). */
export function getNextSeasonalEvent(now: string = todayISO()): SeasonalEvent | null {
  const upcoming = SEASONAL_EVENTS
    .filter((e) => e.startDate > now)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? null;
}

/** True iff today is a silent day (suppress notifications + banners). */
export function isSilentToday(now: string = todayISO()): boolean {
  const evt = getActiveSeasonalEvent(now);
  return evt?.silent === true;
}

/** Lesson-reward multiplier for the active event (1.0 if none). */
export function getActiveRewardMultiplier(now: string = todayISO()): number {
  const evt = getActiveSeasonalEvent(now);
  if (!evt || evt.silent) return 1.0;
  return evt.rewardMultiplier ?? 1.0;
}
