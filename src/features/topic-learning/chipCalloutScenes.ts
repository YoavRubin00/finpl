/**
 * Webp pool + copy for the Captain Shark chip-completion call-out
 * (`SharkChipCallout`). A short, celebratory encouragement that pops after
 * EVERY real chip completion in the topic-tree accordion, pulling the user
 * toward opening the 70% chest (activation: chest-reachers retain ~2.4×).
 *
 * Yoav 2026-06-22: "כל פעם המשתמש יראה וובף אחר בסיום ציפ — מגניב ולא חזרתי."
 * → a rotating pool so consecutive completions never show the same mascot.
 *
 * SEQUENCING: this ships with the 3 EXISTING shark loops so the code is
 * OTA-deliverable immediately. Four NEW chest/diamond/gold loops are being
 * generated via the `finplay-mascot-webp` skill (Element `shark-finn-v2`) and
 * will be appended here — pool grows 3 → 7 — in a follow-up OTA. The rotation
 * reads CHIP_CALLOUT_WEBPS.length dynamically, so adding entries is all it
 * takes. Planned additions (commented placeholders below):
 *   • שארק מציג/פותח תיבת אוצר זוהרת
 *   • שארק מלהטט מטבעות זהב + יהלומים
 *   • שארק מחזיק יהלום ענק נוצץ
 *   • שארק + דייזי חוגגים ליד תיבה מלאה זהב
 *
 * IN-APP mascot loops legitimately live under assets/webp/ (the ONE bundling
 * exception per CLAUDE.md — they are genuine in-app assets, not marketing).
 */
import type { ImageSourcePropType } from 'react-native';

export interface ChipCalloutWebp {
  id: string;
  source: ImageSourcePropType;
}

export const CHIP_CALLOUT_WEBPS: ChipCalloutWebp[] = [
  { id: 'dancing', source: require('../../../assets/webp/fin-dancing-1.webp') },
  { id: 'victory', source: require('../../../assets/webp/fin-victory.webp') },
  { id: 'fire', source: require('../../../assets/webp/fin-fire-1.webp') },
  // --- "reach the chest" set: chest / diamonds / gold (Higgsfield, Element-locked
  //     shark-finn-v2 + daisy-finplay; green-screen → transparent loop) ---
  { id: 'chest', source: require('../../../assets/webp/fin-chest-glow.webp') },
  { id: 'coins', source: require('../../../assets/webp/fin-coins-diamonds.webp') },
  { id: 'diamond', source: require('../../../assets/webp/fin-big-diamond.webp') },
  { id: 'daisy-treasure', source: require('../../../assets/webp/fin-daisy-treasure.webp') },
  // --- "refresh between modules" set (Yoav 2026-06-22) ---
  { id: 'meditation', source: require('../../../assets/webp/fin-meditation.webp') },
  { id: 'shower', source: require('../../../assets/webp/fin-shower.webp') },
];

/** Proximity band, derived from chips-remaining-to-chest (NOT raw pct). */
export type ChipCalloutBand = 'far' | 'close' | 'imminent';

export function bandForRemaining(remaining: number): ChipCalloutBand {
  if (remaining <= 1) return 'imminent';
  if (remaining === 2) return 'close';
  return 'far';
}

/** Hebrew plural for the chip count (BRAND: plural system voice). */
function chipsLabel(n: number): string {
  if (n === 1) return "צ'יפ אחד";
  if (n === 2) return "2 צ'יפים";
  return `${n} צ'יפים`;
}

/**
 * Proximity copy. Celebratory + momentum, never guilt ("אל תפספסו"/"חבל") —
 * the nearness itself is the nudge. No shark emoji (banned); 🎁 only at the
 * imminent CTA beat. mod-0-1/mod-0-2 lean on "first chest" novelty.
 */
export function calloutMessage(remaining: number, isFirstChest: boolean): string {
  const band = bandForRemaining(remaining);
  if (band === 'imminent') {
    return isFirstChest
      ? 'עוד רכיב אחד — והתיבה הראשונה שלכם! 🎁'
      : "צ'יפ אחד אחרון והתיבה נפתחת! 🎁";
  }
  if (band === 'close') {
    return "עוד 2 צ'יפים והתיבה נפתחת!";
  }
  return `מתקרבים לתיבה — עוד ${chipsLabel(remaining)}!`;
}
