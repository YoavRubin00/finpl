import { create } from 'zustand';

export type SharkVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

interface SharkVoiceState {
  status: SharkVoiceStatus;
  userTranscript: string;
  sharkText: string;
  sessionSecondsUsed: number;
  errorMessage: string | null;
  isMuted: boolean;

  setStatus: (status: SharkVoiceStatus) => void;
  setUserTranscript: (text: string) => void;
  setSharkText: (text: string) => void;
  appendSharkText: (chunk: string) => void;
  incrementSeconds: (seconds: number) => void;
  setError: (message: string | null) => void;
  setMuted: (muted: boolean) => void;
  clearSession: () => void;
}

const initialState = {
  status: 'idle' as SharkVoiceStatus,
  userTranscript: '',
  sharkText: '',
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
  incrementSeconds: (seconds) =>
    set((s) => ({ sessionSecondsUsed: s.sessionSecondsUsed + seconds })),
  setError: (message) => set({ errorMessage: message, status: message ? 'error' : 'idle' }),
  setMuted: (muted) => set({ isMuted: muted }),
  clearSession: () => set(initialState),
}));
