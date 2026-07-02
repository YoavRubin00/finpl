import { create } from 'zustand';
import { getApiBase } from '../../db/apiBase';

/**
 * Live weekly returns for the fantasy league — real Yahoo data fetched via
 * /api/market/weekly-returns. Session-only cache (not persisted): consumers
 * read synchronously through getLiveWeeklyReturn() and fall back to the
 * deterministic simulation while empty/offline.
 */

const REFRESH_MS = 10 * 60 * 1000;

interface LiveReturnsState {
  returns: Record<string, number>;
  fetchedAt: number | null;
  loading: boolean;
  refresh: (tickers: string[]) => Promise<void>;
}

export const useLiveReturnsStore = create<LiveReturnsState>((set, get) => ({
  returns: {},
  fetchedAt: null,
  loading: false,

  refresh: async (tickers: string[]) => {
    const { fetchedAt, loading } = get();
    if (loading) return;
    if (fetchedAt && Date.now() - fetchedAt < REFRESH_MS) return;
    if (tickers.length === 0) return;

    set({ loading: true });
    try {
      const base = getApiBase();
      const res = await fetch(
        `${base}/api/market/weekly-returns?tickers=${encodeURIComponent(tickers.join(','))}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; returns: Record<string, number | null> };
      if (!data.ok) return;
      const clean: Record<string, number> = {};
      for (const [ticker, value] of Object.entries(data.returns)) {
        if (typeof value === 'number' && isFinite(value)) clean[ticker] = value;
      }
      set({ returns: { ...get().returns, ...clean }, fetchedAt: Date.now() });
    } catch {
      /* offline — simulation fallback keeps the league alive */
    } finally {
      set({ loading: false });
    }
  },
}));

/** Sync read: live value when we have one, otherwise null (caller falls back). */
export function getLiveWeeklyReturn(ticker: string): number | null {
  const value = useLiveReturnsStore.getState().returns[ticker];
  return typeof value === 'number' ? value : null;
}
