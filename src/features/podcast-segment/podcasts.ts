/**
 * Final `PodcastSegment` records, ready to attach to a Module via `module.podcast`.
 * Built from `podcast-scripts.ts` (content) + `podcast-urls.generated.json` (audio URLs).
 */
import type { PodcastSegment } from '../chapter-1-content/types';
import { PODCAST_DRAFTS, buildPodcasts } from './podcast-scripts';
import podcastUrls from './podcast-urls.generated.json';

const segments = buildPodcasts(podcastUrls as Record<string, string>);

const byId: Record<string, PodcastSegment> = {};
for (const s of segments) byId[s.id] = s;

export const PODCASTS = byId as Readonly<Record<string, PodcastSegment>>;

/** Mapping from `module.id` → podcast id (used by chapter data files). */
export const MODULE_TO_PODCAST: Readonly<Record<string, string>> = {
  // Chapter 0 — מבוא
  'mod-0-3': 'pod-11-inflation',       // הגנב השקוף: אינפלציה
  'mod-0-5': 'pod-12-startinvesting',  // אז למה להשקיע?
  // Chapter 1 — יסודות
  'mod-1-3': 'pod-1-credit',       // אשראי
  'mod-1-8': 'pod-2-bnpl',         // מלכודות שיווקיות
  'mod-1-9': 'pod-3-emergency',    // קרן חירום
  'mod-1-4': 'pod-4-firstsalary',  // תזרים ותקציב
  'mod-1-6': 'pod-5-lending',      // הלוואות צרכניות
  'mod-1-2': 'pod-6-travel',       // מלכודת המינוס
  'mod-1-5': 'pod-9-salary',       // לקרוא תלוש שכר
  // Chapter 3 — יציבות
  'mod-3-16': 'pod-7-status',      // הפסיכולוגיה של הכסף
  // Chapter 5 — חופש כלכלי
  'mod-5-30': 'pod-8-fomo',        // קריפטו
  'mod-5-26': 'pod-10-mortgage',   // נדל"ן ומשכנתא
};

/** Returns the podcast segment for a given module id, or undefined. */
export function getPodcastForModule(moduleId: string): PodcastSegment | undefined {
  const pid = MODULE_TO_PODCAST[moduleId];
  return pid ? PODCASTS[pid] : undefined;
}

export { PODCAST_DRAFTS };
