/**
 * Geometry of the purchasing-power visual, from the measured stage width and
 * the font scale. Pure, like flowLayout.ts, and checked by the same script:
 * the banknote, the growing price tag (at its largest), the basket (with its
 * dropping items) and the three labels all stay inside the safe box.
 */
import { MIN_FONT, SAFE, estimateTextWidth } from "./flowLayout";
import type { Rect } from "./flowLayout";

/** The price tag grows to this scale at the end. */
export const TAG_GROW = 1.42;
/** px a dropped item sinks. */
export const DROP_PX = 6;
export const EROSION_PER_ROW = 5;

export interface ErosionLayout {
  width: number;
  height: number;
  unit: number;
  note: Rect;
  noteFont: number;
  /** The tag's circle at rest. */
  tag: Rect;
  /** Everything the tag covers at its largest, arrow badge included. */
  tagMotion: Rect;
  arrow: Rect;
  basket: Rect;
  /** The basket with its items' drop. */
  basketMotion: Rect;
  item: number;
  itemGap: number;
  labelFont: number;
  labelLH: number;
  labelLines: number;
  labels: { note: Rect; price: Rect; basket: Rect };
  textFits: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function linesFor(text: string, maxW: number, font: number): number | null {
  const words = text.split(" ").filter(Boolean);
  let lines = 1;
  let current = "";
  for (const word of words) {
    if (estimateTextWidth(word, font) > maxW) return null;
    const next = current ? `${current} ${word}` : word;
    if (estimateTextWidth(next, font) <= maxW) current = next;
    else {
      lines += 1;
      current = word;
    }
  }
  return lines;
}

export function layoutErosion(env: { width: number; fontScale: number; items: number; noteLabel: string; priceLabel: string; basketLabel: string; noteCaption: string }): ErosionLayout | null {
  const W = env.width;
  if (W < SAFE * 2 + 150) return null;
  // 6 px more than the safe margin at both ends: room for a dropping item's tilt
  // and for the outer labels, which are a little wider than what they sit under.
  const OUTER = 6;
  const inner = W - SAFE * 2 - OUTER * 2;
  // Base design: note 76, tag column 64, basket 112, two gaps of at least 8.
  const unit = clamp((inner - 16) / 252, 0.72, 1.4);
  const noteW = 76 * unit;
  const noteH = 44 * unit;
  const tagD = 44 * unit;
  const tagCol = Math.max(64 * unit, tagD * TAG_GROW + 2);
  const item = Math.round(20 * unit);
  const itemGap = Math.max(2, Math.round(3 * unit));
  const basketW = EROSION_PER_ROW * item + (EROSION_PER_ROW - 1) * itemGap;
  const rows = Math.ceil(Math.max(1, Math.min(10, env.items)) / EROSION_PER_ROW);
  const basketH = rows * item + (rows - 1) * itemGap;
  const gap = Math.min(44, (inner - noteW - tagCol - basketW) / 2);
  if (gap < 4) return null;
  const group = noteW + tagCol + basketW + gap * 2;
  const left = (W - group) / 2;

  // Hebrew reading order, right to left: note, price, basket.
  const noteX = left + basketW + gap + tagCol + gap;
  const tagColX = left + basketW + gap;
  const basketX = left;

  const rowH = Math.max(noteH, tagD * TAG_GROW, basketH + DROP_PX);
  const midY = SAFE + rowH / 2;

  const f = clamp(env.fontScale || 1, 1, 1.3);
  let labelFont = Math.max(MIN_FONT, Math.round(12 * f * 10) / 10);
  // A label may be wider than its element by 60% of a gap, and at the outer ends by no more than the OUTER room.
  const outerExtra = Math.min(gap * 0.6, OUTER * 2);
  const colW = { note: noteW + outerExtra, price: tagCol + gap * 0.6, basket: basketW + outerExtra };
  const fit = (font: number): number | null => {
    const a = linesFor(env.noteCaption, colW.note, font);
    const b = linesFor(env.priceLabel, colW.price, font);
    const c = linesFor(env.basketLabel, colW.basket, font);
    if (a === null || b === null || c === null) return null;
    const most = Math.max(a, b, c);
    return most <= 2 ? most : null;
  };
  let labelLines = fit(labelFont);
  if (labelLines === null) {
    labelFont = MIN_FONT;
    labelLines = fit(labelFont);
  }
  const textFits = labelLines !== null;
  const lines = labelLines ?? 2;
  const labelLH = Math.ceil(labelFont * 1.3);
  const labelY = SAFE + rowH + 8;
  const labelH = lines * labelLH;
  const height = Math.ceil(labelY + labelH + SAFE);

  const tagCx = tagColX + tagCol / 2;
  const tag: Rect = { x: tagCx - tagD / 2, y: midY - tagD / 2, w: tagD, h: tagD };
  const grown = tagD * TAG_GROW;
  const arrowD = Math.round(clamp(20 * unit, 16, 24));
  // The arrow badge rides the tag's top corner, kept inside the grown tag's box.
  const arrow: Rect = { x: tagCx + grown / 2 - arrowD, y: midY - grown / 2, w: arrowD, h: arrowD };

  const noteFont = Math.max(MIN_FONT, Math.min(18, (noteW - 16) / Math.max(1, estimateTextWidth(env.noteLabel, 1))));

  return {
    width: W,
    height,
    unit,
    note: { x: noteX, y: midY - noteH / 2, w: noteW, h: noteH },
    noteFont,
    tag,
    tagMotion: { x: tagCx - grown / 2, y: midY - grown / 2, w: grown, h: grown },
    arrow,
    basket: { x: basketX, y: midY - basketH / 2, w: basketW, h: basketH },
    basketMotion: { x: basketX - 2, y: midY - basketH / 2, w: basketW + 4, h: basketH + DROP_PX + 1 },
    item,
    itemGap,
    labelFont,
    labelLH,
    labelLines: lines,
    labels: {
      note: { x: noteX + noteW / 2 - colW.note / 2, y: labelY, w: colW.note, h: labelH },
      price: { x: tagCx - colW.price / 2, y: labelY, w: colW.price, h: labelH },
      basket: { x: basketX + basketW / 2 - colW.basket / 2, y: labelY, w: colW.basket, h: labelH },
    },
    textFits,
  };
}
