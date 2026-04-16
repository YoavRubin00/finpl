import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { TelemetryEvent, TelemetryEventType, AIProfile, MonetizationSignalType } from './types';
import { analyzeProfile } from './analyzeProfile';

/** Flush after this many events accumulate */
const BATCH_THRESHOLD = 10;

interface AITelemetryState {
  events: TelemetryEvent[];
  profile: AIProfile | null;

  /** Append a single telemetry event */
  addEvent: (
    type: TelemetryEventType,
    moduleId: string,
    opts?: {
      correct?: boolean | null;
      durationMs?: number;
      meta?: Record<string, string | number | boolean>;
    },
  ) => void;

  /** Flush all queued events (returns them and clears the buffer) */
  flush: () => TelemetryEvent[];

  /** Replace the current AI profile (called after analysis) */
  setProfile: (profile: AIProfile) => void;

  /** Number of events waiting to be processed */
  pendingCount: () => number;

  /** True when the batch threshold has been reached */
  shouldFlush: () => boolean;

  /** Track a monetization-related signal (shop views, heart depletion, etc.) */
  trackMonetizationSignal: (
    signal: MonetizationSignalType,
    meta?: Record<string, string | number | boolean>,
  ) => void;

  /** Flush events, run analysis, and store the resulting profile */
  processAndAnalyze: () => Promise<AIProfile | null>;

  /** Reset everything */
  reset: () => void;
}

export const useAITelemetryStore = create<AITelemetryState>()(
  persist(
    (set, get) => ({
      events: [],
      profile: null,

      addEvent: (type, moduleId, opts) => {
        const event: TelemetryEvent = {
          type,
          moduleId,
          correct: opts?.correct ?? null,
          durationMs: opts?.durationMs ?? 0,
          timestamp: Date.now(),
          ...(opts?.meta ? { meta: opts.meta } : {}),
        };

        set((s) => ({ events: [...s.events, event] }));
      },

      flush: () => {
        const { events } = get();
        set({ events: [] });
        return events;
      },

      setProfile: (profile) => set({ profile }),

      pendingCount: () => get().events.length,

      shouldFlush: () => get().events.length >= BATCH_THRESHOLD,

      trackMonetizationSignal: (signal, meta) => {
        get().addEvent(signal, '_monetization', {
          durationMs: 0,
          meta: { ...meta, isMonetizationSignal: true },
        });
      },

      processAndAnalyze: async () => {
        const flushed = get().flush();
        if (flushed.length === 0) return null;
        const profile = await analyzeProfile(flushed);
        set({ profile });
        return profile;
      },

      reset: () => set({ events: [], profile: null }),
    }),
    {
      name: 'ai-telemetry-store',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
