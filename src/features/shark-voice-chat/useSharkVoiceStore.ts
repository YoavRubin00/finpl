import { create } from 'zustand';

export type SharkVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

/** One completed utterance in the live conversation, in chronological order. */
export interface ConversationTurn {
  role: 'user' | 'shark';
  text: string;
}

interface SharkVoiceState {
  status: SharkVoiceStatus;
  userTranscript: string;
  sharkText: string;
  /**
   * Full chronological transcript of the call. `userTranscript`/`sharkText`
   * only hold the LATEST line (for the live overlay); `turns` accumulates every
   * utterance so the end-of-module comprehension report can grade what the user
   * actually said. Consecutive same-role messages are merged (the SDK streams a
   * turn in growing partials, so we replace the trailing partial in place).
   */
  turns: ConversationTurn[];
  sessionSecondsUsed: number;
  errorMessage: string | null;
  isMuted: boolean;

  setStatus: (status: SharkVoiceStatus) => void;
  setUserTranscript: (text: string) => void;
  setSharkText: (text: string) => void;
  appendSharkText: (chunk: string) => void;
  addTurn: (role: ConversationTurn['role'], text: string) => void;
  incrementSeconds: (seconds: number) => void;
  setError: (message: string | null) => void;
  setMuted: (muted: boolean) => void;
  clearSession: () => void;
}

const initialState = {
  status: 'idle' as SharkVoiceStatus,
  userTranscript: '',
  sharkText: '',
  turns: [] as ConversationTurn[],
  sessionSecondsUsed: 0,
  errorMessage: null,
  isMuted: false,
};

export const useSharkVoiceStore = create<SharkVoiceState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setUserTranscript: (text) => set({ userTranscript: text }),
  setSharkText: (text) => set({ sharkText: text }),
  appendSharkText: (chunk) => set((s) => ({ sharkText: s.sharkText + chunk })),
  addTurn: (role, text) =>
    set((s) => {
      const clean = text.trim();
      if (!clean) return s;
      const last = s.turns[s.turns.length - 1];
      // Same-speaker streaming partial → replace the trailing entry in place so
      // a single utterance isn't logged as dozens of growing fragments.
      if (last && last.role === role) {
        if (clean === last.text || last.text.startsWith(clean)) return s;
        const next = s.turns.slice(0, -1);
        next.push({ role, text: clean });
        return { turns: next };
      }
      return { turns: [...s.turns, { role, text: clean }] };
    }),
  incrementSeconds: (seconds) =>
    set((s) => ({ sessionSecondsUsed: s.sessionSecondsUsed + seconds })),
  setError: (message) => set({ errorMessage: message, status: message ? 'error' : 'idle' }),
  setMuted: (muted) => set({ isMuted: muted }),
  clearSession: () => set(initialState),
}));
