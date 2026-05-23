import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { BreakingNewsSummary } from './types';

/**
 * Client cache for the Breaking News tool. Two responsibilities:
 *   1. Mirror the server-side `breaking_news_tracked` + `summaries` so the
 *      tool screen can render instantly on cold start (server `list` fetch
 *      is a background refresh, not a blocker).
 *   2. Track per-ticker `lastReadDate` — the data behind the red dot on
 *      the hub card. Cleared as the user views each summary.
 *
 * Source of truth is Neon. This store is best-effort: if it disagrees
 * with the latest /list response, we trust the server and overwrite.
 */

export interface CachedTickerSummary {
  ticker: string;
  /** When the user first added this ticker (server timestamp). */
  addedAt: string;
  /** The summary blob — null when no summary has been generated yet. */
  summary: BreakingNewsSummary | null;
  /** The trading day of `summary` — `"YYYY-MM-DD"` in Israel time. */
  tradingDay: string | null;
  /** ISO timestamp of when the cron created the row. */
  generatedAt: string | null;
}

interface BreakingNewsState {
  items: CachedTickerSummary[];
  /** Trading day reported by the server on the last successful /list. */
  serverTradingDay: string | null;
  /** Per-ticker last day the user opened the card. */
  lastReadDate: Record<string, string>;
  /** Replace the local mirror after a server /list. */
  setItems: (items: CachedTickerSummary[], tradingDay: string) => void;
  /** Local-only add — used optimistically before the server POST completes. */
  addLocal: (ticker: string) => void;
  /** Local-only remove — paired with the DELETE call. */
  removeLocal: (ticker: string) => void;
  /** Mark a ticker as read for today — clears its red dot. */
  markRead: (ticker: string) => void;
  /** True when at least one tracked ticker has a fresher summary than the
   *  user has read. Drives the red dot on the hub card. */
  hasUnreadToday: () => boolean;
}

export const useBreakingNewsStore = create<BreakingNewsState>()(
  persist(
    (set, get) => ({
      items: [],
      serverTradingDay: null,
      lastReadDate: {},

      setItems: (items, tradingDay) =>
        set({ items, serverTradingDay: tradingDay }),

      addLocal: (ticker) =>
        set((s) => {
          if (s.items.some((it) => it.ticker === ticker)) return {};
          return {
            items: [
              ...s.items,
              {
                ticker,
                addedAt: new Date().toISOString(),
                summary: null,
                tradingDay: null,
                generatedAt: null,
              },
            ],
          };
        }),

      removeLocal: (ticker) =>
        set((s) => ({
          items: s.items.filter((it) => it.ticker !== ticker),
          lastReadDate: Object.fromEntries(
            Object.entries(s.lastReadDate).filter(([k]) => k !== ticker),
          ),
        })),

      markRead: (ticker) =>
        set((s) => {
          const item = s.items.find((it) => it.ticker === ticker);
          if (!item?.tradingDay) return {};
          return { lastReadDate: { ...s.lastReadDate, [ticker]: item.tradingDay } };
        }),

      hasUnreadToday: () => {
        const { items, lastReadDate, serverTradingDay } = get();
        if (!serverTradingDay) return false;
        return items.some(
          (it) =>
            it.tradingDay === serverTradingDay &&
            lastReadDate[it.ticker] !== serverTradingDay,
        );
      },
    }),
    {
      name: 'breaking-news-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        items: s.items,
        serverTradingDay: s.serverTradingDay,
        lastReadDate: s.lastReadDate,
      }),
    },
  ),
);
