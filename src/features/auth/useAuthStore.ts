import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
        set((state) => ({ isAuthenticated: true, isGuest: false, displayName, email, createdAt: state.createdAt ?? new Date().toISOString() }));
        // Fire-and-forget DB sync
        upsertUserProfile(email, { displayName, email }).catch(() => {});
      },

      enterGuestMode: () => {
        set((state) => ({ isAuthenticated: true, isGuest: true, displayName: "אורח/ת", createdAt: state.createdAt ?? new Date().toISOString() }));
      },

      convertGuestToUser: (displayName: string, email: string) => {
        set({ isGuest: false, displayName, email });
        upsertUserProfile(email, { displayName, email }).catch(() => {});
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
        logoutRevenueCat().catch(() => {});
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
          try { await deleteUserProfile(email); } catch { /* ignore — proceed with local wipe */ }
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
        // Clear all stores except auth — user stays logged in but all progress resets
        const authKey = "auth-store-v2";
        AsyncStorage.getAllKeys().then((keys) => {
          const toRemove = keys.filter((k) => k !== authKey);
          if (toRemove.length > 0) AsyncStorage.multiRemove(toRemove);
        }).catch(() => {});
      },
    }),
    {
      name: "auth-store-v2",
      storage: createJSONStorage(() => AsyncStorage),
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
