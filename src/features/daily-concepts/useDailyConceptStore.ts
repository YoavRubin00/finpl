import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DAILY_CONCEPTS } from "./dailyConceptsData";

interface DailyConceptState {
  completedConcepts: string[];
  markCompleted: (id: string) => void;
  getTodayPair: (activeChapterId: number) => [string, string];
  isCompleted: (id: string) => boolean;
}

/** Deterministic daily pair based on date string and chapter */
function getTodayPairIds(activeChapterId: number): [string, string] {
  const chapterConcepts = DAILY_CONCEPTS.filter((c) => c.chapterId === activeChapterId);
  const pool = chapterConcepts.length >= 2 ? chapterConcepts : DAILY_CONCEPTS;

  const dateStr = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (Math.imul(31, hash) + dateStr.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);
  
  const idx1 = hash % pool.length;
  const idx2 = (hash * 7 + 13) % pool.length;
  const safeIdx2 = idx2 === idx1 ? (idx1 + 1) % pool.length : idx2;
  
  return [pool[idx1].id, pool[safeIdx2].id];
}

export const useDailyConceptStore = create<DailyConceptState>()(
  persist(
    (set, get) => ({
      completedConcepts: [],
      markCompleted: (id: string) => {
        const current = get().completedConcepts;
        if (!current.includes(id)) {
          set({ completedConcepts: [...current, id] });
        }
      },
      getTodayPair: (activeChapterId: number) => getTodayPairIds(activeChapterId),
      isCompleted: (id: string) => get().completedConcepts.includes(id),
    }),
    {
      name: "daily-concepts-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
