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

/** Daisy talking loop — animated WebP. Used during `playing` phase only.
 *  @deprecated The metadata-encoded loop in this WebP freezes on the last
 *  frame in expo-image on Android (loopCount=1 bug), so the visible bubble
 *  animation inside it "snaps" back to start every cycle. Prefer
 *  DAISY_TALKING_VIDEO_MP4 below, played via expo-video which has reliable
 *  native loop support. Kept here as a fallback. */
export const DAISY_TALKING_WEBP = {
  uri: `${BLOB_BASE}/daisy-talking.webp`,
} as const;

/** Daisy talking loop — 3-second mp4 video. The video starts AND ends on the
 *  exact same frame (generated via kling3_0 with start_image=end_image), so
 *  expo-video can loop it indefinitely with NO visible seam. The character
 *  is rendered on a transparent background (no studio walls, no bubbles) so
 *  the surrounding bubble layer in PodcastSegmentScreen can flow freely
 *  underneath without competing with the video's internal animation.
 *
 *  Why not WebP? WebP loop metadata is unreliable in expo-image on Android.
 *  mp4 + expo-video is more robust and produces smaller file sizes than an
 *  equivalent-quality animated WebP. Bundled as a remote CloudFront URL —
 *  warmed in PodcastIntroCard via Asset.fromURI(...).downloadAsync(). */
export const DAISY_TALKING_VIDEO_MP4 =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3Ag7CTqAcygcnLQdO6PuD3qQkb9/hf_20260521_183453_9047d06d-f4cd-4619-9f6a-478d4985b4bf.mp4';

/** Daisy in a full celebration loop on a transparent background — closes
 *  eyes, opens mouth wide, raises both fins, blue sparkle stars pop around
 *  her. ~5s loop @ 15fps, chroma-keyed from a Higgsfield seedance video.
 *  Used in contexts that compose her over their own gradient (e.g.
 *  couple-dilemma feedback wise=true) where the podcast studio scenery
 *  would clash. Bundled locally (assets/webp/daisy/) so feedback appears
 *  instantly without waiting on Vercel Blob. */
export const DAISY_HAPPY_CELEBRATE_WEBP =
  require("../../../assets/webp/daisy/daisy-happy-celebrate.webp") as number;

/** Daisy in a gentle empathic idle — eyes softly open, small closed-lip
 *  smile, fin to chin in a thinking gesture. ~5s loop @ 15fps on a fully
 *  transparent background. Used on couple-dilemma feedback wise=false
 *  (the "נקודה למחשבה" path) so an unwise pick gets a compassionate
 *  reaction instead of the celebration. */
export const DAISY_EMPATHIC_WEBP =
  require("../../../assets/webp/daisy/daisy-empathic.webp") as number;

/** Daisy default neutral pose — fins relaxed at sides, soft closed-lip
 *  smile. 2-frame blink loop (3s open / 140ms closed = natural ~1 blink
 *  every ~3s) on a fully transparent background, ~28 KB. Use as her
 *  resting state — alongside non-reactive UI or wherever a static mascot
 *  would feel dead. Mirrors fin-standard for Captain Shark but with life. */
export const DAISY_STANDARD_WEBP =
  require("../../../assets/webp/daisy/daisy-standard.webp") as number;
