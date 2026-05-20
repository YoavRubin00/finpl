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
 * Each lifestyle video is mirrored to Vercel Blob at the canonical URL
 * `${FINN_VIDEO_BLOB_BASE}/${id}.mp4`. Generation tooling under `scripts/`
 * (gitignored) writes the file; this module just constructs the URL.
 */

const FINN_VIDEO_BLOB_BASE =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos";

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
  /** When true, the video is shown at most once per user across the entire
   *  app lifecycle. Used for limited-edition / atmosphere clips that should
   *  feel special rather than rotate back into the pool. */
  oneShot?: boolean;
}

function resolveVideoUri(id: string): string {
  return `${FINN_VIDEO_BLOB_BASE}/${id}.mp4`;
}

interface LifestyleCopy {
  id: string;
  inviteTitle: string;
  inviteSubtitle: string;
  ctaLabel: string;
  caption: string;
  trimEnd?: number;
  oneShot?: boolean;
}

const LIFESTYLE_COPY: LifestyleCopy[] = [
  {
    id: "finn-life-ski",
    inviteTitle: "🎿 חופשת סקי עם הקפטן!",
    inviteSubtitle: "צריך לדעת גם לנוח",
    ctaLabel: "בואו לקפוץ איתי!",
    caption: "סקי בחופשה",
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
    caption: "וואל טורנס מרווחי המדדים",
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
    caption: "אני מחכה ששאר האנשים בארץ יגלו את המשחק הזה",
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
    caption: "החלקה על הקרח מבונוס המדדים",
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
  // ── Viral Instagram series ──
  {
    id: "finn-life-nyc-rooftop",
    inviteTitle: "🗽 גג מנהטן — הקפטן חוגג!",
    inviteSubtitle: "כשהתיק עולה, עולים לגג",
    ctaLabel: "בואו לחגוג!",
    caption: "חגיגת החירות הפיננסית על גגות NYC",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-gym-flex",
    inviteTitle: "💪 פלקס של הקפטן!",
    inviteSubtitle: "הגוף חזק כמו התיק שלך",
    ctaLabel: "בואו להתאמן!",
    caption: "חדר כושר מהמנוי שהדיבידנדים שילמו",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-treasure",
    inviteTitle: "💰 מצאנו את האוצר!",
    inviteSubtitle: "הים מלא הפתעות — כמו שוק ההון",
    ctaLabel: "בואו לחפור!",
    caption: "ארגז זהב — כמו קרן השתלמות שנפתחה",
    trimEnd: 0.5,
  },
  {
    id: "finn-life-paris-cafe",
    inviteTitle: "☕ קפה בפריז עם הקפטן",
    inviteSubtitle: "גשם בחוץ, רגוע בפנים",
    ctaLabel: "בואו לשתות קפה!",
    caption: "קפה בפריז מהריבית של חשבון החיסכון",
    trimEnd: 0.5,
  },
  // ── Limited-edition atmosphere clip — shown at most once per user ──
  {
    id: "finn-life-vibe-2026-05",
    inviteTitle: "🌊 רגע איתי באוקיינוס",
    inviteSubtitle: "כי גם הקפטן צריך לעצור לרגע",
    ctaLabel: "בואו לראות!",
    caption: "ויב של היום — מתנה ממני אליכם",
    trimEnd: 0.5,
    oneShot: true,
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
  oneShot: c.oneShot,
}));

/**
 * Pick the next lifestyle video, avoiding any id seen in the recent history
 * and skipping any oneShot video the user has already seen (ever).
 *
 * If a oneShot video is in the eligible pool, give it a 50% chance to win the
 * slot — that way limited-edition clips feel like a special drop rather than
 * a guaranteed next-up, but they still surface within a few break cycles.
 *
 * Falls back to deterministic round-robin over the standard (non-oneShot)
 * pool if everything recent has been seen.
 */
export function pickNextLifestyleVideo(
  seenIds: string[],
  oneShotSeenIds: string[] = [],
): LifestyleVideoSpec {
  const eligible = LIFESTYLE_VIDEOS.filter(
    (v) => !(v.oneShot && oneShotSeenIds.includes(v.id)),
  );
  const unseen = eligible.filter((v) => !seenIds.includes(v.id));
  const pool = unseen.length > 0 ? unseen : eligible;

  // Prefer a oneShot when one's eligible — it's a limited drop, surface it
  // sooner rather than letting it sit at the back of the rotation.
  const oneShotCandidate = pool.find((v) => v.oneShot);
  if (oneShotCandidate && Math.random() < 0.5) {
    return oneShotCandidate;
  }

  const standardPool = pool.filter((v) => !v.oneShot);
  const finalPool = standardPool.length > 0 ? standardPool : pool;
  const seed = seenIds.length;
  return finalPool[seed % finalPool.length];
}
