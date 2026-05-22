// src/features/chapter-1-content/useChapterUIStore.ts
//
// Holds purely local/UI state that does NOT need server persistence:
//   - currentChapterId   — last chapter the user navigated to (nav state)
//   - currentModuleIndex — last module index per chapter (nav state)
//   - moduleResume       — mid-lesson checkpoint (phase, flashcardIndex, …)
//   - bossCompleted      — whether the chapter boss has been beaten (local flag)
//   - quizResults        — in-session quiz answer accumulator (per moduleId)
//
// Completed-modules truth lives in the server (module_progress table) and is
// read via useProgress() / useIsModuleCompleted() from useProgress.ts.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResumeState {
  phase: string;
  flashcardIndex: number;
  quizIndex: number;
  consecutiveCorrect: number;
  peakStreak?: number;
}

export interface QuizResult {
  correct: number;
  total: number;
}

interface ChapterUIState {
  /** Store key of the last chapter the user entered (e.g. "ch-1") */
  currentChapterId: string;
  /** Per-chapter last-active module index (e.g. { "ch-1": 2 }) */
  currentModuleIndexByChapter: Record<string, number>;
  /** Mid-lesson resume checkpoint, keyed by moduleId */
  moduleResume: Record<string, ResumeState>;
  /** Whether the chapter boss battle has been completed, keyed by chapterId */
  bossCompleted: Record<string, boolean>;
  /** In-session quiz answer accumulator: moduleId → { correct, total } */
  quizResults: Record<string, QuizResult>;
}

interface ChapterUIActions {
  setCurrentChapter: (chapterId: string) => void;
  setCurrentModule: (index: number) => void;
  /** Mark all provided moduleIds as completed in ch-0 (skip-intro flow) */
  skipIntroChapter: (moduleIds: string[]) => void;
  markBossComplete: (chapterId: string) => void;
  saveResume: (moduleId: string, state: ResumeState) => void;
  clearResume: (moduleId: string) => void;
  recordQuizAnswer: (moduleId: string, isCorrect: boolean) => void;
  clearQuizResults: (moduleId: string) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const DEFAULT_CHAPTER_ID = 'ch-1';

const initialState: ChapterUIState = {
  currentChapterId: DEFAULT_CHAPTER_ID,
  currentModuleIndexByChapter: {},
  moduleResume: {},
  bossCompleted: {},
  quizResults: {},
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChapterUIStore = create<ChapterUIState & ChapterUIActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentChapter: (chapterId) =>
        set({ currentChapterId: chapterId }),

      setCurrentModule: (index) =>
        set((s) => ({
          currentModuleIndexByChapter: {
            ...s.currentModuleIndexByChapter,
            [s.currentChapterId]: index,
          },
        })),

      skipIntroChapter: (_moduleIds) => {
        // The old store wrote completedModules into ch-0's progress.
        // Now completedModules live on the server — callers should use
        // useUpsertModuleProgress() for each moduleId instead.
        // This stub is kept so call sites compile; actual server sync is
        // handled by LessonFlowScreen.completeModule flow.
        set({ currentChapterId: 'ch-0' });
      },

      markBossComplete: (chapterId) =>
        set((s) => ({
          bossCompleted: { ...s.bossCompleted, [chapterId]: true },
        })),

      saveResume: (moduleId, state) =>
        set((s) => ({
          moduleResume: { ...s.moduleResume, [moduleId]: state },
        })),

      clearResume: (moduleId) =>
        set((s) => {
          const next = { ...s.moduleResume };
          delete next[moduleId];
          return { moduleResume: next };
        }),

      recordQuizAnswer: (moduleId, isCorrect) =>
        set((s) => {
          const prev = s.quizResults[moduleId] ?? { correct: 0, total: 0 };
          return {
            quizResults: {
              ...s.quizResults,
              [moduleId]: {
                correct: prev.correct + (isCorrect ? 1 : 0),
                total: prev.total + 1,
              },
            },
          };
        }),

      clearQuizResults: (moduleId) =>
        set((s) => {
          const next = { ...s.quizResults };
          delete next[moduleId];
          return { quizResults: next };
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'chapter-ui-store-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentChapterId: state.currentChapterId,
        currentModuleIndexByChapter: state.currentModuleIndexByChapter,
        moduleResume: state.moduleResume,
        bossCompleted: state.bossCompleted,
        // quizResults are session-only — not persisted
      }),
    },
  ),
);

registerLocalStore('chapter-ui-store-v1', useChapterUIStore, 'chapter-ui-store-v1');
