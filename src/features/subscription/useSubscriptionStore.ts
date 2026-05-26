import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { SubscriptionTier, SubscriptionStatus } from "./types";
import {
  checkProEntitlement,
  restorePurchases,
  onCustomerInfoUpdated,
  RC_ENTITLEMENT_PRO,
} from "../../services/revenueCat";
import type { CustomerInfo } from "../../services/revenueCat";

export type GatedFeature =
  | "simulator"
  | "arena"
  | "chat"
  | "aiInsights"
  | "saved_items"
  | "shark-voice"
  | "analyst-quick"
  | "analyst-deep"
  | "breaking-news";

export const BASIC_LIMITS: Record<GatedFeature, number> = {
  simulator: 3,
  arena: 3,
  chat: 3,
  aiInsights: 0,
  saved_items: 0,
  "shark-voice": 0,
  "analyst-quick": 1, // free: 1 quick analysis per day
  "analyst-deep": 0, // free: lifetime cap of 1 deep analysis (tracked separately)
  "breaking-news": 1, // free: track 1 ticker for daily AI summaries
};

export const BREAKING_NEWS_PRO_TICKER_CAP = 5;

export const SHARK_VOICE_DAILY_CAP_SECONDS = 600;
/** One free taste-test for non-Pro users — they get a single minute,
 *  lifetime, then hit the upgrade prompt. */
export const SHARK_VOICE_FREE_LIFETIME_SECONDS = 60;
export const ANALYST_DEEP_LIFETIME_FREE_LIMIT = 1;

/* ------------------------------------------------------------------ */
/*  Hearts constants                                                   */
/* ------------------------------------------------------------------ */

const MAX_HEARTS = 5;
const HEART_REFILL_MS = 5 * 60 * 60 * 1000; // 5 hours per heart

/* ------------------------------------------------------------------ */
/*  Store interface                                                    */
/* ------------------------------------------------------------------ */

interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  endDate: string | null;

  // Daily usage counters
  simulatorUsesToday: number;
  arenaChallengesToday: number;
  chatMessagesToday: number;
  lastUsageResetDate: string | null;

  // Hearts system (PRD14)
  hearts: number;
  lastHeartLostAt: string | null;
  // Non-persisted: resets on cold-start, used by upgrade_trigger_timing bandit experiment
  sessionHeartsLost: number;

  // Practice-to-Refill (US-006), complete old lesson → +1 heart, max 2/day
  practiceRefillsToday: number;
  practiceRefillDate: string | null;
  pendingPracticeForHeart: boolean;

  // Shark Voice — 1-on-1 live call.
  //   Pro:  10 min/day (sharkVoiceSecondsToday + sharkVoiceResetDate).
  //   Free: 1 min lifetime taste-test (sharkVoiceSecondsUsedFree, never resets).
  sharkVoiceSecondsToday: number;
  sharkVoiceResetDate: string | null;
  sharkVoiceSecondsUsedFree: number;

  // Stock Analyst (free: 1 quick/day + 1 deep lifetime; Pro: unlimited)
  analystQuickUsedToday: number;
  analystQuickResetDate: string | null;
  analystDeepUsedLifetime: number;

  // Selectors
  isPro: () => boolean;
  canAccessFeature: (feature: GatedFeature) => boolean;
  canUse: (feature: GatedFeature) => boolean;

  // Shark Voice selectors
  getSharkVoiceSecondsRemaining: () => number;
  canUseSharkVoice: () => boolean;

  // Stock Analyst selectors
  canUseAnalystQuick: () => boolean;
  canUseAnalystDeep: () => boolean;
  getAnalystQuickRemaining: () => number;
  getAnalystDeepRemaining: () => number;

  // Hearts selectors
  getHearts: () => number;
  hasHearts: () => boolean;

  // Actions
  setSubscription: (
    tier: SubscriptionTier,
    status: SubscriptionStatus,
    endDate: string | null,
  ) => void;
  incrementUsage: (feature: GatedFeature) => void;
  resetDailyUsageIfNeeded: () => void;

  // Hearts actions
  useHeart: () => boolean;
  refillHearts: () => void;
  restoreAllHearts: () => void;

  // Practice-to-Refill actions (US-006)
  startPracticeForHeart: () => boolean; // true = under daily limit, flag set
  grantPracticeHeart: () => boolean; // called at lesson completion; +1 heart if flag set
  clearPracticeFlag: () => void; // bail-out if user navigates away

  // Shark Voice actions
  recordSharkVoiceUsage: (seconds: number) => void;

  // Stock Analyst actions
  recordAnalystQuickUsage: () => void;
  recordAnalystDeepUsage: () => void;

  // Pro actions
  upgradeToPro: () => void;
  downgradeToFree: () => void;

  // RevenueCat sync
  syncWithRevenueCat: () => Promise<void>;
  restoreSubscription: () => Promise<boolean>;
  startRevenueCatListener: () => () => void;

  // Pro welcome
  hasSeenProWelcome: boolean;
  markProWelcomeSeen: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsageCount(
  state: SubscriptionState,
  feature: GatedFeature
): number {
  switch (feature) {
    case "simulator":
      return state.simulatorUsesToday;
    case "arena":
      return state.arenaChallengesToday;
    case "chat":
      return state.chatMessagesToday;
    case "aiInsights":
      return 0;
    case "saved_items":
      return 0;
    case "shark-voice":
      return 0;
    case "analyst-quick":
      return state.analystQuickResetDate === todayISO() ? state.analystQuickUsedToday : 0;
    case "analyst-deep":
      return state.analystDeepUsedLifetime;
    case "breaking-news":
      return 0;
  }
}

