// src/features/shark-voice-chat/useModuleComprehensionStore.ts
//
// Per-module AI comprehension report ("דוח סיכום שיעור"): persistence +
// generation. The report is the deliverable of the end-of-module check —
// graded from the module's learning data (quiz, recall, completion) PLUS the
// live Shark voice-conversation transcript (when that feature is active).
//
// CRITICAL SEQUENCING — quiz/recall results are SESSION-ONLY (useChapterUIStore
// does NOT persist quizResults). They vanish on app restart. But report
// GENERATION is quota-gated (Free = 1/week, on demand). So we split the two:
//   1. captureInputs(moduleId)  — snapshots the inputs THE MOMENT the module
//      ends (chest opens), while the session data is still live. Cheap, local,
//      always runs, persisted to disk.
//   2. generateReport(moduleId) — the AI call, runs on demand from the stored
//      snapshot (consuming the weekly quota). Works even after a restart and is
//      idempotent (re-reading a generated report costs nothing).
//
// Mirrors the useCompletedModulesStore persistence pattern (MMKV via
// zustandStorage + registerLocalStore for reset-on-logout).

import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { getApiBase } from '../../db/apiBase';
import type { ConversationTurn } from './useSharkVoiceStore';
import { useSharkVoiceStore } from './useSharkVoiceStore';
import { getModuleComprehension, buildComprehensionForModule } from './moduleComprehension';
import { useChapterUIStore } from '../chapter-1-content/useChapterUIStore';

const PROD_API_BASE = 'https://finpl.vercel.app';

// Expo Router doesn't serve `+api.ts` routes in `output: "single"` mode on
// localhost web dev — point at the deployed Vercel API there. Mirrors
// stockAnalystClient.resolveBase().
function resolveBase(): string {
  if (Platform.OS === 'web') {
    const w = (globalThis as { location?: { hostname?: string } }).location;
    const host = w?.hostname ?? '';
    if (host === 'localhost' || host === '127.0.0.1') return PROD_API_BASE;
  }
  return getApiBase() || PROD_API_BASE;
}

export interface PerConcept {
  concept: string;
  graspPct: number;
}

/** The graded report — shape mirrors api/ai/comprehension-report.ts output. */
export interface ComprehensionReport {
  understandingScore: number;
  verdictHe: string;
  strengthsHe: string[];
  improvementsHe: string[];
  perConcept: PerConcept[];
}

/** Snapshot of everything the grader needs, captured at module-end. */
export interface ModuleReportInputs {
  moduleId: string;
  titleHe: string;
  concepts: string[];
  questions: string[];
  keyPoints: string[];
  quiz?: { correct: number; total: number };
  /** Live Shark conversation transcript, when the voice check ran. */
  transcript?: ConversationTurn[];
  capturedAt: string;
}

export interface StoredReport {
  report: ComprehensionReport;
  generatedAt: string;
  usedTranscript: boolean;
}

interface ComprehensionState {
  /** Snapshots captured at module-end, keyed by moduleId. */
  inputsByModuleId: Record<string, ModuleReportInputs>;
  /** Generated reports, keyed by moduleId. */
  reportsByModuleId: Record<string, StoredReport>;
  /** moduleId currently being graded by the AI (for the loading state). */
  generatingModuleId: string | null;
  /** moduleId whose last generation failed (for an inline retry/error). */
  erroredModuleId: string | null;
}

interface ComprehensionActions {
  /**
   * Snapshot the module's grading inputs. Call at module-end (chest open),
   * while quizResults + the voice transcript are still in memory. Idempotent —
   * the FIRST capture (richest, freshest) wins; a later re-tap won't overwrite
   * it with possibly-empty session data.
   */
  captureInputs: (moduleId: string, titleHe: string) => void;
  /**
   * Attach the live voice-conversation transcript to a module's snapshot and
   * CLEAR any existing report so the next generate re-grades WITH the call.
   * Called at the end of the live comprehension call. Builds a snapshot if one
   * wasn't captured yet (defensive — normally the chest captured it already).
   */
  attachTranscript: (moduleId: string, transcript: ConversationTurn[]) => void;
  getInputs: (moduleId: string) => ModuleReportInputs | undefined;
  hasReport: (moduleId: string) => boolean;
  getReport: (moduleId: string) => StoredReport | undefined;
  /**
   * Grade the snapshot via the AI endpoint and persist the result. No-ops (and
   * returns the existing report) if one already exists. Caller is responsible
   * for the quota check + consume BEFORE calling this.
   */
  generateReport: (moduleId: string) => Promise<StoredReport | null>;
  clearReport: (moduleId: string) => void;
  reset: () => void;
}

const initialState: ComprehensionState = {
  inputsByModuleId: {},
  reportsByModuleId: {},
  generatingModuleId: null,
  erroredModuleId: null,
};

