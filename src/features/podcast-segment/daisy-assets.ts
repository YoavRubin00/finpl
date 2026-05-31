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

/** Daisy talking loop — original animated WebP from Vercel Blob. Has a
 *  known imperfection: the bubble animation baked into the WebP "snaps"
 *  back when the loop restarts (Android loopCount=1 metadata quirk). We
 *  tried replacing this with a ffmpeg-generated V2 WebP but its frame
 *  structure crashed expo-image on device; the V2 assets are saved on
 *  disk for later experimentation but not bundled. This original asset
 *  ships and works on both platforms — preferred until we can build a
 *  cleaner replacement via cwebp -anim or a similar pipeline. */
export const DAISY_TALKING_WEBP = {
  uri: `${BLOB_BASE}/daisy-talking.webp`,
} as const;

/** Daisy talking loop V2 — animated WebP with true alpha channel,
 *  chroma-keyed from a kling3_0 green-screen video. start_image===end_image
 *  in generation + ffmpeg `-loop 0` → seamless infinite loop. 600×600,
 *  15fps, 3s, ~660KB. Served from Vercel Blob (not bundled locally) so the
 *  user's existing dev client picks it up at runtime without a rebuild. */
export const DAISY_TALKING_WEBP_V2 = {
  uri: `${BLOB_BASE}/daisy-talking-v2.webp`,
} as const;

/** Podcast studio background V2 — PNG of the empty room (acoustic panels,
 *  ON AIR sign, lighting). No character, no bubbles, no microphone — Daisy
 *  renders on top via DAISY_TALKING_WEBP_V2. 1024×1024 ~1.7MB. Served from
 *  Vercel Blob for the same dev-client compatibility reason. */
export const PODCAST_STUDIO_BG_V2 = {
  uri: `${BLOB_BASE}/podcast-studio-bg-v2.png`,
} as const;

/** Daisy in a full celebration loop on a transparent background — closes
 *  eyes, opens mouth wide, raises both fins, blue sparkle stars pop around
 *  her. ~5s loop @ 15fps, chroma-keyed from a Higgsfield seedance video.
 *  Served from Vercel Blob (uploaded 2026-05-22, re-uploaded at 512×512
 *  on 2026-06-01 — 2× sharper on retina screens). The ?v= query string
 *  busts expo-image's URL cache so existing installs fetch the new asset
 *  on next launch without needing an EAS rebuild. */
export const DAISY_HAPPY_CELEBRATE_WEBP = {
  uri: `${BLOB_BASE}/daisy-happy-celebrate.webp?v=2026-06-01`,
} as const;

/** Daisy in a gentle empathic idle — eyes softly open, small closed-lip
 *  smile, fin to chin in a thinking gesture. ~5s loop @ 15fps on a fully
 *  transparent background. Used on couple-dilemma feedback wise=false
 *  (the "נקודה למחשבה" path) so an unwise pick gets a compassionate
 *  reaction instead of the celebration. Served from Vercel Blob. */
export const DAISY_EMPATHIC_WEBP = {
  uri: `${BLOB_BASE}/daisy-empathic.webp`,
} as const;

/** Daisy default neutral pose — fins relaxed at sides, soft closed-lip
 *  smile. 2-frame blink loop (3s open / 140ms closed = natural ~1 blink
 *  every ~3s) on a fully transparent background, ~28 KB. Use as her
 *  resting state. Served from Vercel Blob. */
export const DAISY_STANDARD_WEBP = {
  uri: `${BLOB_BASE}/daisy-standard.webp`,
} as const;
