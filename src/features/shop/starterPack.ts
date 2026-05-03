/**
 * Starter Pack — daily-rotating ₪19.90 bundle (חבילת מתחילים).
 *
 * Monetization (מוני):
 *   • Anchor at ₪19.90 — psychological entry point. Below the ₪29.90 first
 *     "real" gem bundle, above the free tier. Goal: convert the "I won't pay
 *     anything" segment into "I paid once" — those users are 4-5× more likely
 *     to buy a second time later (industry benchmark).
 *   • Same price every day; the *contents* rotate. This protects the price
 *     anchor while keeping the offer fresh — "I missed yesterday's pack but
 *     today's looks even better" is the FOMO lever, not the discount.
 *   • Heavy on consumables (coins/gems) + 2 cheap permanent unlocks (avatars).
 *     Perceived value held roughly constant across days (~₪75 worth of stuff
 *     for ₪19.90 → "75% off" claim stays honest).
 *
 * Retention (ריטנשן):
 *   • Daily rotation = a reason to open the shop daily (D1/D7 retention lift).
 *   • Each bundle picks a different pair of avatars from the 10-avatar set,
 *     so a buyer-on-day-1 has a different identity hook than a buyer-on-day-2.
 *   • Auto-equipping the first avatar means the user *sees* a payoff
 *     immediately on the profile screen. Visible payoff is the #1 retention
 *     lever after a purchase moment.
 *
 * Rotation:
 *   • Deterministic by Israel-local day-of-year. Resets at 00:00 Asia/Jerusalem.
 *   • 7 distinct bundles → cycles weekly. Easy to extend.
 */
export interface StarterPackContents {
  /** Stable id for analytics + IAP receipt validation. */
  id: string;
  coins: number;
  gems: number;
  avatarIds: readonly string[];
  /** Avatar that gets auto-equipped after purchase. Must be in avatarIds. */
  autoEquipAvatarId: string;
  /** Short Hebrew tagline describing the day's flavor. */
  tagline: string;
}

const STARTER_PACK_VARIANTS: readonly StarterPackContents[] = [
  // Day 0 — saver/learner combo (entry)
  {
    id: 'starter-saver-learner',
    coins: 6000,
    gems: 100,
    avatarIds: ['avatar-saver', 'avatar-learner'],
    autoEquipAvatarId: 'avatar-saver',
    tagline: 'התחלה חכמה',
  },
  // Day 1 — grower/strong-saver (long-term mindset)
  {
    id: 'starter-grower-strong',
    coins: 7000,
    gems: 90,
    avatarIds: ['avatar-grower', 'avatar-strong-saver'],
    autoEquipAvatarId: 'avatar-grower',
    tagline: 'בונים על הזמן',
  },
  // Day 2 — analyst/investor (data + growth)
  {
    id: 'starter-analyst-investor',
    coins: 5000,
    gems: 130,
    avatarIds: ['avatar-analyst', 'avatar-investor'],
    autoEquipAvatarId: 'avatar-analyst',
    tagline: 'מחליטים עם נתונים',
  },
  // Day 3 — defender/saver (defense first)
  {
    id: 'starter-defender-saver',
    coins: 8000,
    gems: 80,
    avatarIds: ['avatar-defender', 'avatar-saver'],
    autoEquipAvatarId: 'avatar-defender',
    tagline: 'שומרים על ההון',
  },
  // Day 4 — explorer/investor (ambitious)
  {
    id: 'starter-explorer-investor',
    coins: 5500,
    gems: 150,
    avatarIds: ['avatar-explorer', 'avatar-investor'],
    autoEquipAvatarId: 'avatar-explorer',
    tagline: 'אופקים חדשים',
  },
  // Day 5 — strategist/learner (chess + study)
  {
    id: 'starter-strategist-learner',
    coins: 6500,
    gems: 120,
    avatarIds: ['avatar-strategist', 'avatar-learner'],
    autoEquipAvatarId: 'avatar-strategist',
    tagline: 'תכנון לפני פעולה',
  },
  // Day 6 — trader/analyst (active markets)
  {
    id: 'starter-trader-analyst',
    coins: 5500,
    gems: 140,
    avatarIds: ['avatar-trader', 'avatar-analyst'],
    autoEquipAvatarId: 'avatar-trader',
    tagline: 'קוראים את השוק',
  },
];

/** Days since 1970-01-01 in Israel local time. Stable for the entire calendar
 *  day in Asia/Jerusalem and rolls over at 00:00 Israel time, regardless of
 *  the device's local timezone. */
function israelDayIndex(now: Date = new Date()): number {
  // UTC+2 (winter) / UTC+3 (summer). Use Intl to ask for the date in Asia/Jerusalem
  // — this is the only timezone-safe way without bundling a tz database.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // 'en-CA' formats as "YYYY-MM-DD" — easy to parse.
  const parts = fmt.format(now); // e.g. "2026-05-03"
  const [y, m, d] = parts.split('-').map(Number);
  // Compute days since epoch using a UTC anchor so the math is timezone-free
  // once we have the y/m/d in Israel time.
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The starter pack offered today (rotates at 00:00 Asia/Jerusalem). */
export function getTodaysStarterPack(now: Date = new Date()): StarterPackContents {
  const idx = israelDayIndex(now) % STARTER_PACK_VARIANTS.length;
  return STARTER_PACK_VARIANTS[idx]!;
}

export const STARTER_PACK_PRICE_LABEL = '₪19.90';
export const STARTER_PACK_ORIGINAL_PRICE_LABEL = '₪59.90';
export const STARTER_PACK_DISCOUNT_PCT = 67;

/** Stable RevenueCat / store product ID. The contents change daily but the
 *  IAP product is the same — we charge the same price for "today's bundle". */
export const STARTER_PACK_PRODUCT_ID = 'finplay_starter_pack_19_90';
