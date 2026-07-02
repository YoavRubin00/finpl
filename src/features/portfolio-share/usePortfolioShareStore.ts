import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { SharedPick, SharedPortfolio, PortfolioComment } from './portfolioShareTypes';
import {
  SEED_PORTFOLIOS,
  SHARE_REWARD_COINS,
  computePortfolioReturn,
} from './portfolioShareData';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface PortfolioShareState {
  portfolios: SharedPortfolio[];
  /** Date the share reward was last granted (once per day). */
  shareRewardDate: string | null;

  getFeed: () => SharedPortfolio[];
  sharePortfolio: (input: {
    picks: SharedPick[];
    caption: string;
    authorName: string;
    avatarId: string | null;
  }) => { portfolio: SharedPortfolio; rewardCoins: number };
  toggleLike: (portfolioId: string) => void;
  addComment: (portfolioId: string, text: string, avatarId: string | null) => void;
}

export const usePortfolioShareStore = create<PortfolioShareState>()(
  persist(
    (set, get) => ({
      portfolios: SEED_PORTFOLIOS,
      shareRewardDate: null,

      getFeed: () => {
        return [...get().portfolios].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      },

      sharePortfolio: ({ picks, caption, authorName, avatarId }) => {
        const portfolio: SharedPortfolio = {
          id: makeId('pf-self'),
          author: authorName,
          avatarId,
          isSelf: true,
          tier: 'silver',
          totalReturn: computePortfolioReturn(picks),
          weekDay: Math.min(5, Math.max(1, new Date().getDay())),
          picks,
          likes: 0,
          likedBySelf: false,
          comments: [],
          caption: caption.trim(),
          createdAt: new Date().toISOString(),
        };

        const today = todayISO();
        const rewardEligible = get().shareRewardDate !== today;

        set((state) => ({
          portfolios: [portfolio, ...state.portfolios],
          shareRewardDate: rewardEligible ? today : state.shareRewardDate,
        }));

        let rewardCoins = 0;
        if (rewardEligible) {
          rewardCoins = SHARE_REWARD_COINS;
          try {
            // EconomyUI store fires the animated coin counter, not just the balance.
            const economyMod = require('../economy/useEconomyUIStore');
            economyMod.useEconomyUIStore.getState().addCoins(SHARE_REWARD_COINS);
          } catch {
            /* economy store unavailable — skip */
          }
        }
        return { portfolio, rewardCoins };
      },

      toggleLike: (portfolioId) => {
        set((state) => ({
          portfolios: state.portfolios.map((pf) => {
            if (pf.id !== portfolioId) return pf;
            const liked = !pf.likedBySelf;
            return { ...pf, likedBySelf: liked, likes: Math.max(0, pf.likes + (liked ? 1 : -1)) };
          }),
        }));
      },

      addComment: (portfolioId, text, avatarId) => {
        const body = text.trim();
        if (!body) return;
        const comment: PortfolioComment = {
          id: makeId('pfc'),
          author: 'אני',
          avatarId,
          isSelf: true,
          text: body.slice(0, 200),
          ago: 'עכשיו',
          likes: 0,
        };
        set((state) => ({
          portfolios: state.portfolios.map((pf) =>
            pf.id === portfolioId ? { ...pf, comments: [...pf.comments, comment] } : pf,
          ),
        }));
      },
    }),
    {
      name: 'portfolio-share-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        portfolios: state.portfolios,
        shareRewardDate: state.shareRewardDate,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.portfolios) || state.portfolios.length === 0) {
          state.portfolios = SEED_PORTFOLIOS;
        }
      },
    },
  ),
);