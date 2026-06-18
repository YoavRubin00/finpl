/**
 * Cloud tips loader. Bar pushes "טיפ של היום" cards to bar_content (type 'tip');
 * the app fetches them once per session and picks a fresh one on every pearl
 * open. Falls back to the bundled DAILY_TIPS whenever the cloud is empty or
 * unreachable, so the card is never blank. No persistence — a session-lived
 * in-memory cache is enough (tips refresh on next cold start).
 */
import { fetchBarContent, type BarContentItem } from '../../bar-content/barContentApi';
import { DAILY_TIPS, type DailyTip } from './dailyTipsData';

let cloudTips: DailyTip[] = [];
let loaded = false;
let inflight: Promise<void> | null = null;

function isTip(x: BarContentItem): x is BarContentItem & DailyTip {
  return typeof x.titleHe === 'string' && typeof x.bodyHe === 'string' && typeof x.tagHe === 'string';
}

/** Fetch + cache Bar's tips once. Safe to call repeatedly (dedupes in-flight). */
export async function loadBarTips(): Promise<void> {
  if (loaded) return;
  if (!inflight) {
    inflight = (async () => {
      const items = await fetchBarContent('tip');
      cloudTips = items.filter(isTip).map((it) => ({
        id: it.key,
        titleHe: it.titleHe,
        bodyHe: it.bodyHe,
        tagHe: it.tagHe,
      }));
      loaded = true;
      inflight = null;
    })();
  }
  await inflight;
}

export function hasBarTipsLoaded(): boolean {
  return loaded && cloudTips.length > 0;
}

/** Random tip — Bar's cloud set when available, else the bundled fallback. */
export function pickBarTip(): DailyTip {
  const pool = cloudTips.length > 0 ? cloudTips : DAILY_TIPS;
  return pool[Math.floor(Math.random() * pool.length)];
}
