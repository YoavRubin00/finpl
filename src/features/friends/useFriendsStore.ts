import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { CommunityProfile } from './friendsTypes';
import { FRIEND_PROFILES } from './friendsData';

/** Simulated approval delay: 20-45 seconds. */
const APPROVE_DELAY_MIN_MS = 20_000;
const APPROVE_DELAY_MAX_MS = 45_000;

function randomApproveDelayMs(): number {
  return (
    APPROVE_DELAY_MIN_MS +
    Math.floor(Math.random() * (APPROVE_DELAY_MAX_MS - APPROVE_DELAY_MIN_MS))
  );
}

interface FriendsState {
  friendIds: string[];
  pendingIds: string[];

  /** Adds to pending; auto-approves (moves to friendIds) after 20-45s. */
  sendFriendRequest: (id: string) => void;
  removeFriend: (id: string) => void;
  /** FRIEND_PROFILES merged with the current friendship state. */
  getProfiles: () => CommunityProfile[];
}

export const useFriendsStore = create<FriendsState>()(
  persist(
    (set, get) => ({
      friendIds: [],
      pendingIds: [],

      sendFriendRequest: (id) => {
        const { friendIds, pendingIds } = get();
        if (friendIds.includes(id) || pendingIds.includes(id)) return;
        if (!FRIEND_PROFILES.some((p) => p.id === id)) return;

        set((state) => ({ pendingIds: [...state.pendingIds, id] }));

        // Simulated remote approval — the "friend" accepts after a short wait.
        setTimeout(() => {
          const current = get();
          if (!current.pendingIds.includes(id)) return; // request was cancelled/removed
          set((state) => ({
            pendingIds: state.pendingIds.filter((p) => p !== id),
            friendIds: state.friendIds.includes(id)
              ? state.friendIds
              : [...state.friendIds, id],
          }));
        }, randomApproveDelayMs());
      },

      removeFriend: (id) => {
        set((state) => ({
          friendIds: state.friendIds.filter((f) => f !== id),
          pendingIds: state.pendingIds.filter((p) => p !== id),
        }));
      },

      getProfiles: () => {
        const { friendIds, pendingIds } = get();
        return FRIEND_PROFILES.map((profile) => ({
          ...profile,
          isFriend: friendIds.includes(profile.id),
          requestPending: pendingIds.includes(profile.id),
        }));
      },
    }),
    {
      name: 'friends-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        friendIds: state.friendIds,
        pendingIds: state.pendingIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.friendIds)) state.friendIds = [];
        if (!Array.isArray(state.pendingIds)) state.pendingIds = [];
        // Approval timers don't survive an app restart — treat requests that
        // were pending when the app closed as approved ("accepted while away").
        if (state.pendingIds.length > 0) {
          const merged = [...state.friendIds];
          for (const id of state.pendingIds) {
            if (!merged.includes(id)) merged.push(id);
          }
          state.friendIds = merged;
          state.pendingIds = [];
        }
      },
    }
  )
);
