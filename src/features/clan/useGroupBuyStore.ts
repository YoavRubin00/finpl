import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { GroupBuyProject, GroupBuyContribution, OwnedAsset, ContributionCurrency } from './clanTypes';
import {
  SEED_PROJECTS,
  FX_GEM_TO_COIN,
  FX_FANTASY_CASH_TO_COIN,
  SELF_ID,
} from './clanData';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function toCoinEquivalent(amount: number, currency: ContributionCurrency): number {
  switch (currency) {
    case 'coins': return amount;
    case 'gems': return amount * FX_GEM_TO_COIN;
    case 'fantasyCash': return amount * FX_FANTASY_CASH_TO_COIN;
  }
}

interface GroupBuyState {
  projects: GroupBuyProject[];
  contributions: GroupBuyContribution[]; // capped at 200
  ownedAssets: OwnedAsset[];

  // Selectors
  getActiveProjects: () => GroupBuyProject[];
  getFundedProjects: () => GroupBuyProject[];
  getProjectById: (id: string) => GroupBuyProject | undefined;
  getSelfContributions: (projectId: string) => GroupBuyContribution[];
  getSelfShare: (projectId: string) => number; // 0..1
  canClaimPayout: (assetId: string) => boolean;

  // Actions
  startProject: (
    name: string,
    emoji: string,
    descriptionHebrew: string,
    goalCurrency: ContributionCurrency,
    goalAmount: number,
    dailyYieldCoins: number,
    dailyYieldGems: number
  ) => GroupBuyProject;
  contribute: (projectId: string, currency: ContributionCurrency, amount: number) => boolean;
  claimPayout: (assetId: string) => { coins: number; gems: number } | null;
  cancelProject: (projectId: string) => boolean;
}

