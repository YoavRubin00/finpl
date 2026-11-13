/**
 * Geometry check for the living lesson diagrams.
 *
 *   npx tsx scripts/check-living-geometry.ts            (table + exit code)
 *   npx tsx scripts/check-living-geometry.ts --html DIR (also writes fit-<screen>-<scale>.html)
 *
 * Runs every diagram in the registry through the SAME planner and layout code
 * the app renders with (flowTimeline.ts, flowLayout.ts, erosionLayout.ts), at
 * every screen and font scale below, and asserts:
 *   1. every label is whole (no ellipsis), at 11 px or more;
 *   2. every element's box stays inside the stage minus the safe margin,
 *      counting motion: landing halo, bump, swing, badge pop, the glow under
 *      a path, the coin's halo along the whole path, the payoff sparks;
 *   3. no two nodes, no two labels and no node and label intersect, and no
 *      path runs through a label.
 * It also reports, per case, whether the segment's text and the diagram fit
 * the card's viewport together (the height budget) or the floor layout won.
 *
 * The screen model (what the device would measure with onLayout):
 *   stage width  = screen width - 16 (card margins) - 40 (card padding) - 24 (frame padding and borders)
 *   viewport     = screen height - top inset - bottom inset - LESSON_CHROME - 18 (segment dots)
 * LESSON_CHROME (lesson header and the bottom "המשך" bar) is an estimate; the
 * app itself measures the real numbers, this only feeds the height budget.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LESSON_VISUALS } from "../src/features/living-lesson/lessonVisuals";
import {
  BADGE_POP,
  BUMP_SCALE,
  MIN_FONT,
  SAFE,
  SPARK_SCALE,
  estimateTextWidth,
  FRAME_INSET_X,
  chooseFlow,
  frameBudget,
  frameChrome,
  stageBudget,
} from "../src/features/living-lesson/visuals/flow/flowLayout";
import type { FlowLayout, Rect } from "../src/features/living-lesson/visuals/flow/flowLayout";
import { layoutErosion } from "../src/features/living-lesson/visuals/flow/erosionLayout";
import type { FlowVisualSpec } from "../src/features/living-lesson/visuals/flow/flowTypes";

const LESSON_CHROME = 190;

interface Screen {
  name: string;
  w: number;
  h: number;
  top: number;
  bottom: number;
}

const SCREENS: Screen[] = [
  { name: "320x568 (iPhone SE 1)", w: 320, h: 568, top: 20, bottom: 0 },
  { name: "360x640 (Android, 3-button nav)", w: 360, h: 640, top: 24, bottom: 48 },
  { name: "375x667 (iPhone SE 2/3)", w: 375, h: 667, top: 20, bottom: 0 },
  { name: "390x844 (iPhone 14)", w: 390, h: 844, top: 47, bottom: 34 },
  { name: "414x896 (iPhone 11)", w: 414, h: 896, top: 48, bottom: 34 },
  { name: "430x932 (iPhone 15 Pro Max)", w: 430, h: 932, top: 59, bottom: 34 },
  { name: "768x1024 (tablet)", w: 768, h: 1024, top: 24, bottom: 20 },
];
const SCALES = [1, 1.3];

const root = join(__dirname, "..");

/** The text of the segment an attachment sits on, read from the lesson data files. */
function segmentTexts(): Record<string, string> {
  const out: Record<string, string> = {};
  const featureDir = join(root, "src", "features");
  const files: string[] = [];
  for (const dir of readdirSync(featureDir)) {
    if (!/^chapter-\d-content$/.test(dir)) continue;
    for (const f of readdirSync(join(featureDir, dir))) {
      if (/^(chapter\dData|mod-.*)\.ts$/.test(f)) files.push(join(featureDir, dir, f));
    }
  }
  const sources = files.map((f) => readFileSync(f, "utf8"));
  for (const list of Object.values(LESSON_VISUALS)) {
    for (const a of list) {
      for (const src of sources) {
        let i = src.indexOf(`id: '${a.cardId}'`);
        if (i < 0) i = src.indexOf(`id: "${a.cardId}"`);
        if (i < 0) continue;
        const block = src.slice(i, i + 6000);
        const line = block.split("\n").find((l) => /\btext:/.test(l) && l.includes(a.anchor) && block.indexOf(l) > block.indexOf("segments:"));
        if (line) out[a.cardId] = line.replace(/^.*?text:\s*['"]/, "").replace(/['"],?\s*(\/\/.*)?$/, "").replace(/\*\*|\[\[[^|\]]*\||\[\[|\]\]/g, "");
      }
    }
  }
  return out;
}

const inside = (r: Rect, W: number, H: number, eps = 0.01): boolean =>
  r.x >= SAFE - eps && r.y >= SAFE - eps && r.x + r.w <= W - SAFE + eps && r.y + r.h <= H - SAFE + eps;
const hit = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const grow = (r: Rect, k: number): Rect => ({ x: r.x - (r.w * (k - 1)) / 2, y: r.y - (r.h * (k - 1)) / 2, w: r.w * k, h: r.h * k });

function checkFlow(spec: FlowVisualSpec, layout: FlowLayout, payoffId: string): string[] {
  const errs: string[] = [];
  const W = layout.width;
  const H = layout.height;
  if (!layout.textFits) errs.push("a label does not fit two lines");
  if (layout.labelFont < MIN_FONT) errs.push(`label font ${layout.labelFont} < ${MIN_FONT}`);
  const nodes = Object.values(layout.nodes);
  for (const n of nodes) {
    if (!inside(n.motionRect, W, H)) errs.push(`${n.id}: halo/bump leaves the safe box`);
    if (!inside(grow(n.ringRect, BUMP_SCALE), W, H)) errs.push(`${n.id}: ring leaves the safe box`);
    if (!inside(n.textRect, W, H)) errs.push(`${n.id}: text block leaves the safe box`);
    if (n.inkRect.w > n.textRect.w + 0.01) errs.push(`${n.id}: text wider than its block`);
    const s = spec.nodes.find((x) => x.id === n.id);
    if (s?.badge) {
      const b = layout.badge;
      const badge: Rect = { x: n.ringRect.x + n.ringRect.w - b, y: n.ringRect.y, w: b, h: b };
      if (!inside(grow(badge, BADGE_POP), W, H)) errs.push(`${n.id}: badge pop leaves the safe box`);
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const a = nodes[i];
      const b = nodes[j];
      if (i < j && hit(a.ringRect, b.ringRect, 2)) errs.push(`${a.id} and ${b.id}: nodes overlap`);
      if (i < j && hit(a.inkRect, b.inkRect, 2)) errs.push(`${a.id} and ${b.id}: labels overlap`);
      if (hit(a.ringRect, b.inkRect, 1)) errs.push(`${a.id} node over ${b.id} label`);
    }
    if (hit(nodes[i].ringRect, nodes[i].inkRect, 0)) errs.push(`${nodes[i].id}: label under its own node`);
  }
  for (const c of layout.curves) {
    if (!inside(c.bounds, W, H)) errs.push(`path ${c.leg.from}>${c.leg.to}: glow or coin leaves the safe box`);
    const cv = c.curve;
    for (let s = 0; s <= 40; s++) {
      const t = s / 40;
      const u = 1 - t;
      const x = u * u * u * cv.x0 + 3 * u * u * t * cv.x1 + 3 * u * t * t * cv.x2 + t * t * t * cv.x3;
      const y = u * u * u * cv.y0 + 3 * u * u * t * cv.y1 + 3 * u * t * t * cv.y2 + t * t * t * cv.y3;
      const p: Rect = { x: x - 1.5, y: y - 1.5, w: 3, h: 3 };
      const through = nodes.find((n) => hit(p, n.inkRect, 0));
      if (through) {
        errs.push(`path ${c.leg.from}>${c.leg.to} runs through the label of ${through.id}`);
        break;
      }
    }
  }
  const payoff = layout.nodes[payoffId];
  if (payoff && layout.sparkR > 0) {
    const r = layout.sparkR * SPARK_SCALE;
    if (!inside({ x: payoff.cx - r, y: payoff.cy - r, w: r * 2, h: r * 2 }, W, H)) errs.push("payoff sparks leave the safe box");
  }
  return errs;
}

interface CaseResult {
  cardId: string;
  mode: string;
  variant: string;
  stageH: number;
  frameH: number;
  budget: number;
  fitsViewport: boolean;
  errors: string[];
  svg: string;
  caption: string;
}

const TONES: Record<string, { main: string; deep: string; tint: string; lip: string }> = {
  cyan: { main: "#0ea5e9", deep: "#0369a1", tint: "#e0f2fe", lip: "#7dd3fc" },
  gold: { main: "#f59e0b", deep: "#b45309", tint: "#fef3c7", lip: "#fcd34d" },
  green: { main: "#22c55e", deep: "#15803d", tint: "#dcfce7", lip: "#86efac" },
  red: { main: "#ef4444", deep: "#b91c1c", tint: "#fee2e2", lip: "#fca5a5" },
  violet: { main: "#7c3aed", deep: "#6d28d9", tint: "#ede9fe", lip: "#c4b5fd" },
};

function drawFlow(spec: FlowVisualSpec, layout: FlowLayout): string {
  const W = layout.width;
  const H = layout.height;
  let s = `<rect width="${W}" height="${H}" rx="14" fill="#f4faff" stroke="rgba(2,132,199,.2)"/>`;
  s += `<rect x="${SAFE}" y="${SAFE}" width="${W - SAFE * 2}" height="${H - SAFE * 2}" fill="none" stroke="#f43f5e" stroke-dasharray="3 3" stroke-width=".8"/>`;
  for (const c of layout.curves) {
    const tone = TONES[c.leg.tone];
    s += `<path d="${c.curve.d}" stroke="${tone.main}" stroke-opacity=".2" stroke-width="9" stroke-linecap="round" fill="none"/>`;
    s += `<path d="${c.curve.d}" stroke="${tone.main}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  }
  for (const n of spec.nodes) {
    const at = layout.nodes[n.id];
    if (!at) continue;
    const tone = TONES[n.tone ?? "cyan"];
    const m = at.motionRect;
    s += `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="${m.w / 2}" fill="${tone.main}" opacity=".10"/>`;
    s += `<circle cx="${at.cx}" cy="${at.cy}" r="${layout.ringR}" stroke="${tone.main}" stroke-width="${layout.ringStroke}" fill="none"/>`;
    s += `<circle cx="${at.cx}" cy="${at.cy}" r="${layout.chip / 2}" fill="${tone.tint}" stroke="${tone.lip}" stroke-width="1.5"/>`;
    if (n.badge) {
      const b = layout.badge;
      s += `<circle cx="${at.ringRect.x + at.ringRect.w - b / 2}" cy="${at.ringRect.y + b / 2}" r="${b / 2}" fill="${n.badge === "check" ? "#16a34a" : "#dc2626"}" stroke="#fff" stroke-width="2"/>`;
    }
    const t = at.textRect;
    s += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="none" stroke="rgba(15,23,42,.12)" stroke-width=".6"/>`;
    const ink = at.inkRect;
    s += `<rect x="${ink.x}" y="${ink.y}" width="${ink.w}" height="${ink.h}" fill="rgba(14,165,233,.07)"/>`;
    // Label lines, wrapped the way the layout counted them.
    const words = at.label.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (estimateTextWidth(next, layout.labelFont) <= t.w) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    lines.push(cur);
    const anchorX = at.textAlign === "center" ? t.x + t.w / 2 : at.textAlign === "right" ? t.x + t.w : t.x;
    const anchor = at.textAlign === "center" ? "middle" : at.textAlign === "right" ? "end" : "start";
    lines.forEach((line, i) => {
      s += `<text x="${anchorX}" y="${ink.y + layout.labelLH * (i + 0.78)}" font-size="${layout.labelFont}" font-weight="800" text-anchor="${anchor}" fill="#0f172a" font-family="Heebo, Arial">${line}</text>`;
    });
    if (n.amount) {
      const v = n.amount.values[n.amount.values.length - 1];
      const body = Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);
      s += `<text x="${anchorX}" y="${ink.y + lines.length * layout.labelLH + layout.amountLH * 0.78}" font-size="${layout.amountFont}" font-weight="900" text-anchor="${anchor}" fill="${tone.deep}" font-family="Heebo, Arial" direction="ltr">${n.amount.prefix ?? ""}${body}${n.amount.suffix ?? ""}</text>`;
    }
  }
  return s;
}

function run(): { table: string[]; failed: number; cases: Record<string, CaseResult[]> } {
  const texts = segmentTexts();
  const table: string[] = [];
  const cases: Record<string, CaseResult[]> = {};
  let failed = 0;
  table.push("| Screen | Font scale | Stage width | Geometry pass | Layouts (regular / compact / side) | Fit viewport with their text | Whole diagram visible at once | Failures |");
  table.push("|---|---|---|---|---|---|---|---|");
  for (const screen of SCREENS) {
    for (const fontScale of SCALES) {
      const stageW = screen.w - 16 - 40 - FRAME_INSET_X;
      const cardW = screen.w - 16;
      const viewportH = screen.h - screen.top - screen.bottom - LESSON_CHROME - 18;
      const results: CaseResult[] = [];
      for (const list of Object.values(LESSON_VISUALS)) {
        for (const a of list) {
          const text = texts[a.cardId] ?? "";
          const textLines = Math.max(1, Math.ceil(estimateTextWidth(text, 17 * fontScale) / 1.05 / (cardW - 40)));
          const textH = textLines * 26 * fontScale;
          const budget = frameBudget(viewportH, textH) ?? 0;
          if (a.visual.kind === "flow") {
            const chromeOpts = { stageWidth: stageW, caption: a.visual.caption, example: a.visual.example, shark: !!a.visual.shark, fontScale };
            const chosen = chooseFlow(a.visual, { width: stageW, maxHeight: stageBudget(budget, chromeOpts), fontScale, rtl: a.visual.direction !== "ltr" });
            if (!chosen) {
              results.push({ cardId: a.cardId, mode: "none", variant: "full", stageH: 0, frameH: 0, budget, fitsViewport: false, errors: ["no layout"], svg: "", caption: "" });
              continue;
            }
            const { layout, plan } = chosen;
            const drawn: FlowVisualSpec = { ...a.visual, nodes: chosen.nodes, stages: chosen.stages };
            const frameH = layout.height + frameChrome(chromeOpts);
            results.push({
              cardId: a.cardId,
              mode: layout.mode,
              variant: chosen.variant,
              stageH: layout.height,
              frameH,
              budget,
              fitsViewport: frameH <= budget + 0.5,
              errors: checkFlow(drawn, layout, plan.payoffId),
              svg: `<svg width="${layout.width}" height="${layout.height}">${drawFlow(drawn, layout)}</svg>`,
              caption: a.visual.caption ?? "",
            });
          } else if (a.visual.kind === "erosion") {
            const v = a.visual;
            const layout = layoutErosion({ width: stageW, fontScale, items: v.items, noteLabel: v.noteLabel, priceLabel: v.priceLabel, basketLabel: v.basketLabel, noteCaption: "אותו שטר" });
            const errors: string[] = [];
            let svg = "";
            let frameH = 0;
            if (!layout) errors.push("no layout");
            else {
              const W = layout.width;
              const H = layout.height;
              if (!layout.textFits) errors.push("a label does not fit two lines");
              const boxes: Array<[string, Rect]> = [
                ["note", layout.note],
                ["price tag at its largest", layout.tagMotion],
                ["arrow", layout.arrow],
                ["basket with drop", layout.basketMotion],
                ["note label", layout.labels.note],
                ["price label", layout.labels.price],
                ["basket label", layout.labels.basket],
              ];
              for (const [name, r] of boxes) if (!inside(r, W, H)) errors.push(`${name} leaves the safe box`);
              const solid: Array<[string, Rect]> = [boxes[0], boxes[1], boxes[3], boxes[4], boxes[5], boxes[6]];
              for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) if (hit(solid[i][1], solid[j][1], 0)) errors.push(`${solid[i][0]} overlaps ${solid[j][0]}`);
              frameH = H + frameChrome({ stageWidth: stageW, caption: v.caption, example: v.example, fontScale });
              svg = `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="14" fill="#f4faff" stroke="rgba(2,132,199,.2)"/><rect x="${SAFE}" y="${SAFE}" width="${W - SAFE * 2}" height="${H - SAFE * 2}" fill="none" stroke="#f43f5e" stroke-dasharray="3 3" stroke-width=".8"/>${boxes
                .map(([, r], i) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="${["#dcfce7", "#fee2e2", "#dc2626", "#fef3c7", "none", "none", "none"][i]}" stroke="rgba(15,23,42,.25)" stroke-width=".6"/>`)
                .join("")}</svg>`;
            }
            results.push({ cardId: a.cardId, mode: "erosion", variant: "full", stageH: layout?.height ?? 0, frameH, budget, fitsViewport: frameH <= budget + 0.5, errors, svg, caption: v.caption ?? "" });
          }
        }
      }
      const key = `${screen.w}x${screen.h}@${fontScale}`;
      cases[key] = results;
      const bad = results.filter((r) => r.errors.length > 0);
      failed += bad.length;
      const count = (m: string) => results.filter((r) => r.mode === m).length;
      const fit = results.filter((r) => r.fitsViewport).length;
      // The diagram with its caption and replay button, alone in the viewport (card padding 24, "more" strip 52).
      const alone = results.filter((r) => r.frameH <= viewportH - 76).length;
      const tallest = Math.max(...results.map((r) => Math.round(r.frameH)));
      table.push(
        `| ${screen.name} | ${fontScale} | ${stageW} | ${results.length - bad.length}/${results.length} | ${count("regular")} / ${count("compact")} / ${count("side")}, fewer rows: ${results.filter((r) => r.variant === "fewer-rows").length} | ${fit}/${results.length} | ${alone}/${results.length} (tallest ${tallest} of ${viewportH - 76}) | ${bad.map((b) => `${b.cardId}: ${b.errors[0]}`).join("; ") || "none"} |`,
      );
    }
  }
  return { table, failed, cases };
}

const { table, failed, cases } = run();
console.log(table.join("\n"));
const htmlAt = process.argv.indexOf("--html");
if (htmlAt > 0 && process.argv[htmlAt + 1]) {
  const dir = process.argv[htmlAt + 1];
  mkdirSync(dir, { recursive: true });
  for (const [key, results] of Object.entries(cases)) {
    const w = results[0] ? Number(key.split("x")[0]) - 16 - 40 - FRAME_INSET_X : 300;
    const body = results
      .map(
        (r) =>
          `<div class="c" style="width:${w}px"><div class="m">${r.cardId} · ${r.mode}${r.variant === "fewer-rows" ? " (fewer rows)" : ""} · stage ${r.stageH} · frame ${Math.round(r.frameH)} / budget ${Math.round(r.budget)} ${r.fitsViewport ? "" : "· over budget"}${r.errors.length ? " · FAIL: " + r.errors.join("; ") : ""}</div>${r.svg}<div class="cap">${r.caption}</div></div>`,
      )
      .join("");
    writeFileSync(
      join(dir, `fit-${key.replace("@", "-fs")}.html`),
      `<html><head><meta charset="utf-8"><style>body{margin:14px;background:#eef5fb;font-family:Arial}h1{font:700 14px Arial}.g{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}.c{background:#fff;border:1px solid #dbe7f3;border-bottom-width:3px;border-radius:18px;padding:10px}.m{font:700 9px Arial;color:#64748b;margin-bottom:4px}.cap{font:600 12.5px Arial;color:#475569;text-align:center;margin-top:8px;direction:rtl}</style></head><body><h1>${key} · red dashes: the safe box · tinted discs: the most a node covers while it animates</h1><div class="g">${body}</div></body></html>`,
      "utf8",
    );
  }
}
if (failed > 0) {
  for (const [key, results] of Object.entries(cases)) {
    for (const r of results) if (r.errors.length) console.error(`${key} ${r.cardId} [${r.mode}]: ${r.errors.join("; ")}`);
  }
  console.error(`\nFAILED: ${failed} case(s)`);
  process.exit(1);
}
console.log("\nAll cases pass.");
