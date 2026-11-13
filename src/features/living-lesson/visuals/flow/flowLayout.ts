/**
 * Where everything in a living diagram sits, for a given stage width, height
 * budget and font scale. Pure (no React, no Reanimated): the renderer draws
 * exactly what this returns, and scripts/check-living-geometry.ts runs the
 * same code over every diagram and screen size to prove nothing leaves the
 * safe box and nothing overlaps.
 *
 * Rules (Yoav 13.11.2026: "שלא יחרגו, שיהיה מרחקי בטיחות"):
 * - every size comes from the measured stage width: label width, ring, chip,
 *   icon, fonts, coin, path bow. Each is clamped to a min and a max;
 * - a safe margin (SAFE px) is kept on every side of the stage. Nothing is
 *   drawn or animated outside it, counting the landing halo, the pop
 *   overshoot, the glow under a path, the coin's halo and the payoff sparks;
 * - three layouts, tried in order until one fits the height budget:
 *   "regular" (labels under the nodes), "compact" (smaller nodes, tighter
 *   rows, minimum font, short labels) and "side" (two-column diagrams only:
 *   the label sits beside its node, so three rows take half the height);
 * - text never goes below MIN_FONT. If even the smallest layout is taller
 *   than the budget, the smallest layout wins and the card scrolls.
 */
import { legCurve, planFlow } from "./flowTimeline";
import type { Curve, FlowPlan, PlannedLeg } from "./flowTimeline";
import type { FlowNodeSpec, FlowStageSpec, FlowVisualSpec } from "./flowTypes";
import { FLOW_MAX_NODES } from "./flowTypes";

/** Inner safe margin on every side of the stage. */
export const SAFE = 14;
/** What StageFrame takes off the visual's width: frame border 1 + padding 10 + stage border 1, on each side. */
export const FRAME_INSET_X = 24;
/** The readable floor for any text inside a diagram (px, after font scale). */
export const MIN_FONT = 11;
/** A diagram never stretches wider than this; on a tablet it is centred. */
const MAX_CONTENT_W = 440;
/** The landing halo grows to this multiple of the ring box. */
export const HALO_SCALE = 1.25;
/** A node's chip bumps to this scale when a coin lands. */
export const BUMP_SCALE = 1.09;
/** A badge overshoots to about this scale when it pops. */
export const BADGE_POP = 1.1;
/** The payoff sparks end at this multiple of their ring radius. */
export const SPARK_SCALE = 1.2;
/** px a "swing" node moves up and down. */
export const SWING_PX = 3;
/** Half the width of the glow under a path. */
const GLOW_HALF = 4.5;
const TEXT_GAP = 3;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FlowLayoutMode = "regular" | "compact" | "side";

export interface FlowEnv {
  /** Measured width of the stage. */
  width: number;
  /** Most height the stage may take. Undefined: no budget. */
  maxHeight?: number;
  /** System font scale (1 = default). Clamped to 1..1.3 inside. */
  fontScale: number;
  rtl: boolean;
}

export interface NodeLayout {
  id: string;
  cx: number;
  cy: number;
  /** The label actually shown (the short one in tight layouts). */
  label: string;
  labelLines: number;
  textAlign: "center" | "left" | "right";
  /** The ring box (what never moves). */
  ringRect: Rect;
  /** The reserved text block: label lines, then the amount line. */
  textRect: Rect;
  /** Where the label's ink is expected (estimated width, for overlap checks). */
  inkRect: Rect;
  /** Everything the node can cover while it animates. */
  motionRect: Rect;
}

export interface FlowLayout {
  mode: FlowLayoutMode;
  width: number;
  height: number;
  ring: number;
  ringR: number;
  ringStroke: number;
  chip: number;
  icon: number;
  badge: number;
  coin: number;
  coinHalo: number;
  labelFont: number;
  labelLH: number;
  amountFont: number;
  amountLH: number;
  /** Lines reserved for every label in this diagram (1 or 2). */
  labelLines: number;
  hasAmount: boolean;
  nodes: Record<string, NodeLayout>;
  curves: Array<{ leg: PlannedLeg; curve: Curve; bounds: Rect }>;
  /** Radius of the payoff sparks, sized to stay inside the safe box. */
  sparkR: number;
  /** False when even the smallest layout is taller than the budget. */
  fitsBudget: boolean;
  /** False when a label had to be cut (should never happen: the check fails on it). */
  textFits: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** A conservative estimate of a string's width in Heebo ExtraBold. */
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === " ") em += 0.27;
    else if (code >= 0x0590 && code <= 0x05ff) em += 0.57;
    else if (ch >= "0" && ch <= "9") em += 0.6;
    else if (ch === "," || ch === "." || ch === "'" || ch === "\"" || ch === ":") em += 0.3;
    else if (ch === "%") em += 0.85;
    else if (ch === "₪") em += 0.66;
    else if (ch >= "A" && ch <= "Z") em += 0.7;
    else if (code === 0x200f || code === 0x200e) em += 0;
    else em += 0.6;
  }
  return em * fontSize * 1.05;
}

