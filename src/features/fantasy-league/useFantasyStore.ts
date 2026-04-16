import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type {
  FantasyLeague,
  FantasyPortfolio,
  FantasyPosition,
  LeaderboardEntry,
} from './fantasyTypes';
import { CURRENT_LEAGUE, MOCK_LEADERBOARD } from './fantasyData';
import { fetchLatestPrice } from '../trading-hub/marketApiService';

interface FantasyActions {
  initPortfolio: (league: FantasyLeague) => void;
  buyAsset: (assetId: string, assetName: string, quantity: number, price: number) => void;
  sellAsset: (positionId: string, currentPrice: number) => void;
  refreshPrices: () => Promise<void>;
  computePortfolioValue: () => number;
  getLeaderboard: () => LeaderboardEntry[];
}

interface FantasyStoreState {
  currentLeague: FantasyLeague | null;
  portfolio: FantasyPortfolio | null;
  leaderboard: LeaderboardEntry[];
  lastUpdated: string | null;
}

type FantasyStore = FantasyStoreState & FantasyActions;

let nextPositionId = 1;

export const useFantasyStore = create<FantasyStore>()(
  persist(
    (set, get) => ({
      currentLeague: null,
      portfolio: null,
      leaderboard: [],
      lastUpdated: null,

      initPortfolio: (league: FantasyLeague) => {
        set({
          currentLeague: league,
          portfolio: {
            leagueId: league.id,
            playerId: 'local',
            startingBudget: league.budgetPerPlayer,
            cashRemaining: league.budgetPerPlayer,
            positions: [],
          },
          leaderboard: MOCK_LEADERBOARD,
          lastUpdated: new Date().toISOString(),
        });
      },

      buyAsset: (assetId: string, assetName: string, quantity: number, price: number) => {
        const { portfolio } = get();
        if (!portfolio) return;

        const cost = quantity * price;
        if (cost > portfolio.cashRemaining) return;

        const position: FantasyPosition = {
          id: `fp-${nextPositionId++}`,
          assetId,
          assetName,
          quantity,
          buyPrice: price,
          currentPrice: price,
          pnlPercent: 0,
        };

        set({
          portfolio: {
            ...portfolio,
            cashRemaining: portfolio.cashRemaining - cost,
            positions: [...portfolio.positions, position],
          },
          lastUpdated: new Date().toISOString(),
        });
      },

      sellAsset: (positionId: string, currentPrice: number) => {
        const { portfolio } = get();
        if (!portfolio) return;

        const position = portfolio.positions.find((p) => p.id === positionId);
        if (!position) return;

        const proceeds = position.quantity * currentPrice;

        set({
          portfolio: {
            ...portfolio,
            cashRemaining: portfolio.cashRemaining + proceeds,
            positions: portfolio.positions.filter((p) => p.id !== positionId),
          },
          lastUpdated: new Date().toISOString(),
        });
      },

      refreshPrices: async () => {
        const { portfolio } = get();
        if (!portfolio || portfolio.positions.length === 0) return;

        const updatedPositions = await Promise.all(
          portfolio.positions.map(async (pos) => {
            try {
              const latestPrice = await fetchLatestPrice(pos.assetId);
              const pnlPercent = ((latestPrice - pos.buyPrice) / pos.buyPrice) * 100;
              return { ...pos, currentPrice: latestPrice, pnlPercent };
            } catch {
              return pos;
            }
          }),
        );

        set({
          portfolio: { ...portfolio, positions: updatedPositions },
          lastUpdated: new Date().toISOString(),
        });
      },

      computePortfolioValue: () => {
        const { portfolio } = get();
        if (!portfolio) return 0;

        const positionsValue = portfolio.positions.reduce(
          (sum, pos) => sum + pos.quantity * pos.currentPrice,
          0,
        );
        return portfolio.cashRemaining + positionsValue;
      },

      getLeaderboard: () => {
        const { portfolio } = get();
        const portfolioValue = get().computePortfolioValue();
        const startingBudget = portfolio?.startingBudget ?? CURRENT_LEAGUE.budgetPerPlayer;
        const pnlPercent =
          startingBudget > 0 ? ((portfolioValue - startingBudget) / startingBudget) * 100 : 0;

        const localEntry: LeaderboardEntry = {
          rank: 0,
          playerId: 'local',
          displayName: 'אתה',
          portfolioValue,
          pnlPercent: Math.round(pnlPercent * 100) / 100,
          change: 'new',
        };

        const merged = [...MOCK_LEADERBOARD, localEntry].sort(
          (a, b) => b.portfolioValue - a.portfolioValue,
        );

        return merged.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      },
    }),
    {
      name: 'fantasy-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentLeague: state.currentLeague,
        portfolio: state.portfolio,
        leaderboard: state.leaderboard,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);
