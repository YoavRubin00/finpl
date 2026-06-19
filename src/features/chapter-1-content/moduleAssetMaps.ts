/**
 * Module-level asset maps extracted from LessonFlowScreen so other features
 * (e.g. topic-learning's prefetch hook) can import these records without
 * also pulling in the 6k-line lesson screen module. That import path was
 * a circular dep (topic-learning → LessonFlowScreen → topic-learning) and
 * also broke tree-shaking — the architect P0 in the 2026-06-11 pre-release
 * audit.
 *
 * The three records below were moved verbatim from LessonFlowScreen.tsx
 * and are now re-exported from there for back-compat with the dozens of
 * internal callsites.
 */
import { toProxiedImageUri } from '../../lib/imageProxy';

/** Full-screen character art shown when first opening a module */
export const MODULE_HERO_MAP: Record<string, { uri: string } | number> = {
  "mod-4-19": require("../../../assets/IMAGES/finn/finn-splash.webp") as number,
  "mod-5-25": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/finn-freedom.png' },
};

/** Modules with a NotebookLM-generated infographic shown before the summary/chest */
export const MODULE_INFOGRAPHIC_MAP: Record<string, { uri: string }> = {
  // 2026-06-04: mod-0-1 entry removed as part of the mod-0-1 split. The
  // infographic appeared BEFORE the summary card; with the summary card
  // moved to mod-0-1b, the infographic no longer fits in mod-0-1's flow.
  // mod-0-1b is short and doesn't need an extra infographic. See
  // plans/0-2-toasty-torvalds.md.
  "mod-0-2": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-1-upgrade.png' },
  "mod-0-3": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-3-upgrade.png' },
  "mod-0-4": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-4-upgrade.png' },
  "mod-0-5": { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/infographics/ch0-upgrade/mod-0-5-upgrade.png' },
};

/** Modules with a video shown AFTER the infographic (before the chest) */
export const MODULE_POST_VIDEO_MAP: Record<string, string> = {
  // 2026-06-04: mod-0-1 entry removed as part of the mod-0-1 split. The
  // Finn post-summary video summed up loan/pension content that has moved
  // to mod-0-1b, so it no longer matches mod-0-1's reduced scope. mod-0-1b
  // is short and doesn't need a post-video. See plans/0-2-toasty-torvalds.md.
  // Chapter 0 — money/banking/interest/credit/pension (NEW first slot — was mod-0-2 content)
  "mod-0-2": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/0-1.mp4",
  "mod-0-3": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-studying.mp4",
  "mod-0-4": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-0-4.mp4",
  "mod-0-5": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-0-5.mp4",
  // Chapter 1 — Tier 2 specifics (generated for each topic)
  "mod-1-1": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-1-1.mp4", // ריבית דריבית
  "mod-1-2": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-1-2.mp4", // מלכודת המינוס
  "mod-1-3": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-0-4.mp4", // אשראי — recycle credit-card scene
  "mod-1-4": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch2-budget.mp4", // תקציב — recycle budget scene
  "mod-1-5": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-1-5.mp4", // תלוש שכר
  "mod-1-6": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch1-debt.mp4", // הלוואות — recycle debt scene
  "mod-1-7": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-1-7.mp4", // עמלות
  "mod-1-8": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-1-8.mp4", // מלכודות שיווקיות
  "mod-1-9": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-1-9.mp4", // קרן חירום
  // Chapter 2 — Tier 2 specifics + recycles
  "mod-2-10": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-2-10.mp4", // דירוג אשראי
  "mod-2-11": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-2-11.mp4", // נקודות זיכוי
  "mod-2-12": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-0-5.mp4", // פנסיה — recycle
  "mod-2-13": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-studying.mp4", // קרן השתלמות — recycle
  "mod-2-14": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-2-14.mp4", // ביטוחים
  // Chapter 3 — Tier 2 specific (psychology) + recycles
  "mod-3-15": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch3-inflation.mp4",
  "mod-3-16": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-3-16.mp4", // פסיכולוגיה של הכסף
  "mod-3-17": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4", // קופת גמל
  "mod-3-18": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-trading-start.mp4", // מסלולי השקעה
  // Chapter 4 — Tier 2 specifics (dividend, diversification) + recycles
  "mod-4-19": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4",
  "mod-4-20": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-trading-start.mp4", // מדדים
  "mod-4-21": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4", // ETF
  "mod-4-22": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-trading-start.mp4", // פקודות מסחר
  "mod-4-23": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-4-23.mp4", // דיבידנד
  "mod-4-24": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-4-24.mp4", // פיזור סיכונים
  "mod-4-25": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-studying.mp4", // דוחות כספיים
  "mod-4-26": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-trading-start.mp4", // פלטפורמות
  "mod-4-27": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4",
  "mod-4-28": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4", // ניתוח גרפים
  "mod-4-29": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4", // סוגי מניות
  "mod-4-b1": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-studying.mp4", // Graham 7 rules
  "mod-4-b2": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-studying.mp4", // margin safety
  "mod-4-b3": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch4-invest.mp4", // price/value
  "mod-4-b4": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-studying.mp4", // AP story
  // Chapter 5 — all recycled (FIRE / pension / champion themes)
  "mod-5-25": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch5-fire.mp4",
  "mod-5-26": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-0-5.mp4",
  "mod-5-27": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-ch5-fire.mp4",
  "mod-5-28": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-streak-365.mp4",
  "mod-5-29": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-mod-0-5.mp4",
  "mod-5-30": "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-streak-100.mp4",
};

// Route the IMAGE maps through our /api/img proxy in prod (per-client 403 fix —
// see toProxiedImageUri). Videos are intentionally left direct: they stream via
// the player/Range path, not ExpoImage, and the proxy buffers full bodies.
for (const k of Object.keys(MODULE_INFOGRAPHIC_MAP)) {
  MODULE_INFOGRAPHIC_MAP[k] = { uri: toProxiedImageUri(MODULE_INFOGRAPHIC_MAP[k].uri) };
}
for (const k of Object.keys(MODULE_HERO_MAP)) {
  const v = MODULE_HERO_MAP[k];
  if (v && typeof v === 'object' && 'uri' in v) {
    MODULE_HERO_MAP[k] = { uri: toProxiedImageUri(v.uri) };
  }
}