/** Greedy word wrap. Returns the number of lines and the widest line, or null when a single word is wider than the box. */
function wrap(text: string, maxW: number, fontSize: number): { lines: number; widest: number } | null {
  const words = text.split(" ").filter(Boolean);
  let lines = 1;
  let current = "";
  let widest = 0;
  for (const word of words) {
    if (estimateTextWidth(word, fontSize) > maxW) return null;
    const next = current ? `${current} ${word}` : word;
    if (estimateTextWidth(next, fontSize) <= maxW) {
      current = next;
    } else {
      widest = Math.max(widest, estimateTextWidth(current, fontSize));
      lines += 1;
      current = word;
    }
  }
  widest = Math.max(widest, estimateTextWidth(current, fontSize));
  return { lines, widest };
}

function amountText(spec: FlowNodeSpec): string {
  if (!spec.amount) return "";
  let longest = "";
  for (const v of spec.amount.values) {
    const body = Number.isInteger(v) ? Math.round(v).toLocaleString("en-US") : String(v);
    const s = `${spec.amount.prefix ?? ""}${body}${spec.amount.suffix ?? ""}`;
    if (s.length > longest.length) longest = s;
  }
  return longest;
}

interface Sizes {
  mode: FlowLayoutMode;
  labelFont: number;
  ringK: number;
  ringMin: number;
  ringMax: number;
  rowGap: number;
  useShort: boolean;
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function curveBounds(c: Curve, pad: number): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    const x = u * u * u * c.x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x3;
    const y = u * u * u * c.y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y3;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

function build(nodes: FlowNodeSpec[], plan: FlowPlan, env: FlowEnv, s: Sizes): FlowLayout | null {
  const W = env.width;
  const contentW = Math.min(W, MAX_CONTENT_W);
  const ox = (W - contentW) / 2;
  const maxCol = Math.max(0, ...nodes.map((n) => n.col));
  const maxRow = Math.max(0, ...nodes.map((n) => n.row));
  const side = s.mode === "side";
  if (side && (maxCol !== 1 || nodes.some((n) => n.col !== 0 && n.col !== 1))) return null;

  const hasAmount = nodes.some((n) => n.amount);
  const labelFont = s.labelFont;
  const labelLH = Math.ceil(labelFont * 1.3);
  // Beside a node there is little width: the number takes the label's size there.
  const amountFont = side ? labelFont : Math.round((labelFont + 1) * 10) / 10;
  const amountLH = Math.ceil(amountFont * 1.3);

  // Horizontal metrics.
  let cellW: number;
  let ring: number;
  let textW: number;
  if (side) {
    // 32 px between the two columns' rings is the shortest path that still reads as a path.
    cellW = Math.floor((contentW - SAFE * 2 - 32) / 2);
    ring = Math.round(clamp(cellW * 0.36, 34, 46));
    textW = cellW - ring - 8;
  } else {
    cellW = maxCol > 0 ? Math.min(124, Math.floor((contentW - SAFE * 2 - 6 * maxCol) / (maxCol + 1))) : Math.min(170, contentW - SAFE * 2);
    // The halo must stay inside the node's own column: ring * HALO_SCALE <= cellW.
    ring = Math.round(clamp(Math.min(cellW * s.ringK, (cellW - 2) / HALO_SCALE), s.ringMin, s.ringMax));
    textW = cellW;
  }
  if (textW < 30 || ring * HALO_SCALE > cellW + 0.5) return null;

  // Labels: full, or short where the full one cannot fit two lines.
  let textFits = true;
  let labelLines = 1;
  const labels: Record<string, { text: string; lines: number; widest: number }> = {};
  for (const n of nodes) {
    let text = n.label;
    let w = wrap(text, textW, labelFont);
    if ((!w || w.lines > 2) && n.short) {
      text = n.short;
      w = wrap(text, textW, labelFont);
    } else if (s.useShort && n.short && w && w.lines > 1) {
      const shortWrap = wrap(n.short, textW, labelFont);
      if (shortWrap && shortWrap.lines < w.lines) {
        text = n.short;
        w = shortWrap;
      }
    }
    if (!w || w.lines > 2) {
      textFits = false;
      w = { lines: 2, widest: textW };
    }
    if (n.amount && estimateTextWidth(amountText(n), amountFont) > textW) textFits = false;
    labels[n.id] = { text, lines: w.lines, widest: w.widest };
    labelLines = Math.max(labelLines, w.lines);
  }

  const textH = labelLines * labelLH + (hasAmount ? amountLH : 0);
  const haloHalf = (ring * HALO_SCALE) / 2;
  const hasSwing = nodes.some((n) => n.swing);
  const motionHalf = haloHalf + (hasSwing ? SWING_PX : 0);
  const hasAbove = !side && nodes.some((n) => n.labelAbove);

  // Vertical metrics.
  let pitch: number;
  let y0: number;
  let bottomExt: number;
  if (side) {
    pitch = Math.max(ring * HALO_SCALE, textH) + s.rowGap;
    y0 = SAFE + Math.max(motionHalf, textH / 2);
    bottomExt = Math.max(motionHalf, textH / 2);
  } else {
    pitch = ring + TEXT_GAP + textH + s.rowGap;
    y0 = SAFE + Math.max(motionHalf, hasAbove ? ring / 2 + TEXT_GAP + textH : 0);
    bottomExt = Math.max(motionHalf, ring / 2 + TEXT_GAP + textH);
  }
  let height = y0 + maxRow * pitch + bottomExt + SAFE;

  // Node positions.
  const out: Record<string, NodeLayout> = {};
  const half = side ? 0 : cellW / 2;
  for (const n of nodes) {
    const label = labels[n.id];
    const cy = y0 + n.row * pitch;
    let cxLogical: number;
    let textRectLogical: Rect;
    let align: "center" | "left" | "right";
    if (side) {
      // Column 0: the text hugs the start edge, the ring sits towards the middle. Column 1 mirrors it.
      const start = n.col === 0;
      const edge = start ? SAFE : contentW - SAFE;
      cxLogical = start ? edge + textW + 8 + ring / 2 : edge - textW - 8 - ring / 2;
      textRectLogical = { x: start ? edge : edge - textW, y: cy - textH / 2, w: textW, h: textH };
      align = start ? "left" : "right";
    } else {
      const left = SAFE + half;
      const span = contentW - SAFE * 2 - cellW;
      cxLogical = left + (maxCol > 0 ? (n.col / maxCol) * span : span / 2);
      const above = n.labelAbove === true;
      textRectLogical = {
        x: cxLogical - textW / 2,
        y: above ? cy - ring / 2 - TEXT_GAP - textH : cy + ring / 2 + TEXT_GAP,
        w: textW,
        h: textH,
      };
      align = "center";
    }
    // Logical x runs from the reading start. In Hebrew the start is the right edge: mirror.
    const cx = env.rtl ? W - (ox + cxLogical) : ox + cxLogical;
    const textX = env.rtl ? W - (ox + textRectLogical.x + textRectLogical.w) : ox + textRectLogical.x;
    const textAlign: "center" | "left" | "right" = align === "center" ? "center" : (align === "left") === env.rtl ? "right" : "left";
    const textRect: Rect = { x: textX, y: textRectLogical.y, w: textW, h: textH };
    const inkW = Math.max(label.widest, n.amount ? estimateTextWidth(amountText(n), amountFont) : 0);
    const inkX = textAlign === "center" ? textRect.x + (textW - inkW) / 2 : textAlign === "right" ? textRect.x + textW - inkW : textRect.x;
    // In the regular layouts a label is top-aligned under its node and bottom-aligned above it.
    const usedH = label.lines * labelLH + (n.amount ? amountLH : 0);
    const inkY = side ? cy - usedH / 2 : n.labelAbove ? textRect.y + textH - usedH : textRect.y;
    const swing = n.swing ? SWING_PX : 0;
    out[n.id] = {
      id: n.id,
      cx,
      cy,
      label: label.text,
      labelLines: label.lines,
      textAlign,
      ringRect: { x: cx - ring / 2, y: cy - ring / 2, w: ring, h: ring },
      textRect,
      inkRect: { x: inkX, y: inkY, w: inkW, h: usedH },
      motionRect: { x: cx - haloHalf, y: cy - haloHalf - swing, w: haloHalf * 2, h: haloHalf * 2 + swing * 2 },
    };
  }

  // Paths, and room for the ones that bow outside their nodes (a loop's two legs).
  const coin = Math.round(clamp(ring * 0.3, 13, 18));
  const coinHalo = coin / 2 + 5;
  const pathPad = Math.max(GLOW_HALF, coinHalo);
  const makeCurves = () =>
    plan.legs
      .filter((leg) => out[leg.from] && out[leg.to])
      .map((leg) => {
        const curve = legCurve(
          { x: out[leg.from].cx, y: out[leg.from].cy },
          { x: out[leg.to].cx, y: out[leg.to].cy },
          ring / 2,
          leg.route,
          leg.arced,
        );
        return { leg, curve, bounds: curveBounds(curve, pathPad) };
      });
  let curves = makeCurves();
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of curves) {
    minY = Math.min(minY, c.bounds.y);
    maxY = Math.max(maxY, c.bounds.y + c.bounds.h);
  }
  const shiftDown = curves.length > 0 && minY < SAFE ? Math.ceil(SAFE - minY) : 0;
  if (shiftDown > 0) {
    for (const node of Object.values(out)) {
      node.cy += shiftDown;
      node.ringRect.y += shiftDown;
      node.textRect.y += shiftDown;
      node.inkRect.y += shiftDown;
      node.motionRect.y += shiftDown;
    }
    height += shiftDown;
    maxY += shiftDown;
    curves = makeCurves();
  }
  if (curves.length > 0 && maxY > height - SAFE) height = Math.ceil(maxY + SAFE);

