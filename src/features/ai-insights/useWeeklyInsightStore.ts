import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';

export interface FreeInsight {
  emoji: string;
  title: string;
  body: string;
}

interface WeeklyInsightState {
  lastFetchedAt: string | null; // ISO date YYYY-MM-DD
  cachedInsight: FreeInsight | null;
  lastBannerShownAt: string | null; // ISO date YYYY-MM-DD
  bannerMessage: string | null;
  bannerMessageDate: string | null; // ISO date YYYY-MM-DD

  shouldRefetch: () => boolean;
  saveInsight: (insight: FreeInsight) => void;
  shouldShowBanner: (isPro: boolean) => boolean;
  markBannerShown: () => void;
  shouldRefetchBannerMessage: () => boolean;
  saveBannerMessage: (message: string) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useWeeklyInsightStore = create<WeeklyInsightState>()(
  persist(
    (set, get) => ({
      lastFetchedAt: null,
      cachedInsight: null,
      lastBannerShownAt: null,
      bannerMessage: null,
      bannerMessageDate: null,

      shouldRefetch: (): boolean => {
        const { lastFetchedAt } = get();
        if (!lastFetchedAt) return true;
        const daysSince = Math.floor(
          (Date.now() - new Date(lastFetchedAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSince >= 7;
      },

      saveInsight: (insight: FreeInsight) => {
        set({ cachedInsight: insight, lastFetchedAt: todayISO() });
      },

      shouldShowBanner: (isPro: boolean): boolean => {
        const { lastBannerShownAt } = get();
        if (!lastBannerShownAt) return true;
        const daysSince = Math.floor(
          (Date.now() - new Date(lastBannerShownAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        return isPro ? daysSince >= 1 : daysSince >= 7;
      },

      markBannerShown: () => {
        set({ lastBannerShownAt: todayISO() });
      },

      shouldRefetchBannerMessage: (): boolean => {
        const { bannerMessageDate } = get();
        if (!bannerMessageDate) return true;
        const daysSince = Math.floor(
          (Date.now() - new Date(bannerMessageDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSince >= 7;
      },

      saveBannerMessage: (message: string) => {
        set({ bannerMessage: message, bannerMessageDate: todayISO() });
      },
    }),
    {
      name: "weekly-insight-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        lastFetchedAt: state.lastFetchedAt,
        cachedInsight: state.cachedInsight,
        lastBannerShownAt: state.lastBannerShownAt,
        bannerMessage: state.bannerMessage,
        bannerMessageDate: state.bannerMessageDate,
      }),
    },
  ),
);