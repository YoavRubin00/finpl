import type { ImageSourcePropType } from "react-native";

// Bundled World-Cup ("מונדיאל") carousel — the same 5 edu-carousel slides
// produced for Instagram (sky-blue brand bg, baked Hebrew, costumed shark),
// surfaced in-app as a pearl-style swipeable carousel. Sources are static
// require()s so Metro bundles them.

export interface MondialSlide {
  id: string;
  source: ImageSourcePropType;
  /** Accessibility label — the headline as plain text (the image itself
   *  carries baked Hebrew, which a screen reader can't read). */
  alt: string;
}

export const MONDIAL_SLIDES: MondialSlide[] = [
  {
    id: "cover",
    source: require("../../../assets/IMAGES/mondial-carousel/slide1-cover.webp"),
    alt: "5 מספרים מטורפים מאחורי המונדיאל",
  },
  {
    id: "betting",
    source: require("../../../assets/IMAGES/mondial-carousel/slide2-betting.webp"),
    alt: "50 מיליארד דולר יהמרו על המונדיאל — הבית תמיד מנצח",
  },
  {
    id: "tickets",
    source: require("../../../assets/IMAGES/mondial-carousel/slide3-tickets.webp"),
    alt: "כרטיס לגמר עד 11,000 דולר ל-90 דקות",
  },
  {
    id: "ronaldo",
    source: require("../../../assets/IMAGES/mondial-carousel/slide4-ronaldo.webp"),
    alt: "רונאלדו מרוויח 767 אלף דולר ביום, גם כשהוא ישן",
  },
  {
    id: "cta",
    source: require("../../../assets/IMAGES/mondial-carousel/slide5-cta.webp"),
    alt: "הכסף זה המגרש, אתה הקפטן — שחק עכשיו",
  },
];

/**
 * Featured-carousel launch date (Israel local time, YYYY-MM-DD). The learn-map
 * mail badge surfaces to RETURNING users (≥1 completed module) on/after this
 * date. Flip this single constant to change when it goes live.
 */
export const MONDIAL_LAUNCH_DATE = "2026-06-17";

/** Local YYYY-MM-DD (device time) for the date gate — avoids the UTC skew of
 *  toISOString() so "tomorrow" flips at local midnight, not 02:00/03:00. */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