  // Payoff sparks: as wide as the room around the payoff node allows.
  const payoff = out[plan.payoffId];
  let sparkR = 0;
  if (payoff) {
    const room = Math.min(payoff.cx - SAFE, W - SAFE - payoff.cx, payoff.cy - SAFE, height - SAFE - payoff.cy);
    sparkR = Math.max(0, Math.min(ring * 0.66, (room - 4) / SPARK_SCALE));
  }

  return {
    mode: s.mode,
    width: W,
    height: Math.ceil(height),
    ring,
    ringR: ring / 2 - Math.max(3, ring * 0.065) / 2 - 1,
    ringStroke: Math.max(3, Math.round(ring * 0.065)),
    chip: Math.round(ring * 0.7),
    icon: Math.round(ring * 0.35),
    badge: Math.round(clamp(ring * 0.33, 15, 20)),
    coin,
    coinHalo,
    labelFont,
    labelLH,
    amountFont,
    amountLH,
    labelLines,
    hasAmount,
    nodes: out,
    curves,
    sparkR,
    fitsBudget: true,
    textFits,
  };
}

/**
 * How tall a segment's visual may be so that the segment's text, the visual
 * and the "more" pill all sit in the card's viewport without scrolling.
 * `viewportH` is the measured height of the card's scroll area and `textH`
 * the measured height of the segment's text.
 */
