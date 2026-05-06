/**
 * Lifestyle break videos — viral-reels-style 9:16 clips of Captain Shark
 * shown between modules as a relaxation moment, expanding the existing
 * Shark Party Invite pattern.
 *
 * Each video: invite modal (Confetti + Lottie + CTA) → fullscreen VideoHookPlayer.
 *
 * STREAMING GUARANTEE: every video is served as a remote URI through expo-video's
 * useVideoPlayer, which buffers but never persists to device storage. None of
 * these go through `getCachedVideoPath` (which would download via FileSystem).
 *
 * URL resolution per id (in priority order):
 *   1. `blobUrl` from FINN_MANIFEST (Vercel Blob — public, fast, recommended)
 *   2. `rawUrl`  from FINN_MANIFEST (Higgsfield CloudFront — works immediately
 *                after generation, before mirroring to Blob)
 *   3. sharkparty.mp4 placeholder (last-resort fallback so the flow never breaks)
 *
 * To upgrade a video to a Blob URL, just run `upload-to-blob.ts` — once it
 * writes a `blobUrl` into the manifest, this resolver picks it up automatically.
 */

import { findById } from "../../../scripts/higgsfield/manifest";

export interface LifestyleVideoSpec {
  id: string;
  videoUri: string;
  inviteTitle: string;
  inviteSubtitle: string;
  ctaLabel: string;
  /** Half-sentence caption overlaid on the video itself (viral-reels style).
   *  Pattern: [activity/place] [from/funded by] [financial source].
   *  Example: "קניות מהכסף שהרווחתי במניות". */
  caption: string;
  trimEnd?: number;
}

const PLACEHOLDER_URI =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/sharkparty.mp4";

function resolveVideoUri(id: string): string {
  const spec = findById(id);
  return spec?.blobUrl ?? spec?.rawUrl ?? PLACEHOLDER_URI;
}

interface LifestyleCopy {
  id: string;
  inviteTitle: string;
  inviteSubtitle: string;
  ctaLabel: string;
  caption: string;
  trimEnd?: number;
}

const LIFESTYLE_COPY: LifestyleCopy[] = [
  {
    id: "finn-life-ski",
    inviteTitle: "🎿 חופשת סקי עם הקפטן!",
    inviteSubtitle: "צריך לדעת גם לנוח",
    ctaLabel: "בואו לקפוץ איתי!",
    caption: "סקי בחופשה שהדיווידנדים מימנו",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-yacht",
    inviteTitle: "⛵ יאכטה במונקו!",
    inviteSubtitle: "השמש, הים, והדיבידנדים",
    ctaLabel: "בואו לעלות על הסיפון!",
    caption: "יאכטה מההכנסה הפסיבית של החודש",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-festival",
    inviteTitle: "🎧 פסטיבל הקפטן!",
    inviteSubtitle: "הכסף רוקד? בואו לחגוג",
    ctaLabel: "בואו לרקוד!",
    caption: "פסטיבל מהבונוס השנתי",
    trimEnd: 0.5,
  },
  // ── Val Thorens mini-series ──
  {
    id: "finn-life-valt-ski",
    inviteTitle: "🏔️ הקפטן בוואל טורנס!",
    inviteSubtitle: "סקי בשלוש העמקים — אדרנלין טהור",
    ctaLabel: "בואו לגלוש איתי!",
    caption: "וואל טורנס מהרווח של S&P",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-valt-apres",
    inviteTitle: "🍻 אפרה-סקי בשלט",
    inviteSubtitle: "אחרי יום על המסלול — שולחן ליד האח",
    ctaLabel: "בואו להרים כוסית!",
    caption: "בירה ונקניקיה מהריבית של החודש",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-valt-hottub",
    inviteTitle: "♨️ ג'קוזי על המרפסת",
    inviteSubtitle: "שקיעה מעל 3 העמקים. שווה כל קר.",
    ctaLabel: "בואו להירגע איתי!",
    caption: "ג'קוזי על חשבון תיק האג\"ח",
    trimEnd: 0.5,
  },
  // ── Eilat vacation mini-series ──
  {
    id: "finn-life-eilat-party",
    inviteTitle: "🌴 מסיבת חוף באילת!",
    inviteSubtitle: "הים, המוזיקה, והלילה ארוך",
    ctaLabel: "בואו לרקוד איתי!",
    caption: "מסיבת חוף מההכנסה הפסיבית",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-eilat-beach",
    inviteTitle: "🏖️ חוף מוש, השתזפות",
    inviteSubtitle: "סלאשי קר, שמש חמה, אפס סטרס",
    ctaLabel: "בואו להשתזף!",
    caption: "חוף מוש על חשבון הדילים",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-eilat-mall-shop",
    inviteTitle: "🛍️ שופינג באייסמול",
    inviteSubtitle: "כשהדיבידנדים מגיעים, הולכים לקנות",
    ctaLabel: "בואו לשתף שקיות!",
    caption: "קניות מהכסף שהרווחתי במניות",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-eilat-mall-ice",
    inviteTitle: "⛸️ החלקה על הקרח",
    inviteSubtitle: "באמצע המדבר. רק באילת.",
    ctaLabel: "בואו להחליק!",
    caption: "החלקה על הקרח מהבונוס של ה-ETF",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-eilat-dolphins",
    inviteTitle: "🐬 ריף הדולפינים",
    inviteSubtitle: "צלילה עם החברים הכי טובים בים",
    ctaLabel: "בואו לצלול איתי!",
    caption: "צלילה עם דולפינים מהיעד שהשגתי",
    trimEnd: 0.5,
  },
];

export const LIFESTYLE_VIDEOS: LifestyleVideoSpec[] = LIFESTYLE_COPY.map((c) => ({
  id: c.id,
  videoUri: resolveVideoUri(c.id),
  inviteTitle: c.inviteTitle,
  inviteSubtitle: c.inviteSubtitle,
  ctaLabel: c.ctaLabel,
  caption: c.caption,
  trimEnd: c.trimEnd,
}));

/**
 * Pick the next lifestyle video, avoiding any id seen in the recent history.
 * Falls back to deterministic round-robin if all videos are recent.
 */
export function pickNextLifestyleVideo(seenIds: string[]): LifestyleVideoSpec {
  const unseen = LIFESTYLE_VIDEOS.filter((v) => !seenIds.includes(v.id));
  const pool = unseen.length > 0 ? unseen : LIFESTYLE_VIDEOS;
  const seed = seenIds.length;
  return pool[seed % pool.length];
}
