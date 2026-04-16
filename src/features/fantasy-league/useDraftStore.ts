import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import type { DraftPick, DraftState } from "./draftTypes";
import { TOTAL_ROUNDS, getCurrentWeekId } from "./draftData";

interface DraftActions {
  initWeek: () => void;
  makePick: (assetId: string, categoryId: string, entryPrice: number) => void;
  resetDraft: () => void;
}

const initialState: DraftState = {
  weekId: "",
  picks: [],
  currentRound: 1,
  isDraftComplete: false,
};

export const useDraftStore = create<DraftState & DraftActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      initWeek: () => {
        const currentWeekId = getCurrentWeekId();
        if (get().weekId !== currentWeekId) {
          set({ ...initialState, weekId: currentWeekId });
        }
      },

      makePick: (assetId, categoryId, entryPrice) => {
        const { picks, currentRound, isDraftComplete } = get();
        if (isDraftComplete) return;

        const newPick: DraftPick = {
          round: currentRound,
          categoryId,
          assetId,
          entryPrice,
        };

        const newRound = currentRound + 1;
        set({
          picks: [...picks, newPick],
          currentRound: newRound,
          isDraftComplete: newRound > TOTAL_ROUNDS,
        });
      },

      resetDraft: () => {
        set({ ...initialState, weekId: getCurrentWeekId() });
      },
    }),
    {
      name: "draft-store-v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        weekId: s.weekId,
        picks: s.picks,
        currentRound: s.currentRound,
        isDraftComplete: s.isDraftComplete,
      }),
    },
  ),
);