export function frameBudget(viewportH: number, textH: number): number | undefined {
  if (viewportH <= 0) return undefined;
  // Card padding above the first segment (24), the gap between text and visual (14),
  // and the strip at the bottom where the "עוד" pill floats (52).
  const room = viewportH - 24 - textH - 14 - 52;
  // Never more than 72% of the viewport, even under a one-line text.
  return Math.min(room, viewportH * 0.72);
}

/**
 * The layout for this stage. Tries regular, compact, then side; takes the
 * first that fits the height budget with every label whole. If none fits the
 * budget, the shortest one with whole labels wins and `fitsBudget` is false.
 */
export function layoutFlow(allNodes: FlowNodeSpec[], plan: FlowPlan, env: FlowEnv): FlowLayout | null {
  const nodes = allNodes.slice(0, FLOW_MAX_NODES);
  if (env.width < SAFE * 2 + 60 || nodes.length === 0) return null;
  const f = clamp(env.fontScale || 1, 1, 1.3);
  const regularFont = Math.max(MIN_FONT, Math.round(12 * f * 10) / 10);
  const compactFont = Math.max(MIN_FONT, Math.round(11 * f * 10) / 10);

  const ladder: Sizes[] = [
    { mode: "regular", labelFont: regularFont, ringK: 0.62, ringMin: 44, ringMax: 64, rowGap: 8, useShort: false },
    { mode: "compact", labelFont: compactFont, ringK: 0.58, ringMin: 38, ringMax: 52, rowGap: 5, useShort: true },
    { mode: "side", labelFont: compactFont, ringK: 0, ringMin: 0, ringMax: 0, rowGap: 5, useShort: true },
    // Last resort for a narrow stage at a large font: the floor font, so labels stay whole.
    { mode: "compact", labelFont: MIN_FONT, ringK: 0.58, ringMin: 38, ringMax: 52, rowGap: 5, useShort: true },
    { mode: "side", labelFont: MIN_FONT, ringK: 0, ringMin: 0, ringMax: 0, rowGap: 5, useShort: true },
  ];

  const budget = env.maxHeight ?? Infinity;
  let best: FlowLayout | null = null;
  for (const sizes of ladder) {
    const candidate = build(nodes, plan, env, sizes);
    if (!candidate) continue;
    if (candidate.textFits && candidate.height <= budget) return candidate;
    // Whole labels beat a shorter stage; among equals, the shorter stage wins.
    if (!best || (candidate.textFits && !best.textFits) || (candidate.textFits === best.textFits && candidate.height < best.height)) {
      best = candidate;
    }
  }
  return best ? { ...best, fitsBudget: best.height <= budget } : null;
}

