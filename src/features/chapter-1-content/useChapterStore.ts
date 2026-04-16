import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyStore } from "../economy/useEconomyStore";
import { useAuthStore } from "../auth/useAuthStore";
import { upsertModuleProgress } from "../../db/sync/syncModuleProgress";
import { useAITelemetryStore } from "../ai-personalization/useAITelemetryStore";
import { useAdaptiveStore } from "../social/useAdaptiveStore";

const MODULE_COMPLETE_XP = 30;
const MODULE_COMPLETE_COINS = 150;
const DEFAULT_CHAPTER_ID = "ch-1";

interface QuizResult {
  correct: number;
  total: number;
}

interface ChapterProgress {
  completedModules: string[];
  quizResults: Record<string, QuizResult>;
  currentModuleIndex: number;
}

interface ChapterState {
  currentChapterId: string;
  progress: Record<string, ChapterProgress>;
  bossCompleted: Record<string, boolean>;

  setCurrentChapter: (chapterId: string) => void;
  completeModule: (moduleId: string) => void;
  recordQuizAnswer: (moduleId: string, questionId: string, isCorrect: boolean, conceptTag?: string) => void;
  setCurrentModule: (index: number) => void;
  skipIntroChapter: (moduleIds: string[]) => void;
  markBossComplete: (chapterId: string) => void;
}

const emptyProgress: ChapterProgress = {
  completedModules: [],
  quizResults: {},
  currentModuleIndex: 0,
};

/** v0 → v1 migration: flat fields → per-chapter progress map */
interface V0Persisted {
  completedModules?: string[];
  quizResults?: Record<string, QuizResult>;
  currentModuleIndex?: number;
}

export const useChapterStore = create<ChapterState>()(
  persist(
    (set, get) => ({
      currentChapterId: DEFAULT_CHAPTER_ID,
      progress: {
        [DEFAULT_CHAPTER_ID]: { ...emptyProgress },
      },
      bossCompleted: {},

      markBossComplete: (chapterId: string) => {
        set((state) => ({
          bossCompleted: { ...state.bossCompleted, [chapterId]: true },
        }));
      },

      setCurrentChapter: (chapterId: string) => {
        set((state) => ({
          currentChapterId: chapterId,
          progress: state.progress[chapterId]
            ? state.progress
            : { ...state.progress, [chapterId]: { ...emptyProgress } },
        }));
      },

      completeModule: (moduleId: string) => {
        const { currentChapterId, progress } = get();
        const chapterProg = progress[currentChapterId] ?? { ...emptyProgress };
        if (chapterProg.completedModules.includes(moduleId)) return;

        set((state) => {
          const prev = state.progress[state.currentChapterId] ?? { ...emptyProgress };
          const updatedCompleted = [...prev.completedModules, moduleId];
          return {
            progress: {
              ...state.progress,
              [state.currentChapterId]: {
                ...prev,
                completedModules: updatedCompleted,
                currentModuleIndex: Math.max(prev.currentModuleIndex, updatedCompleted.length),
              },
            },
          };
        });

        useEconomyStore.getState().addXP(MODULE_COMPLETE_XP, "lesson_complete");
        useEconomyStore.getState().addCoins(MODULE_COMPLETE_COINS);

        // Fire-and-forget DB sync
        const email = useAuthStore.getState().email;
        if (email) {
          const quiz = get().progress[get().currentChapterId]?.quizResults[moduleId];
          upsertModuleProgress(email, {
            moduleId,
            status: 'completed',
            quizScore: quiz?.correct,
            quizAttempts: quiz?.total,
            bestScore: quiz?.correct,
            xpEarned: MODULE_COMPLETE_XP,
          }).catch(() => {});
        }

        // Telemetry: log module completion for AI personalization
        const quiz = get().progress[get().currentChapterId]?.quizResults[moduleId];
        useAITelemetryStore.getState().addEvent('module_complete', moduleId, {
          correct: quiz ? quiz.correct > 0 : null,
          meta: {
            quizCorrect: quiz?.correct ?? 0,
            quizTotal: quiz?.total ?? 0,
          },
        });
      },

      recordQuizAnswer: (moduleId: string, _questionId: string, isCorrect: boolean, conceptTag?: string) => {
        set((state) => {
          const chapterProg = state.progress[state.currentChapterId] ?? { ...emptyProgress };
          const prev = chapterProg.quizResults[moduleId] ?? { correct: 0, total: 0 };
          return {
            progress: {
              ...state.progress,
              [state.currentChapterId]: {
                ...chapterProg,
                quizResults: {
                  ...chapterProg.quizResults,
                  [moduleId]: {
                    correct: prev.correct + (isCorrect ? 1 : 0),
                    total: prev.total + 1,
                  },
                },
              },
            },
          };
        });

        // Telemetry: log individual quiz answer for AI personalization
        useAITelemetryStore.getState().addEvent('quiz_answer', moduleId, {
          correct: isCorrect,
          meta: { questionId: _questionId },
        });

        // Adaptive: log wrong answers by concept tag for failure recovery
        if (!isCorrect && conceptTag) {
          useAdaptiveStore.getState().logFailure(_questionId, conceptTag, moduleId);
        }
      },

      setCurrentModule: (index: number) => {
        set((state) => {
          const chapterProg = state.progress[state.currentChapterId] ?? { ...emptyProgress };
          return {
            progress: {
              ...state.progress,
              [state.currentChapterId]: {
                ...chapterProg,
                currentModuleIndex: index,
              },
            },
          };
        });
      },

      skipIntroChapter: (moduleIds: string[]) => {
        set((state) => ({
          progress: {
            ...state.progress,
            "ch-0": {
              completedModules: moduleIds,
              quizResults: state.progress["ch-0"]?.quizResults ?? {},
              currentModuleIndex: moduleIds.length,
            },
          },
        }));
      },
    }),
    {
      name: "chapter-store",
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentChapterId: state.currentChapterId,
        progress: state.progress,
      }),
      migrate: (persisted, version) => {
        if (version === 0) {
          const old = persisted as V0Persisted;
          return {
            currentChapterId: DEFAULT_CHAPTER_ID,
            progress: {
              [DEFAULT_CHAPTER_ID]: {
                completedModules: old.completedModules ?? [],
                quizResults: old.quizResults ?? {},
                currentModuleIndex: old.currentModuleIndex ?? 0,
              },
            },
          };
        }
        return persisted as ChapterState;
      },
    }
  )
);