/** Calculate how many hearts should be refilled since last loss */
function calcHeartRefills(lastLostAt: string | null, currentHearts: number): number {
  if (!lastLostAt || currentHearts >= MAX_HEARTS) return 0;
  const elapsed = Math.max(0, Date.now() - new Date(lastLostAt).getTime());
  const refills = Math.floor(elapsed / HEART_REFILL_MS);
  return Math.min(refills, MAX_HEARTS - currentHearts);
}

/** Time until next heart refill in ms */
export function getTimeUntilNextHeart(lastLostAt: string | null, currentHearts: number): number {
  if (!lastLostAt || currentHearts >= MAX_HEARTS) return 0;
  const elapsed = Math.max(0, Date.now() - new Date(lastLostAt).getTime());
  const remaining = HEART_REFILL_MS - (elapsed % HEART_REFILL_MS);
  return remaining;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: "basic",
      status: "expired",
      endDate: null,

      simulatorUsesToday: 0,
      arenaChallengesToday: 0,
      chatMessagesToday: 0,
      lastUsageResetDate: null,

      // Hearts
      hearts: MAX_HEARTS,
      lastHeartLostAt: null,
      sessionHeartsLost: 0,
      practiceRefillsToday: 0,
      practiceRefillDate: null,
      pendingPracticeForHeart: false,

      // Shark Voice
      sharkVoiceSecondsToday: 0,
      sharkVoiceResetDate: null,
      sharkVoiceSecondsUsedFree: 0,

      // Stock Analyst
      analystQuickUsedToday: 0,
      analystQuickResetDate: null,
      analystDeepUsedLifetime: 0,

      // Pro welcome
      hasSeenProWelcome: false,

      /* ---- Selectors ---- */

      isPro: (): boolean => {
        const { tier, status } = get();
        return tier === "pro" && status === "active";
      },

      canAccessFeature: (feature: GatedFeature): boolean => {
        const state = get();
        if (state.isPro()) return true;
        if (feature === "aiInsights") return false;
        if (feature === "shark-voice") return false;
        return true;
      },

      canUse: (feature: GatedFeature): boolean => {
        const state = get();
        if (state.isPro()) return true;

        // Pure check: if we're on a new day, we assume we *can* use it (it will be reset on first action)
        const today = todayISO();
        if (state.lastUsageResetDate !== today) return true;

        const limit = BASIC_LIMITS[feature];
        if (limit === 0) return false;
        return getUsageCount(state, feature) < limit;
      },

      /* ---- Hearts selectors ---- */

      getHearts: (): number => {
        const state = get();
        if (state.isPro()) return Infinity;
        const refills = calcHeartRefills(state.lastHeartLostAt, state.hearts);
        if (refills > 0) {
          return Math.min(state.hearts + refills, MAX_HEARTS);
        }
        return state.hearts;
      },

      hasHearts: (): boolean => {
        return get().getHearts() > 0;
      },

      /* ---- Shark Voice selectors ---- */

      getSharkVoiceSecondsRemaining: (): number => {
        const state = get();
        if (!state.isPro()) {
          return Math.max(0, SHARK_VOICE_FREE_LIFETIME_SECONDS - state.sharkVoiceSecondsUsedFree);
        }
        const today = todayISO();
        const usedToday = state.sharkVoiceResetDate === today ? state.sharkVoiceSecondsToday : 0;
        return Math.max(0, SHARK_VOICE_DAILY_CAP_SECONDS - usedToday);
      },

      canUseSharkVoice: (): boolean => {
        return get().getSharkVoiceSecondsRemaining() > 0;
      },

      /* ---- Stock Analyst selectors ---- */

      canUseAnalystQuick: (): boolean => {
        const state = get();
        if (state.isPro()) return true;
        return state.getAnalystQuickRemaining() > 0;
      },

      canUseAnalystDeep: (): boolean => {
        const state = get();
        if (state.isPro()) return true;
        return state.getAnalystDeepRemaining() > 0;
      },

      getAnalystQuickRemaining: (): number => {
        const state = get();
        if (state.isPro()) return Infinity;
        const today = todayISO();
        const usedToday = state.analystQuickResetDate === today ? state.analystQuickUsedToday : 0;
        return Math.max(0, BASIC_LIMITS["analyst-quick"] - usedToday);
      },

      getAnalystDeepRemaining: (): number => {
        const state = get();
        if (state.isPro()) return Infinity;
        return Math.max(0, ANALYST_DEEP_LIFETIME_FREE_LIMIT - state.analystDeepUsedLifetime);
      },

      /* ---- Actions ---- */

      setSubscription: (tier, status, endDate) => {
        set({ tier, status, endDate });
      },

      incrementUsage: (feature: GatedFeature) => {
        const state = get();
        state.resetDailyUsageIfNeeded();
        switch (feature) {
          case "simulator":
            set((s) => ({ simulatorUsesToday: s.simulatorUsesToday + 1 }));
            break;
          case "arena":
            set((s) => ({ arenaChallengesToday: s.arenaChallengesToday + 1 }));
            break;
          case "chat":
            set((s) => ({ chatMessagesToday: s.chatMessagesToday + 1 }));
            break;
          case "aiInsights":
            break;
          case "saved_items":
            break;
        }
      },

      resetDailyUsageIfNeeded: () => {
        const { lastUsageResetDate } = get();
        const today = todayISO();
        if (lastUsageResetDate !== today) {
          set({
            simulatorUsesToday: 0,
            arenaChallengesToday: 0,
            chatMessagesToday: 0,
            lastUsageResetDate: today,
          });
        }
      },

      /* ---- Hearts actions ---- */

      useHeart: (): boolean => {
        const state = get();
        if (state.isPro()) return true;
        state.refillHearts();
        const current = get().hearts;
        if (current <= 0) return false;
        set((s) => ({ hearts: current - 1, lastHeartLostAt: new Date().toISOString(), sessionHeartsLost: s.sessionHeartsLost + 1 }));
        return true;
      },

      refillHearts: () => {
        const state = get();
        const refills = calcHeartRefills(state.lastHeartLostAt, state.hearts);
        if (refills > 0) {
          set({ hearts: Math.min(state.hearts + refills, MAX_HEARTS) });
        }
      },

      restoreAllHearts: () => {
        set({ hearts: MAX_HEARTS, lastHeartLostAt: null });
      },

      /* ---- Practice-to-Refill (US-006) ---- */

      startPracticeForHeart: (): boolean => {
        const MAX_PRACTICE_REFILLS_PER_DAY = 2;
        const today = todayISO();
        const { practiceRefillDate, practiceRefillsToday } = get();
        const count = practiceRefillDate === today ? practiceRefillsToday : 0;
        if (count >= MAX_PRACTICE_REFILLS_PER_DAY) return false;
        set({ pendingPracticeForHeart: true });
        return true;
      },

      grantPracticeHeart: (): boolean => {
        const MAX_PRACTICE_REFILLS_PER_DAY = 2;
        const today = todayISO();
        const state = get();
        if (!state.pendingPracticeForHeart) return false;
        const count = state.practiceRefillDate === today ? state.practiceRefillsToday : 0;
        if (count >= MAX_PRACTICE_REFILLS_PER_DAY) {
          set({ pendingPracticeForHeart: false });
          return false;
        }
        const currentHearts = state.hearts;
        if (currentHearts >= MAX_HEARTS) {
          set({ pendingPracticeForHeart: false });
          return false;
        }
        set({
          hearts: currentHearts + 1,
          lastHeartLostAt: currentHearts + 1 >= MAX_HEARTS ? null : state.lastHeartLostAt,
          practiceRefillsToday: count + 1,
          practiceRefillDate: today,
          pendingPracticeForHeart: false,
        });
        return true;
      },

      clearPracticeFlag: () => {
        set({ pendingPracticeForHeart: false });
      },

      /* ---- Shark Voice actions ---- */

      recordSharkVoiceUsage: (seconds: number) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        const state = get();
        if (!state.isPro()) {
          set({
            sharkVoiceSecondsUsedFree: state.sharkVoiceSecondsUsedFree + seconds,
          });
          return;
        }
        const today = todayISO();
        const usedToday = state.sharkVoiceResetDate === today ? state.sharkVoiceSecondsToday : 0;
        set({
          sharkVoiceSecondsToday: usedToday + seconds,
          sharkVoiceResetDate: today,
        });
      },

      /* ---- Stock Analyst actions ---- */

      recordAnalystQuickUsage: () => {
        const today = todayISO();
        const state = get();
        const usedToday = state.analystQuickResetDate === today ? state.analystQuickUsedToday : 0;
        set({
          analystQuickUsedToday: usedToday + 1,
          analystQuickResetDate: today,
        });
      },

      recordAnalystDeepUsage: () => {
        set((s) => ({ analystDeepUsedLifetime: s.analystDeepUsedLifetime + 1 }));
      },

      /* ---- Pro actions ---- */

      upgradeToPro: () => {
        set({
          tier: "pro",
          status: "active",
          hearts: MAX_HEARTS,
          lastHeartLostAt: null,
        });
      },

      downgradeToFree: () => {
        set({
          tier: "basic",
          status: "active",
          endDate: null,
        });
      },

      /* ---- RevenueCat sync ---- */

      syncWithRevenueCat: async () => {
        const DEV_PRO_EMAILS = ["itaysc23@gmail.com", "benbenshmuel@gmail.com", "yrubin00@gmail.com"];
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const auth = require("../auth/useAuthStore").useAuthStore.getState();
          const normalizedEmail = auth.email?.trim().toLowerCase() ?? null;
          if (normalizedEmail && DEV_PRO_EMAILS.includes(normalizedEmail)) {
            set({ tier: "pro", status: "active", hearts: MAX_HEARTS, lastHeartLostAt: null });
            return;
          }
          const isPro = await checkProEntitlement();
          const currentState = get();
          if (isPro && currentState.tier !== "pro") {
            set({ tier: "pro", status: "active", hearts: MAX_HEARTS, lastHeartLostAt: null });
          } else if (!isPro && currentState.tier === "pro") {
            set({ tier: "basic", status: "expired", endDate: null });
          }
        } catch {
          // Silently fail, keep local state as-is when offline
        }
      },

      restoreSubscription: async (): Promise<boolean> => {
        try {
          const customerInfo = await restorePurchases();
          const isPro = customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
          if (isPro) {
            set({ tier: "pro", status: "active", hearts: MAX_HEARTS, lastHeartLostAt: null });
          }
          return isPro;
        } catch {
          return false;
        }
      },

      startRevenueCatListener: (): (() => void) => {
        const handleUpdate = (info: CustomerInfo) => {
          const isPro = info.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
          if (isPro) {
            set({ tier: "pro", status: "active", hearts: MAX_HEARTS, lastHeartLostAt: null });
          } else {
            set({ tier: "basic", status: "expired", endDate: null });
          }
        };
        return onCustomerInfoUpdated(handleUpdate);
      },

      markProWelcomeSeen: () => {
        set({ hasSeenProWelcome: true });
      },
    }),
    {
      name: "subscription-storage",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Clamp legacy hearts values: previous builds had MAX_HEARTS = 5/3.
        // Without this, returning users keep their persisted value and the UI
        // either renders too few or too many slots vs MAX_HEARTS = 4.
        if (typeof state.hearts === "number" && state.hearts > MAX_HEARTS) {
          state.hearts = MAX_HEARTS;
        }
        // ⚠️ DEV OVERRIDE — unconditionally grant PRO for testing (no email check).
        // Remove this block to restore real entitlement flow.
        state.tier = "pro";
        state.status = "active";
        state.hearts = MAX_HEARTS;
        state.lastHeartLostAt = null;
      },
      version: 5,
      migrate: (persisted: unknown, _version: number) => {
        const safe = (persisted ?? {}) as Record<string, unknown>;
        return {
          ...safe,
          sharkVoiceSecondsToday: safe.sharkVoiceSecondsToday ?? 0,
          sharkVoiceResetDate: safe.sharkVoiceResetDate ?? null,
          sharkVoiceSecondsUsedFree: safe.sharkVoiceSecondsUsedFree ?? 0,
          analystQuickUsedToday: 0,
          analystQuickResetDate: null,
          analystDeepUsedLifetime: 0,
        };
      },
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        tier: state.tier,
        status: state.status,
        endDate: state.endDate,
        simulatorUsesToday: state.simulatorUsesToday,
        arenaChallengesToday: state.arenaChallengesToday,
        chatMessagesToday: state.chatMessagesToday,
        lastUsageResetDate: state.lastUsageResetDate,
        hearts: state.hearts,
        lastHeartLostAt: state.lastHeartLostAt,
        hasSeenProWelcome: state.hasSeenProWelcome,
        practiceRefillsToday: state.practiceRefillsToday,
        practiceRefillDate: state.practiceRefillDate,
        sharkVoiceSecondsToday: state.sharkVoiceSecondsToday,
        sharkVoiceResetDate: state.sharkVoiceResetDate,
        sharkVoiceSecondsUsedFree: state.sharkVoiceSecondsUsedFree,
        analystQuickUsedToday: state.analystQuickUsedToday,
        analystQuickResetDate: state.analystQuickResetDate,
        analystDeepUsedLifetime: state.analystDeepUsedLifetime,
        // pendingPracticeForHeart intentionally NOT persisted, transient flag
      }),
    }
  )
);
