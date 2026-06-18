/**
 * Cloud VS questions loader. Bar pushes binary "wisdom of crowds" dilemmas to
 * bar_content (type 'poll'); the app fetches + caches them so the store can
 * pick from Bar's live set instead of the bundled CROWD_QUESTIONS. Votes + live
 * percentages are unchanged (still crowd_question_votes via syncCrowdQuestion).
 * Session-lived in-memory cache; falls back to local when empty/unreachable.
 */
import { fetchBarContent, type BarContentItem } from '../bar-content/barContentApi';
import type {
  CrowdOption,
  CrowdQuestion,
  CrowdQuestionTermExplanation,
  Sentiment,
  Timing,
  Topic,
} from './types';

let cloudPolls: CrowdQuestion[] = [];
let loaded = false;
let inflight: Promise<void> | null = null;

const SENTIMENTS: readonly Sentiment[] = ['green', 'red', 'yes', 'no'];
// Must satisfy the vote endpoint's QUESTION_ID_RE.
const ID_RE = /^[a-z0-9-]{1,80}$/i;

function toOption(raw: unknown, fallbackId: 'a' | 'b'): CrowdOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label : '';
  if (!label) return null;
  const id = o.id === 'a' || o.id === 'b' ? o.id : fallbackId;
  const sentiment = SENTIMENTS.includes(o.sentiment as Sentiment) ? (o.sentiment as Sentiment) : 'green';
  const emoji = typeof o.emoji === 'string' ? o.emoji : undefined;
  return { id, label, sentiment, emoji };
}

/** termExplanation may arrive as a plain string (Bar) or {title, body}. */
function toTermExplanation(raw: unknown): CrowdQuestionTermExplanation | undefined {
  if (typeof raw === 'string' && raw.trim()) {
    return { title: 'מה זה אומר?', body: raw.trim() };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (typeof o.body === 'string' && o.body.trim()) {
      return { title: typeof o.title === 'string' ? o.title : 'מה זה אומר?', body: o.body.trim() };
    }
  }
  return undefined;
}

function toQuestion(item: BarContentItem): CrowdQuestion | null {
  const id = typeof item.id === 'string' && ID_RE.test(item.id) ? item.id : item.key;
  if (!ID_RE.test(id)) return null;
  const text = typeof item.text === 'string' ? item.text : '';
  if (!text) return null;

  const opts = Array.isArray(item.options) ? item.options : [];
  const a = toOption(opts[0], 'a');
  const b = toOption(opts[1], 'b');
  if (!a || !b) return null;

  const bp = Array.isArray(item.baselinePct) ? item.baselinePct : [50, 50];
  const baselinePct: [number, number] = [Number(bp[0]) || 50, Number(bp[1]) || 50];
  const baselineN = Number(item.baselineN) || 0;

  const tagsRaw = (item.tags && typeof item.tags === 'object' ? item.tags : {}) as Record<string, unknown>;
  const tags = {
    timing: (tagsRaw.timing as Timing) ?? 'evergreen',
    topic: (tagsRaw.topic as Topic) ?? 'macro',
  };

  return {
    id,
    text,
    termExplanation: toTermExplanation(item.termExplanation),
    options: [a, b],
    baselinePct,
    baselineN,
    tags,
  };
}

/** Fetch + cache Bar's VS questions once. Safe to call repeatedly. */
export async function loadCloudPolls(): Promise<void> {
  if (loaded) return;
  if (!inflight) {
    inflight = (async () => {
      const items = await fetchBarContent('poll');
      cloudPolls = items.map(toQuestion).filter((q): q is CrowdQuestion => q !== null);
      loaded = true;
      inflight = null;
    })();
  }
  await inflight;
}

/** Bar's cloud questions, or [] when none loaded (callers fall back to local). */
export function getCloudPolls(): CrowdQuestion[] {
  return cloudPolls;
}
