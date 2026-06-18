/**
 * Client wrapper around GET /api/bar/content — Bar's cloud-managed content
 * (tips / VS polls / CTAs). Read-only, shared across users, no auth (mirrors
 * fetchTodayChallenge). Returns [] on any failure so callers fall back to their
 * local content set.
 */
import { getApiBase } from '../../db/apiBase';

export type BarContentType = 'tip' | 'poll' | 'cta';

/** Each item is the row's payload plus its stable `key`. Shape depends on type. */
export type BarContentItem = { key: string } & Record<string, unknown>;

interface BarContentResponse {
  ok: boolean;
  items?: BarContentItem[];
}

export async function fetchBarContent(type: BarContentType): Promise<BarContentItem[]> {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/bar/content?type=${type}`);
    if (!res.ok) return [];
    const data = (await res.json()) as BarContentResponse;
    return data.ok && Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
