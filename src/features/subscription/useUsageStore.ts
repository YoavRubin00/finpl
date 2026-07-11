// Local persistent store for feature usage counters and UI state that
// previously lived in useSubscriptionStore.
// Subscription tier (isPro) comes from the server via useSubscription() /
// useIsPro().
//
// Cadence model (added 2026-05-30, Moni Sample Loop):
//  - DAILY    counters reset at local midnight (simulator/arena/chat/analyst-quick)
//  - WEEKLY   counters reset on ISO week change (analyst-deep)
//  - MONTHLY  counters reset on calendar month change (aiInsights, payslip)
// Each reset bucket uses its own "last reset" key — independent so we never
// reset a weekly counter when the day flips without the week flipping.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import type { GatedFeature } from './subscriptionConstants';
import { BASIC_LIMITS, PRO_LIMITS } from './subscriptionConstants';
import { israelDayKey } from '../../utils/dateUtils';

// IL-day gate (time-contract sweep, Yoav 11.7): daily usage limits reset at
// Israel midnight, matching every other user-facing daily loop.
function todayISO(): string {
  return israelDayKey();
}

// ISO-8601 week key, e.g. "2026-W22". Same calendar week → identical string.
// Uses UTC to avoid the "midnight on Sunday in Israel is still Saturday in
// UTC" trap that would let users squeeze two weekly uses across a TZ boundary.
function isoWeekKey(): string {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // ISO week starts Monday; shift so day 4 (Thursday) sets the week-year.
  const dayNum = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(utc.getUTCFullYear(), 0, 4));
  const weekNum =
    1 + Math.round(
      ((utc.getTime() - firstThursday.getTime()) / 86400000 -
        3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Calendar month key, e.g. "2026-05".
function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

interface UsageState {
  // Daily counters
  simulatorUsesToday: number;
  arenaChallengesToday: number;
  chatMessagesToday: number;
  analystQuickUsesToday: number;
  lastUsageResetDate: string | null;

  // Weekly counters
  analystDeepUsesThisWeek: number;
  lessonReportUsesThisWeek: number;
  lastUsageResetWeek: string | null;

  // Monthly counters
  aiInsightsUsesThisMonth: number;
  payslipUsesThisMonth: number;
  lastUsageResetMonth: string | null;

  // Pro welcome gate
  hasSeenProWelcome: boolean;
  // One-time post-mod-0-4 paywall gate (shown once between mod-0-4 and mod-0-5)
  hasSeenMod04Paywall: boolean;
  // One-time post-mod-0-1b paywall gate (shown once between mod-0-1b and mod-0-2).
  // Replaced the old post-walkthrough paywall (2026-06-11) — see LessonFlowScreen.
  hasSeenMod01bPaywall: boolean;
}

interface UsageActions {
  resetDailyUsageIfNeeded: () => void;
  resetWeeklyUsageIfNeeded: () => void;
  resetMonthlyUsageIfNeeded: () => void;
  incrementUsage: (feature: GatedFeature) => void;
  /** Pass isPro from server subscription so the store doesn't need to know about RC */
  canUse: (feature: GatedFeature, isPro: boolean) => boolean;
  /** How many uses remain in the current bucket (day/week/month). Returns
   *  Infinity for Pro and for features that aren't tracked here. */
  remainingUses: (feature: GatedFeature, isPro: boolean) => number;
  markProWelcomeSeen: () => void;
  markMod04PaywallSeen: () => void;
  markMod01bPaywallSeen: () => void;
  reset: () => void;
}

const initialState: UsageState = {
  simulatorUsesToday: 0,
  arenaChallengesToday: 0,
  chatMessagesToday: 0,
  analystQuickUsesToday: 0,
  lastUsageResetDate: null,
  analystDeepUsesThisWeek: 0,
  lessonReportUsesThisWeek: 0,
  lastUsageResetWeek: null,
  aiInsightsUsesThisMonth: 0,
  payslipUsesThisMonth: 0,
  lastUsageResetMonth: null,
  hasSeenProWelcome: false,
  hasSeenMod04Paywall: false,
  hasSeenMod01bPaywall: false,
};

export const useUsageStore = create<UsageState & UsageActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      resetDailyUsageIfNeeded: () => {
        const { lastUsageResetDate } = get();
        const today = todayISO();
        if (lastUsageResetDate !== today) {
          set({
            simulatorUsesToday: 0,
            arenaChallengesToday: 0,
            chatMessagesToday: 0,
            analystQuickUsesToday: 0,
            lastUsageResetDate: today,
          });
        }
      },

      resetWeeklyUsageIfNeeded: () => {
        const { lastUsageResetWeek } = get();
        const thisWeek = isoWeekKey();
        if (lastUsageResetWeek !== thisWeek) {
          set({
            analystDeepUsesThisWeek: 0,
            lessonReportUsesThisWeek: 0,
            lastUsageResetWeek: thisWeek,
          });
        }
      },

      resetMonthlyUsageIfNeeded: () => {
        const { lastUsageResetMonth } = get();
        const thisMonth = monthKey();
        if (lastUsageResetMonth !== thisMonth) {
          set({
            aiInsightsUsesThisMonth: 0,
            payslipUsesThisMonth: 0,
            lastUsageResetMonth: thisMonth,
          });
        }
      },

      incrementUsage: (feature: GatedFeature) => {
        const state = get();
        state.resetDailyUsageIfNeeded();
        state.resetWeeklyUsageIfNeeded();
        state.resetMonthlyUsageIfNeeded();
        switch (feature) {
          case 'simulator':
            set((s) => ({ simulatorUsesToday: s.simulatorUsesToday + 1 }));
            break;
          case 'arena':
            set((s) => ({ arenaChallengesToday: s.arenaChallengesToday + 1 }));
            break;
          case 'chat':
            set((s) => ({ chatMessagesToday: s.chatMessagesToday + 1 }));
            break;
          case 'analyst-quick':
            set((s) => ({ analystQuickUsesToday: s.analystQuickUsesToday + 1 }));
            break;
          case 'analyst-deep':
            set((s) => ({ analystDeepUsesThisWeek: s.analystDeepUsesThisWeek + 1 }));
            break;
          case 'lesson-report':
            set((s) => ({ lessonReportUsesThisWeek: s.lessonReportUsesThisWeek + 1 }));
            break;
          case 'payslip':
            set((s) => ({ payslipUsesThisMonth: s.payslipUsesThisMonth + 1 }));
            break;
          case 'aiInsights':
            set((s) => ({ aiInsightsUsesThisMonth: s.aiInsightsUsesThisMonth + 1 }));
            break;
          case 'saved_items':
          case 'breaking-news':
          case 'shark-voice':
            // Not counter-tracked — saved_items + shark-voice are hard
            // blocks (limit=0). breaking-news is a concurrent ticker CAP
            // enforced by BreakingNewsScreen reading BASIC_LIMITS directly.
            break;
        }
      },

      canUse: (feature: GatedFeature, isPro: boolean): boolean => {
        // Pro is unlimited UNLESS PRO_LIMITS lists this feature — those
        // are soft caps on expensive AI calls (currently analyst-deep at
        // 5/week). When a Pro feature is capped, the same bucketed counter
        // applies regardless of tier; Pro just gets the higher limit.
        const limit = isPro ? (PRO_LIMITS[feature] ?? Infinity) : BASIC_LIMITS[feature];
        if (limit === Infinity) return true;
        if (limit === 0) return false;

        const state = get();
        // For each tracked feature, treat a missing/expired reset bucket as
        // "used 0 in the current window" — equivalent to fresh allowance.
        const today = todayISO();
        const thisWeek = isoWeekKey();
        const thisMonth = monthKey();

        switch (feature) {
          case 'simulator':
            return state.lastUsageResetDate !== today || state.simulatorUsesToday < limit;
          case 'arena':
            return state.lastUsageResetDate !== today || state.arenaChallengesToday < limit;
          case 'chat':
            return state.lastUsageResetDate !== today || state.chatMessagesToday < limit;
          case 'analyst-quick':
            return state.lastUsageResetDate !== today || state.analystQuickUsesToday < limit;
          case 'analyst-deep':
            return state.lastUsageResetWeek !== thisWeek || state.analystDeepUsesThisWeek < limit;
          case 'lesson-report':
            return state.lastUsageResetWeek !== thisWeek || state.lessonReportUsesThisWeek < limit;
          case 'payslip':
            return state.lastUsageResetMonth !== thisMonth || state.payslipUsesThisMonth < limit;
          case 'aiInsights':
            return state.lastUsageResetMonth !== thisMonth || state.aiInsightsUsesThisMonth < limit;
          case 'saved_items':
          case 'breaking-news':
          case 'shark-voice':
            // breaking-news limit > 0 means "Free users can track up to N
            // tickers concurrently", not a usage event count — enforced at
            // the BreakingNewsScreen level. canUse() returns true here so
            // hitting the ticker cap doesn't accidentally also block other
            // breaking-news interactions (e.g. opening the screen).
            return feature === 'breaking-news';
        }
      },

      remainingUses: (feature: GatedFeature, isPro: boolean): number => {
        // Same Pro-cap mirror as canUse — Pro is Infinity unless PRO_LIMITS
        // lists the feature, in which case we count the Pro user's bucket
        // against the higher cap.
        const limit = isPro ? (PRO_LIMITS[feature] ?? Infinity) : BASIC_LIMITS[feature];
        if (limit === Infinity) return Infinity;
        if (limit === 0) return 0;

        const state = get();
        const today = todayISO();
        const thisWeek = isoWeekKey();
        const thisMonth = monthKey();

        switch (feature) {
          case 'simulator':
            return state.lastUsageResetDate !== today ? limit : Math.max(0, limit - state.simulatorUsesToday);
          case 'arena':
            return state.lastUsageResetDate !== today ? limit : Math.max(0, limit - state.arenaChallengesToday);
          case 'chat':
            return state.lastUsageResetDate !== today ? limit : Math.max(0, limit - state.chatMessagesToday);
          case 'analyst-quick':
            return state.lastUsageResetDate !== today ? limit : Math.max(0, limit - state.analystQuickUsesToday);
          case 'analyst-deep':
            return state.lastUsageResetWeek !== thisWeek ? limit : Math.max(0, limit - state.analystDeepUsesThisWeek);
          case 'lesson-report':
            return state.lastUsageResetWeek !== thisWeek ? limit : Math.max(0, limit - state.lessonReportUsesThisWeek);
          case 'payslip':
            return state.lastUsageResetMonth !== thisMonth ? limit : Math.max(0, limit - state.payslipUsesThisMonth);
          case 'aiInsights':
            return state.lastUsageResetMonth !== thisMonth ? limit : Math.max(0, limit - state.aiInsightsUsesThisMonth);
          case 'saved_items':
          case 'breaking-news':
          case 'shark-voice':
            return Infinity;
        }
      },

      markProWelcomeSeen: () => {
        set({ hasSeenProWelcome: true });
      },

      markMod04PaywallSeen: () => {
        set({ hasSeenMod04Paywall: true });
      },

      markMod01bPaywallSeen: () => {
        set({ hasSeenMod01bPaywall: true });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'usage-storage-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        simulatorUsesToday: state.simulatorUsesToday,
        arenaChallengesToday: state.arenaChallengesToday,
        chatMessagesToday: state.chatMessagesToday,
        analystQuickUsesToday: state.analystQuickUsesToday,
        lastUsageResetDate: state.lastUsageResetDate,
        analystDeepUsesThisWeek: state.analystDeepUsesThisWeek,
        lessonReportUsesThisWeek: state.lessonReportUsesThisWeek,
        lastUsageResetWeek: state.lastUsageResetWeek,
        aiInsightsUsesThisMonth: state.aiInsightsUsesThisMonth,
        payslipUsesThisMonth: state.payslipUsesThisMonth,
        lastUsageResetMonth: state.lastUsageResetMonth,
        hasSeenProWelcome: state.hasSeenProWelcome,
        hasSeenMod04Paywall: state.hasSeenMod04Paywall,
        hasSeenMod01bPaywall: state.hasSeenMod01bPaywall,
      }),
    },
  ),
);

registerLocalStore('usage-storage-v1', useUsageStore, 'usage-storage-v1');
