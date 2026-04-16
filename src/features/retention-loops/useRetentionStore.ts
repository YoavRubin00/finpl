import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { Chest, ChestRarity, DailySpin } from "./types";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useNotificationStore } from "../notifications/useNotificationStore";

const MAX_CHEST_SLOTS = 4;

const CHEST_COIN_REWARDS: Record<ChestRarity, number> = {
  common: 25,
  rare: 75,
  epic: 200,
};

const DAILY_SPIN_REWARDS = [20, 30, 50, 75, 100] as const;

interface RetentionState {
  chestSlots: (Chest | null)[];
  dailySpin: DailySpin;
  startUnlockingChest: (chestId: string) => void;
  openReadyChest: (chestId: string) => number;
  instantOpenChestById: (chestId: string) => number;
  instantOpenOldestChest: () => number;
  spinDailyWheel: () => number;
  grantChest: (chest: Omit<Chest, "status" | "unlockStartedAt">) => boolean;
}

const MOCK_CHEST_SLOTS: (Chest | null)[] = [
  {
    id: "chest-1",
    name: "Silver Chest",
    rarity: "common",
    unlockTimeMinutes: 15,
    status: "locked",
    unlockStartedAt: null,
  },
  {
    id: "chest-2",
    name: "Golden Chest",
    rarity: "rare",
    unlockTimeMinutes: 180,
    status: "locked",
    unlockStartedAt: null,
  },
  null,
  null,
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useRetentionStore = create<RetentionState>()(
  persist(
    (set, get) => ({
      chestSlots: MOCK_CHEST_SLOTS,
      dailySpin: { lastSpinDate: null },

      startUnlockingChest: (chestId: string) => {
        const { chestSlots } = get();
        const alreadyUnlocking = chestSlots.some(
          (slot) => slot !== null && slot.status === "unlocking"
        );
        if (alreadyUnlocking) return;

        set({
          chestSlots: chestSlots.map((slot) => {
            if (slot === null || slot.id !== chestId) return slot;
            if (slot.status !== "locked") return slot;
            return {
              ...slot,
              status: "unlocking" as const,
              unlockStartedAt: new Date().toISOString(),
            };
          }),
        });

        // Schedule chest-ready notification
        const chest = chestSlots.find((s) => s !== null && s.id === chestId);
        if (chest) {
          const delayMs = chest.unlockTimeMinutes * 60 * 1000;
          useNotificationStore.getState().scheduleChestReady(delayMs);
        }
      },

      openReadyChest: (chestId: string): number => {
        const { chestSlots } = get();
        const chest = chestSlots.find(
          (slot) => slot !== null && slot.id === chestId && slot.status === "ready"
        );
        if (!chest) return 0;

        const reward = CHEST_COIN_REWARDS[chest.rarity];
        useEconomyStore.getState().addCoins(reward);

        set({
          chestSlots: chestSlots.map((slot) =>
            slot !== null && slot.id === chestId ? null : slot
          ),
        });

        return reward;
      },

      instantOpenChestById: (chestId: string): number => {
        const { chestSlots } = get();
        const chestIndex = chestSlots.findIndex(
          (slot) => slot !== null && slot.id === chestId
        );
        if (chestIndex === -1) return 0;

        const chest = chestSlots[chestIndex]!;
        const reward = CHEST_COIN_REWARDS[chest.rarity];
        useEconomyStore.getState().addCoins(reward);

        set({
          chestSlots: chestSlots.map((slot, i) =>
            i === chestIndex ? null : slot
          ),
        });

        return reward;
      },

      instantOpenOldestChest: (): number => {
        const { chestSlots } = get();
        const oldestIndex = chestSlots.findIndex((slot) => slot !== null);
        if (oldestIndex === -1) return 0;

        const chest = chestSlots[oldestIndex]!;
        const reward = CHEST_COIN_REWARDS[chest.rarity];
        useEconomyStore.getState().addCoins(reward);

        set({
          chestSlots: chestSlots.map((slot, i) =>
            i === oldestIndex ? null : slot
          ),
        });

        return reward;
      },

      spinDailyWheel: (): number => {
        const { dailySpin } = get();
        const today = todayISO();
        if (dailySpin.lastSpinDate === today) return 0;

        const reward =
          DAILY_SPIN_REWARDS[
            Math.floor(Math.random() * DAILY_SPIN_REWARDS.length)
          ];
        useEconomyStore.getState().addCoins(reward);

        set({ dailySpin: { lastSpinDate: today } });
        return reward;
      },

      grantChest: (chest: Omit<Chest, "status" | "unlockStartedAt">): boolean => {
        const { chestSlots } = get();
        const emptyIndex = chestSlots.indexOf(null);
        if (emptyIndex === -1) return false;

        const newSlots = [...chestSlots];
        newSlots[emptyIndex] = {
          ...chest,
          status: "locked",
          unlockStartedAt: null,
        };
        set({ chestSlots: newSlots });
        return true;
      },
    }),
    {
      name: "retention-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        chestSlots: state.chestSlots,
        dailySpin: state.dailySpin,
      }),
    }
  )
);

export { MAX_CHEST_SLOTS, CHEST_COIN_REWARDS, DAILY_SPIN_REWARDS };
