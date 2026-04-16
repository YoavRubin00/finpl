import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { RealAsset, RealAssetsState, PortfolioCombo, MilestoneId } from './realAssetsTypes';
import { getBaseAsset, getYieldForTier, PORTFOLIO_COMBOS, ASSET_IDS, MORTGAGE_TERMS } from './realAssetsData';
import { useEconomyStore } from '../economy/useEconomyStore';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function hoursSince(timestamp: number): number {
  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
}

function recalcTotalDaily(assets: Record<string, RealAsset>): number {
  return Object.values(assets).reduce((sum, a) => sum + a.dailyYield, 0);
}

/** Check which combos are active based on owned assets */
function findActiveCombos(ownedIds: string[]): PortfolioCombo[] {
  return PORTFOLIO_COMBOS.filter((combo) =>
    combo.requiredAssets.every((id) => ownedIds.includes(id)),
  );
}

/** Calculate total combo yield bonus (multiplicative with base yield) */
function calcComboBonus(ownedIds: string[]): number {
  const active = findActiveCombos(ownedIds);
  return active.reduce((sum, c) => sum + c.yieldBonus, 0);
}

/** Check and award new milestones, returns newly unlocked ones */
function checkMilestones(
  ownedAssets: Record<string, RealAsset>,
  existing: MilestoneId[],
): MilestoneId[] {
  const newMilestones: MilestoneId[] = [];
  const ownedCount = Object.keys(ownedAssets).length;
  const assets = Object.values(ownedAssets);

  if (ownedCount >= 1 && !existing.includes('first_asset')) {
    newMilestones.push('first_asset');
  }
  if (ownedCount >= 3 && !existing.includes('three_assets')) {
    newMilestones.push('three_assets');
  }
  if (ownedCount >= ASSET_IDS.length && !existing.includes('all_assets')) {
    newMilestones.push('all_assets');
  }
  if (assets.some((a) => a.tier >= 2) && !existing.includes('first_t2')) {
    newMilestones.push('first_t2');
  }
  if (assets.some((a) => a.tier >= 3) && !existing.includes('first_t3')) {
    newMilestones.push('first_t3');
  }

  return newMilestones;
}

/** XP rewards per milestone */
const MILESTONE_XP: Record<MilestoneId, number> = {
  first_asset: 50,
  three_assets: 100,
  all_assets: 200,
  first_t2: 75,
  first_t3: 150,
};

/** Gem rewards per milestone (0 = none) */
const MILESTONE_GEMS: Record<MilestoneId, number> = {
  first_asset: 0,
  three_assets: 0,
  all_assets: 5,
  first_t2: 0,
  first_t3: 3,
};

function awardMilestones(milestones: MilestoneId[]): void {
  const economy = useEconomyStore.getState();
  for (const m of milestones) {
    economy.addXP(MILESTONE_XP[m], 'challenge_complete');
    if (MILESTONE_GEMS[m] > 0) {
      economy.addGems(MILESTONE_GEMS[m]);
    }
  }
}

