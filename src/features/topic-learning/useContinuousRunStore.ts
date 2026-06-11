import { create } from 'zustand';

/**
 * Transient (NON-persisted) signal: which module, if any, is currently being
 * played as a continuous "למידה רציפה" run.
 *
 * Why this exists (Yoav 2026-06-11): the continuous flow marks each topic
 * complete in `useTopicProgressStore` AS IT ADVANCES (so chips light up live
 * and a mid-flow exit preserves progress). But the `TopicTreeAccordion` is
 * still mounted BENEATH the lesson and subscribes to that same store — so the
 * moment the run crosses the 70% gate mid-lesson, the accordion's chest effect
 * would fire and pop its `ChestCelebrationModal` (a RN `Modal`) OVER the
 * running lesson. While `activeModuleId === module.id`, the accordion
 * suppresses its own threshold chest; the continuous run's reward is the
 * legacy summary chest instead. Set on lesson mount, cleared on unmount.
 *
 * NOT persisted: a crash / force-quit mid-run must never leave the suppression
 * stuck on next launch.
 */
interface ContinuousRunState {
  activeModuleId: string | null;
  setActive: (moduleId: string) => void;
  clear: () => void;
}

export const useContinuousRunStore = create<ContinuousRunState>((set) => ({
  activeModuleId: null,
  setActive: (moduleId) => set({ activeModuleId: moduleId }),
  clear: () => set({ activeModuleId: null }),
}));