export const useGroupBuyStore = create<GroupBuyState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      contributions: [],
      ownedAssets: [],

      getActiveProjects: () => get().projects.filter((p) => p.status === 'active'),

      getFundedProjects: () => get().projects.filter((p) => p.status === 'funded'),

      getProjectById: (id) => get().projects.find((p) => p.id === id),

      getSelfContributions: (projectId) =>
        get().contributions.filter(
          (c) => c.projectId === projectId && c.contributorId === SELF_ID
        ),

      getSelfShare: (projectId) => {
        const project = get().getProjectById(projectId);
        if (!project || project.raisedAmount === 0) return 0;
        const selfTotal = get()
          .getSelfContributions(projectId)
          .reduce((sum, c) => sum + c.amountInGoalCurrency, 0);
        return Math.min(1, selfTotal / project.goalAmount);
      },

      canClaimPayout: (assetId) => {
        const asset = get().ownedAssets.find((a) => a.id === assetId);
        if (!asset) return false;
        return asset.lastDistributedDate !== todayISO();
      },

      startProject: (name, emoji, descriptionHebrew, goalCurrency, goalAmount, dailyYieldCoins, dailyYieldGems) => {
        const project: GroupBuyProject = {
          id: makeId('proj'),
          name,
          emoji,
          descriptionHebrew,
          goalCurrency,
          goalAmount,
          raisedAmount: 0,
          status: 'active',
          startedAt: new Date().toISOString(),
          dailyYieldCoins,
          dailyYieldGems,
          createdBy: SELF_ID,
          contributorIds: [],
        };
        set((state) => ({ projects: [...state.projects, project] }));

        // System chat message
        try {
          const chatStore = require('./useClanChatStore').useClanChatStore;
          chatStore.getState().addSystemMessage({
            kind: 'system',
            event: 'group_buy_started',
            body: `נפתחה קבוצת רכישה: ${name} ${emoji}`,
            payload: { projectId: project.id },
          });
        } catch { /* chat store may not be ready */ }

        return project;
      },

      contribute: (projectId, currency, amount) => {
        const project = get().getProjectById(projectId);
        if (!project || project.status !== 'active') return false;
        if (amount <= 0) return false;

        // Spend from economy store
        const economyStore = require('../economy/useEconomyStore').useEconomyStore;
        let spent = false;
        if (currency === 'coins') {
          spent = economyStore.getState().spendCoins(amount);
        } else if (currency === 'gems') {
          spent = economyStore.getState().spendGems(amount);
        } else {
          // fantasyCash — spend from fantasy store
          try {
            const fantasyStore = require('../fantasy-league/useFantasyStore').useFantasyStore;
            const balance = fantasyStore.getState().portfolioValue ?? 0;
            if (balance < amount) return false;
            // Fantasy store has no spendCash; we just record contribution (simulated)
            spent = true;
          } catch {
            return false;
          }
        }
        if (!spent) return false;

        const amountInGoalCurrency =
          project.goalCurrency === currency
            ? amount
            : toCoinEquivalent(amount, currency) / toCoinEquivalent(1, project.goalCurrency);

        const contribution: GroupBuyContribution = {
          id: makeId('contrib'),
          projectId,
          contributorId: SELF_ID,
          contributorName: 'את/ה',
          currency,
          amount,
          amountInGoalCurrency,
          contributedAt: new Date().toISOString(),
        };

        const newRaised = project.raisedAmount + amountInGoalCurrency;
        const isFunded = newRaised >= project.goalAmount;

        set((state) => ({
          contributions: [...state.contributions.slice(-199), contribution],
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  raisedAmount: Math.min(newRaised, p.goalAmount),
                  status: isFunded ? 'funded' : 'active',
                  fundedAt: isFunded ? new Date().toISOString() : p.fundedAt,
                  contributorIds: p.contributorIds.includes(SELF_ID)
                    ? p.contributorIds
                    : [...p.contributorIds, SELF_ID],
                }
              : p
          ),
        }));

        if (isFunded) {
          // Convert to owned asset
          const updatedProject = get().getProjectById(projectId)!;
          const asset: OwnedAsset = {
            id: makeId('asset'),
            sourceProjectId: projectId,
            name: updatedProject.name,
            emoji: updatedProject.emoji,
            acquiredAt: new Date().toISOString(),
            dailyYieldCoins: updatedProject.dailyYieldCoins,
            dailyYieldGems: updatedProject.dailyYieldGems,
            shares: { [SELF_ID]: get().getSelfShare(projectId) },
            lastDistributedDate: null,
            lifetimeCoinsPaid: 0,
            lifetimeGemsPaid: 0,
          };
          set((state) => ({ ownedAssets: [...state.ownedAssets, asset] }));

          try {
            const chatStore = require('./useClanChatStore').useClanChatStore;
            chatStore.getState().addSystemMessage({
              kind: 'system',
              event: 'group_buy_funded',
              body: `הקלאן רכש את ${updatedProject.name}! 🏆`,
              payload: { projectId },
            });
          } catch { /* chat store may not be ready */ }
        }

        return true;
      },

      claimPayout: (assetId) => {
        const asset = get().ownedAssets.find((a) => a.id === assetId);
        if (!asset) return null;
        if (asset.lastDistributedDate === todayISO()) return null;

        const selfShare = asset.shares[SELF_ID] ?? 0;
        const coins = Math.floor(asset.dailyYieldCoins * selfShare);
        const gems = Math.floor(asset.dailyYieldGems * selfShare);

        set((state) => ({
          ownedAssets: state.ownedAssets.map((a) =>
            a.id === assetId
              ? {
                  ...a,
                  lastDistributedDate: todayISO(),
                  lifetimeCoinsPaid: a.lifetimeCoinsPaid + coins,
                  lifetimeGemsPaid: a.lifetimeGemsPaid + gems,
                }
              : a
          ),
        }));

        const economyStore = require('../economy/useEconomyStore').useEconomyStore;
        if (coins > 0) economyStore.getState().addCoins(coins);
        if (gems > 0) economyStore.getState().addGems(gems);

        try {
          const chatStore = require('./useClanChatStore').useClanChatStore;
          chatStore.getState().addSystemMessage({
            kind: 'system',
            event: 'group_buy_payout',
            body: `הכנסה מ-${asset.name} חולקה 💰 (${coins} 🪙, ${gems} 💎)`,
            payload: { projectId: asset.sourceProjectId },
          });
        } catch { /* chat store may not be ready */ }

        return { coins, gems };
      },

      cancelProject: (projectId) => {
        const project = get().getProjectById(projectId);
        if (!project || project.createdBy !== SELF_ID) return false;
        if (project.status !== 'active') return false;

        // Refund coins only (gems & fantasyCash not refunded — simulated)
        const selfContribs = get().getSelfContributions(projectId).filter((c) => c.currency === 'coins');
        const refund = selfContribs.reduce((sum, c) => sum + c.amount, 0);
        if (refund > 0) {
          const economyStore = require('../economy/useEconomyStore').useEconomyStore;
          economyStore.getState().addCoins(refund);
        }

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, status: 'cancelled' } : p
          ),
        }));
        return true;
      },
    }),
    {
      name: 'clan-groupbuy-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        projects: state.projects,
        contributions: state.contributions.slice(-200),
        ownedAssets: state.ownedAssets,
      }),
    }
  )
);
