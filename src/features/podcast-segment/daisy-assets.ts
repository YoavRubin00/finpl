/**
 * Daisy mascot asset URLs (uploaded to Vercel Blob).
 * Generated via Higgsfield (nano_banana_2 for stills, seedance_2_0 for talking video).
 */

const BLOB_BASE =
  'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/daisy';

export type DaisyPose =
  | 'mic'
  | 'standard'
  | 'happy'
  | 'empathic'
  | 'listening';

export const DAISY_ASSETS: Readonly<Record<DaisyPose, { uri: string }>> = {
  mic: { uri: `${BLOB_BASE}/daisy-mic.png` },
  standard: { uri: `${BLOB_BASE}/daisy-standard.png` },
  happy: { uri: `${BLOB_BASE}/daisy-happy.png` },
  empathic: { uri: `${BLOB_BASE}/daisy-empathic.png` },
  listening: { uri: `${BLOB_BASE}/daisy-listening.png` },
} as const;

export const PODCAST_STUDIO_BG = {
  uri: `${BLOB_BASE}/podcast-studio-bg.png`,
} as const;

/** Daisy talking loop — animated WebP. Used during `playing` phase only. */
export const DAISY_TALKING_WEBP = {
  uri: `${BLOB_BASE}/daisy-talking.webp`,
} as const;

/** Daisy in a full celebration loop on a transparent background — closes
 *  eyes, opens mouth wide, raises both fins, blue sparkle stars pop around
 *  her. ~5s loop @ 15fps, chroma-keyed from a Higgsfield seedance video.
 *  Used in contexts that compose her over their own gradient (e.g.
 *  couple-dilemma feedback) where the podcast studio scenery would clash. */
export const DAISY_HAPPY_CELEBRATE_WEBP = {
  uri: `${BLOB_BASE}/daisy-happy-celebrate.webp`,
} as const;
