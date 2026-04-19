import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { GatedFeature } from '../subscription/useSubscriptionStore';
import { useUserStatsStore } from '../user-stats/useUserStatsStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useAITelemetryStore } from '../ai-personalization/useAITelemetryStore';

export type IntentTier = 'low' | 'medium' | 'high';

export interface ProTapEvent {
  feature: GatedFeature;
  timestamp: number;
}

interface MonetizationIntentState {
  proTaps: ProTapEvent[];
  pricingVisitTimestamps: number[];
  lastUpgradeNotifAt: number | null;

  trackProTap: (feature: GatedFeature) => void;
  trackPricingVisit: () => void;
  computeIntentScore: () => number;
  getIntentTier: () => IntentTier;
  getLastTappedFeature: () => GatedFeature | null;
  canSendUpgradeNotif: () => boolean;
  markUpgradeNotifSent: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_TAPS = 30;
const MAX_PRICING_VISITS = 10;

export const useMonetizationIntentStore = create<MonetizationIntentState>()(
  persist(
    (set, get) => ({
      proTaps: [],
      pricingVisitTimestamps: [],
      lastUpgradeNotifAt: null,

      trackProTap: (feature) => {
        const now = Date.now();
        set((s) => ({
          proTaps: [
            ...s.proTaps.filter((t) => now - t.timestamp < SEVEN_DAYS_MS * 4),
            { feature, timestamp: now },
          ].slice(-MAX_TAPS),
        }));
      },

      trackPricingVisit: () => {
        const now = Date.now();
        set((s) => ({
          pricingVisitTimestamps: [
            ...s.pricingVisitTimestamps.filter((t) => now - t < SEVEN_DAYS_MS * 4),
            now,
          ].slice(-MAX_PRICING_VISITS),
        }));
      },

      computeIntentScore: (): number => {
        const now = Date.now();
        const { proTaps, pricingVisitTimestamps } = get();

        const recentTaps = proTaps.filter((t) => now - t.timestamp < SEVEN_DAYS_MS).length;
        const recentVisits = pricingVisitTimestamps.filter((t) => now - t < SEVEN_DAYS_MS).length;

        // Session depth: average daily seconds over last 7 days
        const dailySecs = useUserStatsStore.getState().dailySessionSeconds;
        const last7Keys = Object.keys(dailySecs).sort().slice(-7);
        const avgDailySecs = last7Keys.length > 0
          ? last7Keys.reduce((sum, k) => sum + (dailySecs[k] ?? 0), 0) / last7Keys.length
          : 0;

        const activeDays = useEconomyStore.getState().activeDates.length;
        const vector = useAITelemetryStore.getState().profile?.monetizationVector ?? null;

        let score = 0;
        score += avgDailySecs > 600 ? 2 : avgDailySecs > 300 ? 1 : 0;
        score += activeDays >= 10 ? 3 : activeDays >= 5 ? 2 : activeDays >= 3 ? 1 : 0;
        score += recentTaps * 3;
        score += recentVisits * 5;
        score += vector === 'Impulse Buyer' || vector === 'Status Seeker' ? 3 : 0;
        return score;
      },

      getIntentTier: (): IntentTier => {
        const score = get().computeIntentScore();
        if (score >= 10) return 'high';
        if (score >= 5) return 'medium';
        return 'low';
      },

      getLastTappedFeature: (): GatedFeature | null => {
        const now = Date.now();
        const recent = get().proTaps
          .filter((t) => now - t.timestamp < SEVEN_DAYS_MS)
          .sort((a, b) => b.timestamp - a.timestamp);
        return recent[0]?.feature ?? null;
      },

      canSendUpgradeNotif: (): boolean => {
        const { lastUpgradeNotifAt } = get();
        if (get().getIntentTier() !== 'high') return false;
        if (lastUpgradeNotifAt === null) return true;
        return Date.now() - lastUpgradeNotifAt > THREE_DAYS_MS;
      },

      markUpgradeNotifSent: () => {
        set({ lastUpgradeNotifAt: Date.now() });
      },
    }),
    {
      name: 'monetization-intent-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        proTaps: s.proTaps,
        pricingVisitTimestamps: s.pricingVisitTimestamps,
        lastUpgradeNotifAt: s.lastUpgradeNotifAt,
      }),
    },
  ),
);