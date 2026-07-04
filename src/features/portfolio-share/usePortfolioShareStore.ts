import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { tokenStore } from '../../lib/auth/secureStore';
import { useAuthStore } from '../auth/useAuthStore';
import {
  SHARE_REWARD_COINS,
  RATE_REWARD_COINS,
  RATE_REWARD_DAILY_CAP,
} from './portfolioShareData';
import type { SharedPick } from './portfolioShareTypes';
import {
  fetchPortfolioFeed,
  sharePortfolioApi,
  ratePortfolioApi,
  toggleLikeApi,
  addCommentApi,
  reportContentApi,
  blockUserApi,
  type RatedPortfolio,
  type RatedPick,
} from '../../db/sync/syncPortfolioShare';

/**
 * Server-backed community portfolio feed (Yoav 2026-07-03). Replaces the old
 * device-local store: the feed, ratings, likes and comments are ALL real and
 * shared via /api/portfolio-share/feed. This store is a thin client cache + the
 * once-per-day / once-per-portfolio COIN-reward bookkeeping (the only thing
 * persisted — the feed itself always comes fresh from the server).
 */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function grantCoins(amount: number): void {
  if (amount <= 0) return;
  try {
    // EconomyUI store fires the animated coin counter, not just the balance.
    const economyMod = require('../economy/useEconomyUIStore');
    economyMod.useEconomyUIStore.getState().addCoins(amount);
  } catch {
    /* economy store unavailable — skip */
  }
}

/** Resolve the caller's auth, or null for a guest (who must register first). */
async function resolveAuth(): Promise<{ authId: string; syncToken: string | null } | null> {
  const email = useAuthStore.getState().email;
  if (!email) return null;
  const syncToken = await tokenStore.get();
  return { authId: email, syncToken };
}

function toRatedPicks(picks: SharedPick[]): RatedPick[] {
  return picks.map((p) => ({
    ticker: p.ticker,
    sector: p.sector,
    allocationPct: p.allocationPct,
    isLeverage: p.isLeverage === true,
  }));
}

interface PortfolioShareState {
  portfolios: RatedPortfolio[];
  loading: boolean;
  loaded: boolean;

  // ── Reward bookkeeping (persisted) ──
  shareRewardDate: string | null;
  ratedRewardIds: string[];
  rateRewardDate: string | null;
  rateRewardCount: number;

  /** Pull the fresh feed from the server. No-op (empty) for guests. */
  refresh: () => Promise<void>;
  /** Share a portfolio. Returns the new post + any coin reward (0 if none). */
  share: (input: {
    picks: SharedPick[];
    caption: string;
    displayName: string;
    avatarId: string | null;
  }) => Promise<{ portfolio: RatedPortfolio | null; rewardCoins: number }>;
  /** Set/change your star rating. Returns recomputed aggregate + coin reward. */
  rate: (
    portfolioId: string,
    stars: number,
  ) => Promise<{ ratingAvg: number | null; ratingCount: number; yourRating: number; rewardCoins: number } | null>;
  toggleLike: (portfolioId: string) => Promise<void>;
  addComment: (portfolioId: string, body: string, displayName: string, avatarId: string | null) => Promise<void>;
  /** Report a portfolio or comment as objectionable (Apple 1.2). Removes it locally. */
  report: (target: { type: 'portfolio' | 'comment'; id: string; portfolioId?: string }) => Promise<boolean>;
  /** Block a user — hides all their content, then refreshes the block-filtered feed. */
  blockUser: (targetUserId: string) => Promise<boolean>;
}