export const useModuleComprehensionStore = create<ComprehensionState & ComprehensionActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      captureInputs: (moduleId, titleHe) => {
        if (!moduleId) return;
        // First capture wins — preserve the freshest snapshot.
        if (get().inputsByModuleId[moduleId]) return;

        const comp = getModuleComprehension(moduleId) ?? buildComprehensionForModule(moduleId, titleHe);
        const quiz = useChapterUIStore.getState().quizResults[moduleId];
        const turns = useSharkVoiceStore.getState().turns;

        const snapshot: ModuleReportInputs = {
          moduleId,
          titleHe: comp.titleHe || titleHe,
          concepts: comp.conceptsHe,
          questions: comp.questionsHe,
          keyPoints: comp.keyPointsHe,
          quiz: quiz ? { correct: quiz.correct, total: quiz.total } : undefined,
          transcript: turns.length ? turns.slice(0, 40) : undefined,
          capturedAt: new Date().toISOString(),
        };
        set((s) => ({ inputsByModuleId: { ...s.inputsByModuleId, [moduleId]: snapshot } }));
      },

      attachTranscript: (moduleId, transcript) =>
        set((s) => {
          const turns = transcript.slice(0, 40);
          const existing = s.inputsByModuleId[moduleId];
          let inputs: ModuleReportInputs;
          if (existing) {
            inputs = { ...existing, transcript: turns };
          } else {
            const comp = getModuleComprehension(moduleId);
            const quiz = useChapterUIStore.getState().quizResults[moduleId];
            inputs = {
              moduleId,
              titleHe: comp?.titleHe ?? '',
              concepts: comp?.conceptsHe ?? [],
              questions: comp?.questionsHe ?? [],
              keyPoints: comp?.keyPointsHe ?? [],
              quiz: quiz ? { correct: quiz.correct, total: quiz.total } : undefined,
              transcript: turns,
              capturedAt: new Date().toISOString(),
            };
          }
          // Drop any prior (transcript-less) report so it regenerates with the call.
          const reports = { ...s.reportsByModuleId };
          delete reports[moduleId];
          return {
            inputsByModuleId: { ...s.inputsByModuleId, [moduleId]: inputs },
            reportsByModuleId: reports,
          };
        }),

      getInputs: (moduleId) => get().inputsByModuleId[moduleId],
      hasReport: (moduleId) => Boolean(get().reportsByModuleId[moduleId]),
      getReport: (moduleId) => get().reportsByModuleId[moduleId],

      generateReport: async (moduleId) => {
        const existing = get().reportsByModuleId[moduleId];
        if (existing) return existing;

        const inputs = get().inputsByModuleId[moduleId];
        if (!inputs) {
          set({ erroredModuleId: moduleId });
          return null;
        }

        set({ generatingModuleId: moduleId, erroredModuleId: null });
        try {
          const res = await fetch(`${resolveBase()}/api/ai/comprehension-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              moduleId,
              moduleTitle: inputs.titleHe,
              concepts: inputs.concepts,
              questions: inputs.questions,
              keyPoints: inputs.keyPoints,
              performance: {
                quizCorrect: inputs.quiz?.correct ?? 0,
                quizTotal: inputs.quiz?.total ?? 0,
              },
              transcript: inputs.transcript ?? [],
            }),
          });
          const data = (await res.json()) as { ok?: boolean; report?: ComprehensionReport };
          if (!data?.ok || !data.report) {
            set({ generatingModuleId: null, erroredModuleId: moduleId });
            return null;
          }
          const stored: StoredReport = {
            report: data.report,
            generatedAt: new Date().toISOString(),
            usedTranscript: Boolean(inputs.transcript?.length),
          };
          set((s) => ({
            reportsByModuleId: { ...s.reportsByModuleId, [moduleId]: stored },
            generatingModuleId: null,
            erroredModuleId: null,
          }));
          return stored;
        } catch {
          set({ generatingModuleId: null, erroredModuleId: moduleId });
          return null;
        }
      },

      clearReport: (moduleId) =>
        set((s) => {
          const reports = { ...s.reportsByModuleId };
          delete reports[moduleId];
          return { reportsByModuleId: reports };
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'module-comprehension-reports-v1',
      storage: createJSONStorage(() => zustandStorage),
      // Persist the snapshots + reports; transient generating/errored flags stay
      // in memory only.
      partialize: (state) => ({
        inputsByModuleId: state.inputsByModuleId,
        reportsByModuleId: state.reportsByModuleId,
      }),
    },
  ),
);

registerLocalStore(
  'module-comprehension-reports-v1',
  useModuleComprehensionStore,
  'module-comprehension-reports-v1',
);