export const useRealAssetsStore = create<RealAssetsState>()(
  persist(
    (set, get) => ({
      ownedAssets: {},
      totalDailyIncome: 0,
      lifetimeEarned: 0,
      assetMilestones: [],
      assetVouchers: 0,

      purchaseAsset: (assetId: string): boolean => {
        const { ownedAssets, assetMilestones } = get();
        if (ownedAssets[assetId]) return false;

        const base = getBaseAsset(assetId);
        if (!base) return false;

        const spent = useEconomyStore.getState().spendCoins(base.baseCost);
        if (!spent) return false;

        const now = Date.now();
        const asset: RealAsset = {
          ...base,
          purchasedAt: now,
          lastCollectedAt: now,
        };

        const updated = { ...ownedAssets, [assetId]: asset };

        // Check milestones
        const newMilestones = checkMilestones(updated, assetMilestones);
        if (newMilestones.length > 0) awardMilestones(newMilestones);

        set({
          ownedAssets: updated,
          totalDailyIncome: recalcTotalDaily(updated),
          assetMilestones: [...assetMilestones, ...newMilestones],
        });
        return true;
      },

      /**
       * Purchase with mortgage (משכנתא):
       * - Pay downpayment (30%) upfront
       * - Borrow the rest (70%)
       * - Daily yield is split: 60% goes to repayment, 40% is net income
       * - Interest accrues daily on remaining debt
       */
      purchaseWithMortgage: (assetId: string): boolean => {
        const { ownedAssets, assetMilestones } = get();
        if (ownedAssets[assetId]) return false;

        const base = getBaseAsset(assetId);
        if (!base) return false;

        const downpayment = Math.ceil(base.baseCost * MORTGAGE_TERMS.downpayment);
        const spent = useEconomyStore.getState().spendCoins(downpayment);
        if (!spent) return false;

        const loanAmount = base.baseCost - downpayment;

        const now = Date.now();
        const asset: RealAsset = {
          ...base,
          purchasedAt: now,
          lastCollectedAt: now,
          mortgageRemaining: loanAmount,
        };

        const updated = { ...ownedAssets, [assetId]: asset };

        const newMilestones = checkMilestones(updated, assetMilestones);
        if (newMilestones.length > 0) awardMilestones(newMilestones);

        set({
          ownedAssets: updated,
          totalDailyIncome: recalcTotalDaily(updated),
          assetMilestones: [...assetMilestones, ...newMilestones],
        });
        return true;
      },

      upgradeAsset: (assetId: string): boolean => {
        const { ownedAssets, assetMilestones } = get();
        const asset = ownedAssets[assetId];
        if (!asset) return false;
        if (asset.tier >= 3) return false;

        const spent = useEconomyStore.getState().spendCoins(asset.upgradeCost);
        if (!spent) return false;

        const nextTier = (asset.tier + 1) as 1 | 2 | 3;
        const base = getBaseAsset(assetId);
        if (!base) return false;

        const upgraded: RealAsset = {
          ...asset,
          tier: nextTier,
          dailyYield: getYieldForTier(base.dailyYield, nextTier),
          upgradeCost: Math.round(base.upgradeCost * (nextTier === 3 ? 2 : 1)),
        };

        const updated = { ...ownedAssets, [assetId]: upgraded };

        // Check milestones (tier upgrades)
        const newMilestones = checkMilestones(updated, assetMilestones);
        if (newMilestones.length > 0) awardMilestones(newMilestones);

        set({
          ownedAssets: updated,
          totalDailyIncome: recalcTotalDaily(updated),
          assetMilestones: [...assetMilestones, ...newMilestones],
        });
        return true;
      },

      collectDailyIncome: (): void => {
        const { ownedAssets, pendingIncome, getComboBonus } = get();
        const baseIncome = pendingIncome();
        if (baseIncome <= 0) return;

        // Apply combo bonus
        const bonus = getComboBonus();
        const totalIncome = baseIncome * (1 + bonus);

        // Process mortgage repayments
        let netIncome = 0;
        const now = Date.now();
        const updated: Record<string, RealAsset> = {};

        for (const [id, asset] of Object.entries(ownedAssets)) {
          if (!asset.lastCollectedAt) {
            updated[id] = { ...asset, lastCollectedAt: now };
            continue;
          }

          const hours = hoursSince(asset.lastCollectedAt);
          const hourlyRate = asset.dailyYield / 24;
          const rawYield = hours * hourlyRate * (1 + bonus);

          if (asset.mortgageRemaining && asset.mortgageRemaining > 0) {
            // Add daily interest to debt
            const daysElapsed = hours / 24;
            const interest = asset.mortgageRemaining * MORTGAGE_TERMS.dailyInterestRate * daysElapsed;
            let debt = asset.mortgageRemaining + interest;

            // Auto-deduct repayment from yield
            const repayment = Math.min(rawYield * MORTGAGE_TERMS.repaymentRate, debt);
            debt -= repayment;
            const playerShare = rawYield - repayment;

            netIncome += Math.max(0, playerShare);
            updated[id] = {
              ...asset,
              lastCollectedAt: now,
              mortgageRemaining: Math.max(0, Math.round(debt)),
            };
          } else {
            netIncome += rawYield;
            updated[id] = { ...asset, lastCollectedAt: now, mortgageRemaining: 0 };
          }
        }

        const rounded = Math.floor(netIncome);
        if (rounded > 0) {
          useEconomyStore.getState().addCoins(rounded);
        }

        set((state) => ({
          ownedAssets: updated,
          lifetimeEarned: state.lifetimeEarned + rounded,
        }));
      },

      canCollectToday: (): boolean => {
        const { ownedAssets } = get();
        const assets = Object.values(ownedAssets);
        if (assets.length === 0) return false;

        const today = todayISO();
        return assets.some((a) => {
          if (!a.lastCollectedAt) return true;
          const lastDate = new Date(a.lastCollectedAt).toISOString().slice(0, 10);
          return lastDate !== today;
        });
      },

      pendingIncome: (): number => {
        const { ownedAssets } = get();
        let total = 0;
        for (const asset of Object.values(ownedAssets)) {
          if (!asset.lastCollectedAt) continue;
          const hours = hoursSince(asset.lastCollectedAt);
          const hourlyRate = asset.dailyYield / 24;
          total += hours * hourlyRate;
        }
        return total;
      },

      getActiveCombos: (): PortfolioCombo[] => {
        const { ownedAssets } = get();
        return findActiveCombos(Object.keys(ownedAssets));
      },

      getComboBonus: (): number => {
        const { ownedAssets } = get();
        return calcComboBonus(Object.keys(ownedAssets));
      },

      useVoucher: (): boolean => {
        const { assetVouchers } = get();
        if (assetVouchers <= 0) return false;
        set({ assetVouchers: assetVouchers - 1 });
        return true;
      },

      addVoucher: (): void => {
        set((state) => ({ assetVouchers: state.assetVouchers + 1 }));
      },

      totalMortgageDebt: (): number => {
        const { ownedAssets } = get();
        return Object.values(ownedAssets).reduce(
          (sum, a) => sum + (a.mortgageRemaining ?? 0),
          0,
        );
      },
    }),
    {
      name: 'real-assets-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        ownedAssets: state.ownedAssets,
        totalDailyIncome: state.totalDailyIncome,
        lifetimeEarned: state.lifetimeEarned,
        assetMilestones: state.assetMilestones,
        assetVouchers: state.assetVouchers,
      }),
    },
  ),
);
