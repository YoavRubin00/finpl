import { getApiBase } from '../apiBase';
import type { JournalEvent } from '../../features/investors-journal/journalTypes';

/** Fetch the month's REAL, curated journal events (YYYY-MM). */
export async function fetchJournalEventsApi(month: string): Promise<JournalEvent[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/journal/events?month=${encodeURIComponent(month)}`);
  if (!res.ok) throw new Error(`journal events GET failed: ${res.status}`);
  const data = (await res.json()) as { ok: boolean; events?: JournalEvent[] };
  return data.events ?? [];
}
