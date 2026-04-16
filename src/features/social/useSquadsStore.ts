import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { Squad, SquadMember, SquadTier } from "./squadTypes";
import {
  MOCK_MEMBERS,
  MAX_SQUAD_MEMBERS,
  generateInviteCode,
  computeTier,
  computeChestReward,
  getISOWeekKey,
  lookupSquadByCode,
} from "./squadData";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useAuthStore } from "../auth/useAuthStore";

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface SquadsState {
  squad: Squad | null;
  hasClaimedWeeklyChest: boolean;
  /** ISO week key for the current active week (e.g. "2026-W11") */
  activeWeekKey: string;

  createSquad: (name: string) => void;
  joinSquad: (inviteCode: string) => boolean;
  leaveSquad: () => void;
  contributeXP: (xp: number) => void;
  claimWeeklyChest: () => void;
  resetWeekly: () => void;
  /** Check if a new week has started and auto-reset if needed */
  checkWeeklyReset: () => void;
}

function buildSelfMember(): SquadMember {
  const auth = useAuthStore.getState();
  const id = auth.email ?? "self";
  return {
    id,
    name: auth.displayName ?? "אתה",
    avatar: `https://api.dicebear.com/7.x/thumbs/png?seed=${id}`,
    weeklyXP: 0,
  };
}

// Track previous XP to compute deltas for squad contribution
let _prevXP = useEconomyStore.getState().xp;

export const useSquadsStore = create<SquadsState>()(
  persist(
    (set, get) => ({
      squad: null,
      hasClaimedWeeklyChest: false,
      activeWeekKey: getISOWeekKey(new Date()),

      createSquad: (name: string) => {
        const self = buildSelfMember();
        // Add a few mock members for demo
        const members: SquadMember[] = [self, ...MOCK_MEMBERS.slice(0, 3)];
        const weeklyScore = members.reduce((sum, m) => sum + m.weeklyXP, 0);
        const squad: Squad = {
          id: `squad-${Date.now()}`,
          name,
          inviteCode: generateInviteCode(),
          tier: computeTier(weeklyScore),
          members,
          weeklyScore,
          rank: 4, // mock starting rank
          createdAt: new Date().toISOString(),
        };
        set({ squad, hasClaimedWeeklyChest: false });
      },

      joinSquad: (inviteCode: string) => {
        const listing = lookupSquadByCode(inviteCode);
        if (!listing) return false;

        const self = buildSelfMember();
        // Take mock members up to listing count (minus self)
        const mockCount = Math.min(listing.memberCount - 1, MOCK_MEMBERS.length);
        const members: SquadMember[] = [self, ...MOCK_MEMBERS.slice(0, mockCount)];
        const weeklyScore = members.reduce((sum, m) => sum + m.weeklyXP, 0);
        const squad: Squad = {
          id: `squad-${Date.now()}`,
          name: listing.name,
          inviteCode: inviteCode.toUpperCase(),
          tier: computeTier(weeklyScore),
          members,
          weeklyScore,
          rank: 3,
          createdAt: new Date().toISOString(),
        };
        set({ squad, hasClaimedWeeklyChest: false });
        return true;
      },

      leaveSquad: () => {
        set({ squad: null, hasClaimedWeeklyChest: false });
      },

      contributeXP: (xp: number) => {
        const { squad } = get();
        if (!squad) return;

        const auth = useAuthStore.getState();
        const selfId = auth.email ?? "self";

        const updatedMembers = squad.members.map((m) => {
          if (m.id === selfId) {
            // User's own contribution
            return { ...m, weeklyXP: m.weeklyXP + xp };
          }
          // Simulate mock member activity: each mock member earns 0-20% of user's XP
          const mockGain = Math.floor(Math.random() * 0.2 * xp);
          return mockGain > 0 ? { ...m, weeklyXP: m.weeklyXP + mockGain } : m;
        });

        const newScore = updatedMembers.reduce((sum, m) => sum + m.weeklyXP, 0);

        set({
          squad: {
            ...squad,
            members: updatedMembers,
            weeklyScore: newScore,
            tier: computeTier(newScore),
          },
        });
      },

      claimWeeklyChest: () => {
        const { squad, hasClaimedWeeklyChest } = get();
        if (!squad || hasClaimedWeeklyChest) return;

        const reward = computeChestReward(squad.tier, squad.rank);
        useEconomyStore.getState().addCoins(reward.coins);
        useEconomyStore.getState().addGems(reward.gems);
        set({ hasClaimedWeeklyChest: true });
      },

      resetWeekly: () => {
        const { squad } = get();
        if (!squad) return;

        const resetMembers = squad.members.map((m) => ({ ...m, weeklyXP: 0 }));
        set({
          squad: {
            ...squad,
            members: resetMembers,
            weeklyScore: 0,
            tier: "bronze" as SquadTier,
          },
          hasClaimedWeeklyChest: false,
          activeWeekKey: getISOWeekKey(new Date()),
        });
      },

      checkWeeklyReset: () => {
        const { squad, activeWeekKey } = get();
        if (!squad) return;

        const currentWeek = getISOWeekKey(new Date());
        if (currentWeek !== activeWeekKey) {
          get().resetWeekly();
        }
      },
    }),
    {
      name: "squads-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        squad: state.squad,
        hasClaimedWeeklyChest: state.hasClaimedWeeklyChest,
        activeWeekKey: state.activeWeekKey,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Auto-contribute: whenever user earns XP, forward the delta to the squad
// ---------------------------------------------------------------------------
useEconomyStore.subscribe((state) => {
  const delta = state.xp - _prevXP;
  if (delta > 0) {
    useSquadsStore.getState().contributeXP(delta);
  }
  _prevXP = state.xp;
});
