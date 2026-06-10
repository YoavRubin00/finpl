import { create } from 'zustand';

/**
 * Ephemeral handoff store for topic-tree → chat navigation. When the
 * user taps the `chat` chip on a module's topic-tree, we stash the
 * moduleId + preset FAQ questions here, then push to /chat. ChatScreen
 * reads on mount, overlays the preset questions on its suggestion
 * strip, then `clear()`s so a manual /chat visit later doesn't reuse
 * the stale module context.
 */
interface State {
  preset: {
    moduleId: string;
    moduleTitle: string;
    questions: string[];
  } | null;
  setPreset: (preset: State['preset']) => void;
  clear: () => void;
}

export const useTopicChatStore = create<State>((set) => ({
  preset: null,
  setPreset: (preset) => set({ preset }),
  clear: () => set({ preset: null }),
}));
