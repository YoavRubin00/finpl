import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';

interface FeedInteractionsState {
  likedIds: Record<string, boolean>;
  savedIds: Record<string, boolean>;
  likeCounts: Record<string, number>;
  toggleLike: (id: string, baseLikes: number) => void;
  toggleSave: (id: string) => void;
  isLiked: (id: string) => boolean;
  isSaved: (id: string) => boolean;
  getLikes: (id: string, baseLikes: number) => number;
  isVideoActive: boolean;
  setIsVideoActive: (active: boolean) => void;
}

export const useFeedInteractionsStore = create<FeedInteractionsState>()(
  persist(
    (set, get) => ({
      likedIds: {},
      savedIds: {},
      likeCounts: {},
      isVideoActive: false,
      setIsVideoActive: (active) => set({ isVideoActive: active }),

      toggleLike: (id, baseLikes) => {
        const wasLiked = !!get().likedIds[id];
        set((s) => ({
          likedIds: { ...s.likedIds, [id]: !wasLiked },
          likeCounts: {
            ...s.likeCounts,
            [id]: wasLiked ? baseLikes : baseLikes + 1,
          },
        }));
      },

      toggleSave: (id) => {
        const wasSaved = !!get().savedIds[id];
        set((s) => ({
          savedIds: { ...s.savedIds, [id]: !wasSaved },
        }));
      },

      isLiked: (id) => !!get().likedIds[id],
      isSaved: (id) => !!get().savedIds[id],
      getLikes: (id, baseLikes) => get().likeCounts[id] ?? baseLikes,
    }),
    {
      name: "feed-interactions-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        likedIds: s.likedIds,
        savedIds: s.savedIds,
        likeCounts: s.likeCounts,
      }),
    },
  ),
);
