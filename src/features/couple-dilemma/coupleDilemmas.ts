/**
 * Runtime CoupleDilemmaSegment records, built from drafts + generated audio URLs.
 *
 * Video URLs follow the established convention from
 * src/features/inter-module-break/lifestyleVideoConfig.ts:
 *   https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/{id}.mp4
 *
 * Audio URLs come from couple-urls.generated.json (output of
 * scripts/generate-couple-narrations.ts).
 */
import type { CoupleDilemmaSegment } from '../chapter-1-content/types';
import { COUPLE_DILEMMA_DRAFTS } from './couple-dilemma-drafts';
import audioUrls from './couple-urls.generated.json';

const FINN_VIDEO_BLOB_BASE =
  'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos';

const audioById = audioUrls as Record<string, string>;

function buildSegments(): CoupleDilemmaSegment[] {
  return COUPLE_DILEMMA_DRAFTS.map((d) => {
    const narrationAudioUri = audioById[d.id];
    if (!narrationAudioUri) {
      throw new Error(
        `[coupleDilemmas] missing narration audio URL for ${d.id}. ` +
          `Run \`npx tsx scripts/generate-couple-narrations.ts\` first.`,
      );
    }
    return {
      id: d.id,
      videoUri: `${FINN_VIDEO_BLOB_BASE}/${d.videoBlobId}.mp4`,
      narrationAudioUri,
      caption: d.caption,
      scenario: d.scenario,
      optionA: d.optionA,
      optionB: d.optionB,
    };
  });
}

const segments = buildSegments();
const byId: Record<string, CoupleDilemmaSegment> = {};
for (const s of segments) byId[s.id] = s;

export const COUPLE_DILEMMAS = byId as Readonly<Record<string, CoupleDilemmaSegment>>;

/** Mapping from `module.id` → couple dilemma id. */
export const MODULE_TO_COUPLE_DILEMMA: Readonly<Record<string, string>> = {
  // Chapter 0 — בסיס
  // After the 2026-05-30 chapter-0 swap, "מושגי יסוד פיננסיים" lives at
  // mod-0-1 (was mod-0-2). The wine-receipt couple dilemma is anchored
  // to that topic so it follows the content to mod-0-1.
  'mod-0-1': 'cd-wine-receipt',       // מושגי יסוד — חשבון יין כדוגמת תזרים
  'mod-0-4': 'cd-cafe-bill',          // כמה נכנס וכמה יוצא — הוצאות חוזרות זוגיות
  // Chapter 2 — הגנה ופיננסים
  'mod-2-13': 'cd-vacation-brochure', // קרן השתלמות — מצוטט בקריינות
  // Chapter 3 — יציבות
  'mod-3-16': 'cd-engagement-ring',   // הפסיכולוגיה של הכסף — רגש מול ראש קר
  // Chapter 5 — חופש כלכלי
  'mod-5-27': 'cd-dream-apartment',   // נדל"ן בשלט רחוק — בחירת דירה
};

/** Returns the couple dilemma for a given module id, or undefined. */
export function getCoupleDilemmaForModule(
  moduleId: string,
): CoupleDilemmaSegment | undefined {
  const cid = MODULE_TO_COUPLE_DILEMMA[moduleId];
  return cid ? COUPLE_DILEMMAS[cid] : undefined;
}
