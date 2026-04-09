import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FailedConcept, QuestionFailure } from "./adaptiveTypes";

/** Threshold: a concept is "consistently failed" when failCount >= this */
const CONSISTENT_FAILURE_THRESHOLD = 2;

interface AdaptiveState {
  /** Map of conceptTag → FailedConcept tracking aggregated failures */
  failedConcepts: Record<string, FailedConcept>;
  /** Raw log of individual question failures (last 200 kept) */
  questionFailures: QuestionFailure[];
  /** Transient: concept tag for the active AI Lifeline intervention (read by ChatScreen on mount) */
  activeLifelineConcept: string | null;

  /** Log a wrong answer for a specific concept */
  logFailure: (questionId: string, conceptTag: string, moduleId: string) => void;
  /** Get all concepts that have been consistently failed */
  getConsistentlyFailedConcepts: () => FailedConcept[];
  /** Check if a specific concept is consistently failed */
  isConceptStruggledWith: (conceptTag: string) => boolean;
  /** Clear failure data for a concept (e.g., after successful AI intervention) */
  clearConcept: (conceptTag: string) => void;
  /** Set the active lifeline concept (triggers targeted AI explanation in ChatScreen) */
  setActiveLifelineConcept: (conceptTag: string | null) => void;
  /** Reset all adaptive data */
  resetAdaptive: () => void;
}

const MAX_FAILURE_LOG = 200;

export const useAdaptiveStore = create<AdaptiveState>()(
  persist(
    (set, get) => ({
      failedConcepts: {},
      questionFailures: [],
      activeLifelineConcept: null,

      logFailure: (questionId: string, conceptTag: string, moduleId: string) => {
        const now = Date.now();
        set((state) => {
          const prev = state.failedConcepts[conceptTag];
          const updatedConcept: FailedConcept = {
            conceptTag,
            moduleId,
            failCount: (prev?.failCount ?? 0) + 1,
            lastFailedAt: now,
          };

          const newFailure: QuestionFailure = {
            questionId,
            conceptTag,
            moduleId,
            timestamp: now,
          };

          // Keep only last MAX_FAILURE_LOG entries
          const updatedLog = [...state.questionFailures, newFailure].slice(-MAX_FAILURE_LOG);

          return {
            failedConcepts: {
              ...state.failedConcepts,
              [conceptTag]: updatedConcept,
            },
            questionFailures: updatedLog,
          };
        });
      },

      getConsistentlyFailedConcepts: () => {
        const { failedConcepts } = get();
        return Object.values(failedConcepts).filter(
          (fc) => fc.failCount >= CONSISTENT_FAILURE_THRESHOLD
        );
      },

      isConceptStruggledWith: (conceptTag: string) => {
        const concept = get().failedConcepts[conceptTag];
        return (concept?.failCount ?? 0) >= CONSISTENT_FAILURE_THRESHOLD;
      },

      clearConcept: (conceptTag: string) => {
        set((state) => {
          const { [conceptTag]: _removed, ...rest } = state.failedConcepts;
          return {
            failedConcepts: rest,
            questionFailures: state.questionFailures.filter(
              (qf) => qf.conceptTag !== conceptTag
            ),
          };
        });
      },

      setActiveLifelineConcept: (conceptTag: string | null) => {
        set({ activeLifelineConcept: conceptTag });
      },

      resetAdaptive: () => {
        set({ failedConcepts: {}, questionFailures: [], activeLifelineConcept: null });
      },
    }),
    {
      name: "adaptive-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        failedConcepts: state.failedConcepts,
        questionFailures: state.questionFailures,
      }),
    }
  )
);
