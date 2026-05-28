// src/features/auth/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { zustandStorage } from '../../lib/zustandStorage';
import type { UserProfile } from './types';
import { registerLocalStore } from '../../lib/stores/registry';
import { logCompletedRegistration, logOnboardingComplete } from '../../utils/fbEvents';
import { captureEvent, identifyUser, setPersonProperties } from '../../lib/posthog';

interface SessionState {
  userId: string | null;
  authId: string | null;
  displayName: string | null;
  email: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isGuest: boolean;
  /** Local profile blob — used by onboarding / settings / shop flows. */
  profile: UserProfile | null;
  /** Transient auth error surfaced as inline banner on login/register. */
  authError: string | null;
}

interface SessionActions {
  signIn: (params: { userId: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean }) => void;
  setOnboardingCompleted: (value: boolean) => void;
  setIsGuest: (value: boolean) => void;
  /** Enter guest mode (legacy onboarding path). */
  enterGuestMode: () => void;
  /** Convert an existing guest session into a real user account. */
  convertGuestToUser: (displayName: string, email: string) => void;
  /** Mark onboarding complete and store collected profile preferences. */
  completeOnboarding: (profile: UserProfile) => void;
  /** Patch the local profile blob (used by ProfilingFlow / EditProfileModal). */
  updateProfile: (partial: Partial<UserProfile>) => void;
  /** Set active avatar. */
  setAvatar: (id: string) => void;
  /** Add a newly-unlocked avatar to the owned list. */
  addOwnedAvatar: (id: string) => void;
  /** Delete the server profile row and wipe all local state. */
  deleteAccount: () => Promise<void>;
  /** Show an inline auth error banner. */
  setAuthError: (message: string | null) => void;
  clearAuthError: () => void;
  /** Wipe auth state. */
  clear: () => void;
  reset: () => void;
  devResetProgress?: () => void;
}

const initialState: SessionState = {
  userId: null,
  authId: null,
  displayName: null,
  email: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  isGuest: false,
  profile: null,
  authError: null,
};

export const useAuthStore = create<SessionState & SessionActions>()(
  persist(
    (set) => ({
      ...initialState,

      signIn: (params) =>
        set((state) => ({
          userId: params.userId,
          authId: params.authId,
          displayName: params.displayName,
          email: params.email,
          isAuthenticated: true,
          isGuest: false,
          authError: null,
          // Propagate hasCompletedOnboarding from the server profile so the
          // auth-redirect effect in _layout.tsx doesn't bounce a returning user
          // back to the onboarding flow on login. Falls back to current value
          // if the caller didn't provide one (legacy callers).
          hasCompletedOnboarding: params.hasCompletedOnboarding ?? state.hasCompletedOnboarding,
        })),

      setOnboardingCompleted: (value) => set({ hasCompletedOnboarding: value }),
      setIsGuest: (value) => set({ isGuest: value }),

      enterGuestMode: () => {
        set({ isAuthenticated: true, isGuest: true, displayName: 'אורח' });
        // Tag the anonymous distinct_id with is_guest=true so PostHog can
        // segment DAU/retention by guest vs registered without needing to
        // wait for a sign-in. Re-identify (with no userId) is invalid, so we
        // patch the current person via $set instead.
        setPersonProperties({ is_guest: true });
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
            financialGoal: 'unsure',
            knowledgeLevel: 'beginner',
            ageGroup: 'adult',
            birthYear: 2002,
            learningTime: 'during-day',
            learningStyle: 'no-preference',
            deadlineStress: 'maybe',
            dailyGoalMinutes: 10,
            companionId: 'warren-buffett',
            avatarId: null,
            ownedAvatars: [],
          },
        }));
        // Guest → real user IS a registration event for Facebook attribution.
        logCompletedRegistration('email');
        // Identify in PostHog so this conversion lands on a stable identity
        // and merges the prior anonymous events into the real person record.
        // Email-only registration (no OAuth) doesn't have a server-side
        // profile.id yet — use the email as the distinct_id; a subsequent
        // signInWithProfile via OAuth will re-identify with the canonical
        // profile.id and PostHog will alias the two.
        identifyUser(email, {
          email,
          displayName,
          auth_method: 'email',
          is_pro: false,
          is_guest: false,
        });
        // PostHog: this is the key monetization-funnel signal — a guest just
        // became a real user. The event went silent in the May 21 auth refactor;
        // restoring it here covers the email registration path. Google/Apple
        // paths fire the same event from lifecycle.signInWithProfile when the
        // pre-signin auth store was in guest mode.
        captureEvent('guest_converted_to_user', { method: 'email' });
        // Mirror the user_signed_in event from the lifecycle path so the
        // Activation Funnel works for email-registration too — RegisterScreen
        // doesn't go through signInWithProfile, so without this call the
        // funnel's step 3 never fires for the email path.
        captureEvent('user_signed_in', { method: 'email' });
        // Converting a guest also implies they already finished onboarding, since
        // they reached this conversion through the in-app upgrade flow.
        logOnboardingComplete();
      },

      completeOnboarding: (profile: UserProfile) => {
        set({ hasCompletedOnboarding: true, profile });
        logOnboardingComplete();
      },

      updateProfile: (partial) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : state.profile,
          ...(partial.displayName ? { displayName: partial.displayName } : {}),
        })),

      setAvatar: (id: string) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, avatarId: id } : state.profile,
        })),

      addOwnedAvatar: (id: string) =>
        set((state) => {
          if (!state.profile) return {};
          const owned = state.profile.ownedAvatars;
          if (owned.includes(id)) return {};
          return { profile: { ...state.profile, ownedAvatars: [...owned, id] } };
        }),

      deleteAccount: async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();
          if (keys.length > 0) await AsyncStorage.multiRemove(keys);
        } catch { /* ignore */ }
        set(initialState);
      },

      setAuthError: (message: string | null) => set({ authError: message }),
      clearAuthError: () => set({ authError: null }),

      clear: () => set(initialState),
      reset: () => set(initialState),

      ...(__DEV__
        ? {
            devResetProgress: () => {
              AsyncStorage.getAllKeys()
                .then((keys) => {
                  const toRemove = keys.filter((k) => k !== 'auth-store-v3');
                  if (toRemove.length > 0) AsyncStorage.multiRemove(toRemove);
                })
                .catch(() => { /* swallow */ });
            },
          }
        : {}),
    }),
    {
      name: 'auth-store-v3',
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        // Backfill: authenticated non-guest users who completed onboarding but
        // profile is null — initialize a safe default so screens never crash.
        if (
          state &&
          state.isAuthenticated &&
          !state.isGuest &&
          state.hasCompletedOnboarding &&
          !state.profile
        ) {
          state.profile = {
            displayName: state.displayName ?? 'משתמש',
            financialDream: null,
            financialGoal: 'unsure',
            knowledgeLevel: 'beginner',
            ageGroup: 'adult',
            birthYear: 2002,
            learningTime: 'during-day',
            learningStyle: 'no-preference',
            deadlineStress: 'maybe',
            dailyGoalMinutes: 10,
            companionId: 'warren-buffett',
            avatarId: null,
            ownedAvatars: [],
          };
        }
      },
      partialize: (state) => ({
        userId: state.userId,
        authId: state.authId,
        displayName: state.displayName,
        email: state.email,
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isGuest: state.isGuest,
        profile: state.profile,
      }),
    },
  ),
);

registerLocalStore('auth-store-v3', useAuthStore, 'auth-store-v3');
