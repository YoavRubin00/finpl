import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { zustandStorage } from '../../lib/zustandStorage';
import type { UserProfile } from "./types";
import { upsertUserProfile, deleteUserProfile } from "../../db/sync/syncUserProfile";
import { logoutRevenueCat } from "../../services/revenueCat";

interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  hasCompletedOnboarding: boolean;
  displayName: string | null;
  email: string | null;
  profile: UserProfile | null;
  createdAt: string | null;

  signIn: (displayName: string, email: string) => void;
  enterGuestMode: () => void;
  convertGuestToUser: (displayName: string, email: string) => void;
  completeOnboarding: (profile: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  setAvatar: (id: string) => void;
  addOwnedAvatar: (id: string) => void;
  signOut: () => void;
  deleteAccount: () => Promise<void>;
  devResetProgress: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isGuest: false,
      hasCompletedOnboarding: false,
      displayName: null,
      email: null,
      profile: null,
      createdAt: null,

      signIn: (displayName: string, email: string) => {
        set((state) => ({
          isAuthenticated: true,
          isGuest: false,
          // First-time OAuth sign-in (no profile yet) → route through onboarding.
          // Returning user (profile already persisted) → skip straight to tabs.
          hasCompletedOnboarding: state.profile !== null,
          displayName,
          email,
          createdAt: state.createdAt ?? new Date().toISOString(),
          // Safety default so downstream screens never crash on a null profile
          // if the user somehow lands outside the onboarding flow.
          profile: state.profile ?? {
            displayName,
            financialDream: null,
            financialGoal: "unsure",
            knowledgeLevel: "beginner",
            ageGroup: "adult",
            birthYear: 2002,
            learningTime: "during-day",
            learningStyle: "no-preference",
            deadlineStress: "maybe",
            dailyGoalMinutes: 10,
            companionId: "warren-buffett",
            avatarId: null,
            ownedAvatars: [],
          },
        }));
        upsertUserProfile(email, { displayName, email }).catch(() => { /* fire-and-forget */ });
      },

      enterGuestMode: () => {
        set((state) => ({ isAuthenticated: true, isGuest: true, displayName: "אורח/ת", createdAt: state.createdAt ?? new Date().toISOString() }));
      },

      convertGuestToUser: (displayName: string, email: string) => {
        set((state) => ({
          isGuest: false,
          hasCompletedOnboarding: true,
          displayName,
          email,
          profile: state.profile ?? {
            displayName,
            financialDream: null,
            financialGoal: "unsure",
            knowledgeLevel: "beginner",
            ageGroup: "adult",
            birthYear: 2002,
            learningTime: "during-day",
            learningStyle: "no-preference",
            deadlineStress: "maybe",
            dailyGoalMinutes: 10,
            companionId: "warren-buffett",
            avatarId: null,
            ownedAvatars: [],
          },
        }));
        upsertUserProfile(email, { displayName, email }).catch(() => { /* fire-and-forget */ });
      },

      completeOnboarding: (profile: UserProfile) => {
        set({ hasCompletedOnboarding: true, profile });
      },

      updateProfile: (partial) => {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : state.profile,
          ...(partial.displayName ? { displayName: partial.displayName } : {}),
        }));
      },

      setAvatar: (id: string) => {
        set((state) => ({
          profile: state.profile ? { ...state.profile, avatarId: id } : state.profile,
        }));
      },

      addOwnedAvatar: (id: string) => {
        set((state) => {
          if (!state.profile) return {};
          const owned = state.profile.ownedAvatars;
          if (owned.includes(id)) return {};
          return { profile: { ...state.profile, ownedAvatars: [...owned, id] } };
        });
      },

      signOut: () => {
        logoutRevenueCat().catch(() => { /* fire-and-forget */ });
        set({
          isAuthenticated: false,
          isGuest: false,
          hasCompletedOnboarding: false,
          displayName: null,
          email: null,
          profile: null,
          createdAt: null,
        });
      },

      deleteAccount: async () => {
        const email = useAuthStore.getState().email;
        // Best-effort: delete remote row first
        if (email) {
          try { await deleteUserProfile(email); } catch { /* ignore, proceed with local wipe */ }
        }
        try { await logoutRevenueCat(); } catch { /* ignore */ }
        // Wipe ALL local persisted state (every Zustand store + caches)
        try {
          const keys = await AsyncStorage.getAllKeys();
          if (keys.length > 0) await AsyncStorage.multiRemove(keys);
        } catch { /* ignore */ }
        set({
          isAuthenticated: false,
          isGuest: false,
          hasCompletedOnboarding: false,
          displayName: null,
          email: null,
          profile: null,
          createdAt: null,
        });
      },

      devResetProgress: () => {
        // Clear all stores except auth, user stays logged in but all progress resets
        const authKey = "auth-store-v2";
        AsyncStorage.getAllKeys().then((keys) => {
          const toRemove = keys.filter((k) => k !== authKey);
          if (toRemove.length > 0) AsyncStorage.multiRemove(toRemove);
        }).catch(() => { /* fire-and-forget */ });
      },
    }),
    {
      name: "auth-store-v2",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        // Backfill: authenticated non-guest users who signed in via OAuth
        // before the default-profile fix was shipped have profile=null.
        // Initialize a safe default so downstream code never crashes.
        if (
          state &&
          state.isAuthenticated &&
          !state.isGuest &&
          state.hasCompletedOnboarding &&
          !state.profile
        ) {
          state.profile = {
            displayName: state.displayName ?? "משתמש",
            financialDream: null,
            financialGoal: "unsure",
            knowledgeLevel: "beginner",
            ageGroup: "adult",
            birthYear: 2002,
            learningTime: "during-day",
            learningStyle: "no-preference",
            deadlineStress: "maybe",
            dailyGoalMinutes: 10,
            companionId: "warren-buffett",
            avatarId: null,
            ownedAvatars: [],
          };
        }
      },
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        displayName: state.displayName,
        email: state.email,
        profile: state.profile,
        createdAt: state.createdAt,
      }),
    }
  )
);