export interface ChosenFlow {
  /** "full": the diagram as written. "fewer-rows": its `compact` arrangement. */
  variant: "full" | "fewer-rows";
  nodes: FlowNodeSpec[];
  stages: FlowStageSpec[];
  plan: FlowPlan;
  layout: FlowLayout;
}

/**
 * The diagram to draw on this stage. The full diagram wins whenever it fits
 * the height budget. When it does not, and the diagram carries a `compact`
 * arrangement (fewer rows, sometimes fewer nodes) that comes out shorter,
 * that one is drawn instead.
 */
export function chooseFlow(visual: FlowVisualSpec, env: FlowEnv): ChosenFlow | null {
  const plan = planFlow(visual.nodes, visual.stages);
  const full = layoutFlow(visual.nodes, plan, env);
  if (!full) return null;
  const whole: ChosenFlow = { variant: "full", nodes: visual.nodes, stages: visual.stages, plan, layout: full };
  if (full.fitsBudget || !visual.compact) return whole;
  const compactPlan = planFlow(visual.compact.nodes, visual.compact.stages);
  const compact = layoutFlow(visual.compact.nodes, compactPlan, env);
  if (!compact || !compact.textFits || compact.height >= full.height) return whole;
  return { variant: "fewer-rows", nodes: visual.compact.nodes, stages: visual.compact.stages, plan: compactPlan, layout: compact };
}

/** Height of the frame's own chrome around the stage (padding, borders, tag row, caption row). */
export function frameChrome(opts: { stageWidth: number; caption?: string; example?: boolean; shark?: boolean; fontScale: number }): number {
  const fs = Math.max(1, opts.fontScale || 1);
  const captionW = Math.max(60, opts.stageWidth - 40 - (opts.shark ? 52 : 0));
  const captionLines = opts.caption ? Math.max(1, Math.ceil(estimateTextWidth(opts.caption, 12.5 * fs) / captionW)) : 0;
  const footer = 8 + Math.max(opts.shark ? 44 : 32, captionLines * Math.ceil(18 * fs));
  const tag = opts.example ? Math.ceil(11 * fs * 1.35) + 4 + 6 : 0;
  // 10 px padding top and bottom, 1 + 3 px frame borders, 2 px stage borders.
  return 20 + 4 + 2 + footer + tag;
}

/** The least a stage is ever given, whatever the budget says: below this nothing is legible. */
export const MIN_STAGE_H = 96;

/** Turns a budget for the whole frame into a budget for the stage. */
export function stageBudget(frameMax: number | undefined, opts: Parameters<typeof frameChrome>[0]): number | undefined {
  if (frameMax === undefined) return undefined;
  return Math.max(MIN_STAGE_H, frameMax - frameChrome(opts));
}