export const usePortfolioShareStore = create<PortfolioShareState>()(
  persist(
    (set, get) => ({
      portfolios: [],
      loading: false,
      loaded: false,
      shareRewardDate: null,
      ratedRewardIds: [],
      rateRewardDate: null,
      rateRewardCount: 0,

      refresh: async () => {
        const auth = await resolveAuth();
        if (!auth) {
          set({ portfolios: [], loading: false, loaded: true });
          return;
        }
        set({ loading: true });
        try {
          const { portfolios } = await fetchPortfolioFeed(auth);
          set({ portfolios, loading: false, loaded: true });
        } catch {
          set({ loading: false, loaded: true });
        }
      },

      share: async ({ picks, caption, displayName, avatarId }) => {
        const auth = await resolveAuth();
        if (!auth) return { portfolio: null, rewardCoins: 0 };
        let portfolio: RatedPortfolio | null = null;
        try {
          portfolio = await sharePortfolioApi({
            ...auth,
            picks: toRatedPicks(picks),
            caption,
            displayName,
            avatarId,
          });
        } catch {
          return { portfolio: null, rewardCoins: 0 };
        }
        // Prepend optimistically so the user sees their post immediately.
        set((state) => ({ portfolios: [portfolio as RatedPortfolio, ...state.portfolios] }));

        const today = todayISO();
        let rewardCoins = 0;
        if (get().shareRewardDate !== today) {
          rewardCoins = SHARE_REWARD_COINS;
          set({ shareRewardDate: today });
          grantCoins(SHARE_REWARD_COINS);
        }
        return { portfolio, rewardCoins };
      },

      rate: async (portfolioId, stars) => {
        const auth = await resolveAuth();
        if (!auth) return null;
        let result: { ratingAvg: number | null; ratingCount: number; yourRating: number };
        try {
          result = await ratePortfolioApi({ ...auth, portfolioId, stars });
        } catch {
          return null;
        }
        // Update only THIS portfolio's server-truthful aggregate (never a
        // locally-invented average).
        set((state) => ({
          portfolios: state.portfolios.map((pf) =>
            pf.id === portfolioId
              ? {
                  ...pf,
                  ratingAvg: result.ratingAvg,
                  ratingCount: result.ratingCount,
                  yourRating: result.yourRating,
                }
              : pf,
          ),
        }));

        // Coin reward — first rating of THIS portfolio only, under a daily cap.
        const today = todayISO();
        const s = get();
        const countToday = s.rateRewardDate === today ? s.rateRewardCount : 0;
        let rewardCoins = 0;
        if (!s.ratedRewardIds.includes(portfolioId) && countToday < RATE_REWARD_DAILY_CAP) {
          rewardCoins = RATE_REWARD_COINS;
          set({
            ratedRewardIds: [...s.ratedRewardIds, portfolioId].slice(-500),
            rateRewardDate: today,
            rateRewardCount: countToday + 1,
          });
          grantCoins(RATE_REWARD_COINS);
        }
        return { ...result, rewardCoins };
      },

      toggleLike: async (portfolioId) => {
        const auth = await resolveAuth();
        if (!auth) return;
        // Optimistic flip.
        set((state) => ({
          portfolios: state.portfolios.map((pf) =>
            pf.id === portfolioId
              ? { ...pf, likedByYou: !pf.likedByYou, likeCount: Math.max(0, pf.likeCount + (pf.likedByYou ? -1 : 1)) }
              : pf,
          ),
        }));
        try {
          const res = await toggleLikeApi({ ...auth, portfolioId });
          set((state) => ({
            portfolios: state.portfolios.map((pf) =>
              pf.id === portfolioId ? { ...pf, likedByYou: res.likedByYou, likeCount: res.likeCount } : pf,
            ),
          }));
        } catch {
          // Revert on failure.
          set((state) => ({
            portfolios: state.portfolios.map((pf) =>
              pf.id === portfolioId
                ? { ...pf, likedByYou: !pf.likedByYou, likeCount: Math.max(0, pf.likeCount + (pf.likedByYou ? -1 : 1)) }
                : pf,
            ),
          }));
        }
      },

      addComment: async (portfolioId, body, displayName, avatarId) => {
        const auth = await resolveAuth();
        if (!auth) return;
        const text = body.trim();
        if (!text) return;
        try {
          const comment = await addCommentApi({ ...auth, portfolioId, body: text, displayName, avatarId });
          set((state) => ({
            portfolios: state.portfolios.map((pf) =>
              pf.id === portfolioId
                ? { ...pf, comments: [...pf.comments, comment], commentCount: pf.commentCount + 1 }
                : pf,
            ),
          }));
        } catch {
          /* network failure — comment not added */
        }
      },

      report: async (target) => {
        const auth = await resolveAuth();
        if (!auth) return false;
        try {
          await reportContentApi({ ...auth, targetType: target.type, targetId: target.id });
        } catch {
          return false;
        }
        // Optimistically remove the reported item for THIS user immediately —
        // they flagged it, so they stop seeing it now (server auto-hides for
        // everyone once enough distinct users report it).
        set((state) => {
          if (target.type === 'portfolio') {
            return { portfolios: state.portfolios.filter((pf) => pf.id !== target.id) };
          }
          return {
            portfolios: state.portfolios.map((pf) =>
              pf.id === target.portfolioId
                ? {
                    ...pf,
                    comments: pf.comments.filter((c) => c.id !== target.id),
                    commentCount: Math.max(0, pf.commentCount - 1),
                  }
                : pf,
            ),
          };
        });
        return true;
      },

      blockUser: async (targetUserId) => {
        const auth = await resolveAuth();
        if (!auth) return false;
        try {
          await blockUserApi({ ...auth, targetUserId });
        } catch {
          return false;
        }
        // Drop their portfolios from view immediately; the refresh pulls the
        // fully block-filtered feed (also strips their comments elsewhere).
        set((state) => ({ portfolios: state.portfolios.filter((pf) => pf.authorUserId !== targetUserId) }));
        void get().refresh();
        return true;
      },
    }),
    {
      name: 'portfolio-share-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Persist ONLY the reward bookkeeping — the feed always comes from the server.
      partialize: (state) => ({
        shareRewardDate: state.shareRewardDate,
        ratedRewardIds: state.ratedRewardIds,
        rateRewardDate: state.rateRewardDate,
        rateRewardCount: state.rateRewardCount,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.ratedRewardIds)) state.ratedRewardIds = [];
      },
    },
  ),
);
