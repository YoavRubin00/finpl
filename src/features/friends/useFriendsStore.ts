import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { CommunityProfile } from './friendsTypes';
import { FRIEND_PROFILES } from './friendsData';

interface FriendsState {
  friendIds: string[];
  pendingIds: string[];

  /**
   * Adds the id to pending. P0-2: there is NO auto-approval simulation — a real
   * friend graph will move pending→friend via a server callback. Until then a
   * request stays honestly pending (no fabricated "accepted" bot).
   */
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
        // Only real, known profiles can be befriended. FRIEND_PROFILES is empty
        // until a real friend-graph endpoint exists, so this is a safe no-op
        // today. NO auto-approve timer — no fabricated acceptance.
        if (!FRIEND_PROFILES.some((p) => p.id === id)) return;
        set((state) => ({ pendingIds: [...state.pendingIds, id] }));
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
        // Prune to ids that correspond to a real known profile. Because the old
        // build auto-"approved" fabricated bots, any persisted friendIds/
        // pendingIds are stale fakes; with FRIEND_PROFILES empty this clears
        // them, so no fabricated friend count leaks into the UI. NO pending→
        // friend auto-flip.
        const valid = new Set(FRIEND_PROFILES.map((p) => p.id));
        state.friendIds = Array.isArray(state.friendIds)
          ? state.friendIds.filter((id) => valid.has(id))
          : [];
        state.pendingIds = Array.isArray(state.pendingIds)
          ? state.pendingIds.filter((id) => valid.has(id))
          : [];
      },
    }
  )
);
