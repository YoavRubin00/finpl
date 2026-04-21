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

export type GatedFeature = "simulator" | "arena" | "chat" | "aiInsights" | "saved_items";

export const BASIC_LIMITS: Record<GatedFeature, number> = {
  simulator: 3,
  arena: 3,
  chat: 2,
  aiInsights: 0,
  saved_items: 0,
};

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

  // Practice-to-Refill (US-006), complete old lesson → +1 heart, max 2/day
  practiceRefillsToday: number;
  practiceRefillDate: string | null;
  pendingPracticeForHeart: boolean;

  // Selectors
  isPro: () => boolean;
  canAccessFeature: (feature: GatedFeature) => boolean;
  canUse: (feature: GatedFeature) => boolean;

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
      practiceRefillsToday: 0,
      practiceRefillDate: null,
      pendingPracticeForHeart: false,

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
        set({ hearts: current - 1, lastHeartLostAt: new Date().toISOString() });
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
        const DEV_PRO_EMAILS = ["itaysc23@gmail.com", "benbenshmuel@gmail.com"];
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
        // Dev override: grant PRO to specific emails
        if (!state) return;
        try {
          const auth = require("../auth/useAuthStore").useAuthStore.getState();
          const DEV_PRO_EMAILS = ["itaysc23@gmail.com", "benbenshmuel@gmail.com"];
          const normalizedEmail = auth.email?.trim().toLowerCase() ?? null;
          if (normalizedEmail && DEV_PRO_EMAILS.includes(normalizedEmail) && state.tier !== "pro") {
            state.tier = "pro";
            state.status = "active";
            state.hearts = 5;
            state.lastHeartLostAt = null;
          }
        } catch { /* auth store may not be ready */ }
      },
      version: 2,
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
        // pendingPracticeForHeart intentionally NOT persisted, transient flag
      }),
    }
  )
);
