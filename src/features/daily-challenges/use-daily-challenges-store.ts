import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import {
  MAX_DAILY_PLAYS,
  MAX_DILEMMA_DAILY,
  CHALLENGE_XP_REWARD,
  CHALLENGE_COIN_REWARD,
} from './daily-challenge-types';
import type { DailyChallengesState, PlayCountMap } from './daily-challenge-types';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getPlays(map: PlayCountMap | undefined, date: string): number {
  return map?.[date] ?? 0;
}

function isMaxed(map: PlayCountMap | undefined, date: string): boolean {
  const isPro = useSubscriptionStore.getState().isPro();
  if (isPro) return false;
  return getPlays(map, date) >= MAX_DAILY_PLAYS;
}

function incrementPlays(map: PlayCountMap | undefined, date: string): PlayCountMap {
  return { ...(map || {}), [date]: getPlays(map, date) + 1 };
}

export const useDailyChallengesStore = create<DailyChallengesState>()(
  persist(
    (set, get) => ({
      dilemmaPlays: {},
      investmentPlays: {},
      crashGamePlays: {},
      swipeGamePlays: {},
      bullshitSwipePlays: {},
      higherLowerPlays: {},
      budgetNinjaPlays: {},
      priceSliderPlays: {},
      cashoutRushPlays: {},
      fomoKillerPlays: {},
      dilemmaCorrectCount: 0,
      investmentTotalAnswered: 0,

      getDilemmaPlaysToday: () => getPlays(get().dilemmaPlays, todayStr()),
      getInvestmentPlaysToday: () => getPlays(get().investmentPlays, todayStr()),
      getCrashGamePlaysToday: () => getPlays(get().crashGamePlays, todayStr()),
      getSwipeGamePlaysToday: () => getPlays(get().swipeGamePlays, todayStr()),
      getBullshitSwipePlaysToday: () => getPlays(get().bullshitSwipePlays, todayStr()),
      getHigherLowerPlaysToday: () => getPlays(get().higherLowerPlays, todayStr()),
      getBudgetNinjaPlaysToday: () => getPlays(get().budgetNinjaPlays, todayStr()),
      getPriceSliderPlaysToday: () => getPlays(get().priceSliderPlays, todayStr()),
      getCashoutRushPlaysToday: () => getPlays(get().cashoutRushPlays, todayStr()),
      getFomoKillerPlaysToday: () => getPlays(get().fomoKillerPlays, todayStr()),

      hasDilemmaAnsweredToday: () => getPlays(get().dilemmaPlays, todayStr()) >= MAX_DILEMMA_DAILY,
      hasInvestmentAnsweredToday: () => isMaxed(get().investmentPlays, todayStr()),
      hasCrashGamePlayedToday: () => isMaxed(get().crashGamePlays, todayStr()),
      hasSwipeGamePlayedToday: () => false, // no limit, let user play freely
      hasBullshitSwipePlayedToday: () => isMaxed(get().bullshitSwipePlays, todayStr()),
      hasHigherLowerPlayedToday: () => isMaxed(get().higherLowerPlays, todayStr()),
      hasBudgetNinjaPlayedToday: () => isMaxed(get().budgetNinjaPlays, todayStr()),
      hasPriceSliderPlayedToday: () => isMaxed(get().priceSliderPlays, todayStr()),
      hasCashoutRushPlayedToday: () => isMaxed(get().cashoutRushPlays, todayStr()),
      hasFomoKillerPlayedToday: () => isMaxed(get().fomoKillerPlays, todayStr()),

      answerDilemma: (date: string, wasCorrect: boolean) => {
        const state = get();
        if (getPlays(state.dilemmaPlays, date) >= MAX_DILEMMA_DAILY) return;

        if (wasCorrect) {
          const economy = useEconomyStore.getState();
          economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          dilemmaPlays: incrementPlays(state.dilemmaPlays, date),
          dilemmaCorrectCount: (state.dilemmaCorrectCount || 0) + (wasCorrect ? 1 : 0),
        });
      },

      answerInvestment: (date: string) => {
        const state = get();
        if (isMaxed(state.investmentPlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        economy.addCoins(CHALLENGE_COIN_REWARD);

        set({
          investmentPlays: incrementPlays(state.investmentPlays, date),
          investmentTotalAnswered: (state.investmentTotalAnswered || 0) + 1,
        });
      },

      playCrashGame: (date: string, _coinsEarned: number) => {
        const state = get();
        if (isMaxed(state.crashGamePlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (_coinsEarned > 0) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          crashGamePlays: incrementPlays(state.crashGamePlays, date),
        });
      },

      playSwipeGame: (date: string, score: number) => {
        const state = get();
        if (isMaxed(state.swipeGamePlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (score > 0) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          swipeGamePlays: incrementPlays(state.swipeGamePlays, date),
        });
      },

      playBullshitSwipe: (date: string, score: number) => {
        const state = get();
        if (isMaxed(state.bullshitSwipePlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (score > 0) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          bullshitSwipePlays: incrementPlays(state.bullshitSwipePlays, date),
        });
      },

      playHigherLower: (date: string, wasCorrect: boolean) => {
        const state = get();
        if (isMaxed(state.higherLowerPlays, date)) return;

        if (wasCorrect) {
          const economy = useEconomyStore.getState();
          economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          higherLowerPlays: incrementPlays(state.higherLowerPlays, date),
        });
      },

      playBudgetNinja: (date: string, score: number) => {
        const state = get();
        if (isMaxed(state.budgetNinjaPlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (score > 0) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          budgetNinjaPlays: incrementPlays(state.budgetNinjaPlays, date),
        });
      },

      playPriceSlider: (date: string, accuracyPercent: number) => {
        const state = get();
        if (isMaxed(state.priceSliderPlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (accuracyPercent >= 60) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          priceSliderPlays: incrementPlays(state.priceSliderPlays, date),
        });
      },

      playCashoutRush: (date: string, cashedOut: boolean) => {
        const state = get();
        if (isMaxed(state.cashoutRushPlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (cashedOut) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          cashoutRushPlays: incrementPlays(state.cashoutRushPlays, date),
        });
      },

      playFomoKiller: (date: string, perfect: boolean) => {
        const state = get();
        if (isMaxed(state.fomoKillerPlays, date)) return;

        const economy = useEconomyStore.getState();
        economy.addXP(CHALLENGE_XP_REWARD, 'daily_task');
        if (perfect) {
          economy.addCoins(CHALLENGE_COIN_REWARD);
        }

        set({
          fomoKillerPlays: incrementPlays(state.fomoKillerPlays, date),
        });
      },
    }),
    {
      name: 'daily-challenges-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        dilemmaPlays: state.dilemmaPlays,
        investmentPlays: state.investmentPlays,
        crashGamePlays: state.crashGamePlays,
        swipeGamePlays: state.swipeGamePlays,
        bullshitSwipePlays: state.bullshitSwipePlays,
        higherLowerPlays: state.higherLowerPlays,
        budgetNinjaPlays: state.budgetNinjaPlays,
        priceSliderPlays: state.priceSliderPlays,
        cashoutRushPlays: state.cashoutRushPlays,
        fomoKillerPlays: state.fomoKillerPlays,
        dilemmaCorrectCount: state.dilemmaCorrectCount,
        investmentTotalAnswered: state.investmentTotalAnswered,
      }),
    },
  ),
);
