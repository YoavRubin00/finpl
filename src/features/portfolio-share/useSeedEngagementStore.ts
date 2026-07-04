import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { RatedComment } from '../../db/sync/syncPortfolioShare';

/**
 * Local engagement on the cold-start example portfolios (Yoav ruling 2026-07-04:
 * the examples must feel like real posts — stars/like/comment must WORK).
 *
 * Honesty guard-rails: everything here is the USER'S OWN real action, persisted
 * on-device only. Counts shown are derived exclusively from these actions
 * (your like → likeCount 1) — never a fabricated crowd. Nothing is sent to the
 * server (seed ids have no server rows), and it all retires with the seeds the
 * moment a real shared portfolio exists.
 */
interface SeedEngagementState {
  likedSeeds: Record<string, boolean>;
  seedRatings: Record<string, number>;
  seedComments: Record<string, RatedComment[]>;

  toggleSeedLike: (seedId: string) => void;
  rateSeed: (seedId: string, stars: number) => void;
  addSeedComment: (
    seedId: string,
    body: string,
    authorName: string,
    authorAvatarId: string | null,
  ) => void;
}

export const useSeedEngagementStore = create<SeedEngagementState>()(
  persist(
    (set) => ({
      likedSeeds: {},
      seedRatings: {},
      seedComments: {},

      toggleSeedLike: (seedId) =>
        set((state) => ({
          likedSeeds: { ...state.likedSeeds, [seedId]: !state.likedSeeds[seedId] },
        })),

      rateSeed: (seedId, stars) =>
        set((state) => ({
          seedRatings: { ...state.seedRatings, [seedId]: Math.min(5, Math.max(1, Math.round(stars))) },
        })),

      addSeedComment: (seedId, body, authorName, authorAvatarId) =>
        set((state) => {
          const comment: RatedComment = {
            id: `seedc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            authorName,
            authorAvatarId,
            body,
            createdAt: new Date().toISOString(),
            isSelf: true,
          };
          const existing = state.seedComments[seedId] ?? [];
          return { seedComments: { ...state.seedComments, [seedId]: [...existing, comment] } };
        }),
    }),
    {
      name: 'seed-engagement-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
