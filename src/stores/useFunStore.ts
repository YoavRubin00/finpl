import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface MailContent {
  joke: string;
  fact: string;
}

interface FunState {
  hasUnreadMail: boolean;
  mailContent: MailContent | null;
  easterEggNodeId: string | null;
  lastMailDate: string | null;
  pizzaIndexSeen: boolean;
  _hydrated: boolean;
  refreshMail: (jokes: string[], facts: string[]) => void;
  openMail: () => void;
  rollEasterEgg: (completedModules: string[]) => void;
  claimEasterEgg: () => void;
}

const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const pickRandom = (arr: string[]): string =>
  arr[Math.floor(Math.random() * arr.length)];

export const useFunStore = create<FunState>()(
  persist(
    (set, get) => ({
      hasUnreadMail: false,
      mailContent: null,
      easterEggNodeId: null,
      lastMailDate: null,
      pizzaIndexSeen: false,
      _hydrated: false,

      refreshMail: (jokes: string[], facts: string[]) => {
        const today = getTodayDateString();
        if (get().lastMailDate === today) return;
        set({
          hasUnreadMail: true,
          mailContent: {
            joke: pickRandom(jokes),
            fact: pickRandom(facts),
          },
          lastMailDate: today,
        });
      },

      openMail: () => {
        set({ hasUnreadMail: false });
      },

      rollEasterEgg: (completedModules: string[]) => {
        if (completedModules.length === 0) return;
        const roll = Math.random();
        if (roll < 0.2) {
          const nodeId =
            completedModules[
              Math.floor(Math.random() * completedModules.length)
            ];
          set({ easterEggNodeId: nodeId });
        }
      },

      claimEasterEgg: () => {
        set({ easterEggNodeId: null });
      },
    }),
    {
      name: "fun-store",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useFunStore.setState({ _hydrated: true });
      },
    }
  )
);
