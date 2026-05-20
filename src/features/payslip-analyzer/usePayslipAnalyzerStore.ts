import { create } from 'zustand';
import type {
  ChosenFile,
  PayslipErrorCode,
  PayslipPhase,
  PayslipResult,
} from './types';

interface PayslipAnalyzerState {
  phase: PayslipPhase;
  file: ChosenFile | null;
  result: PayslipResult | null;
  errorCode: PayslipErrorCode | null;
  rewardGranted: boolean;

  chooseFile: (file: ChosenFile) => void;
  startAnalyzing: () => void;
  setResult: (result: PayslipResult) => void;
  setError: (code: PayslipErrorCode) => void;
  markRewardGranted: () => void;
  clearAll: () => void;
}

const INITIAL_STATE = {
  phase: 'idle' as PayslipPhase,
  file: null,
  result: null,
  errorCode: null,
  rewardGranted: false,
};

export const usePayslipAnalyzerStore = create<PayslipAnalyzerState>()((set) => ({
  ...INITIAL_STATE,

  chooseFile: (file) =>
    set({
      file,
      phase: 'file_chosen',
      result: null,
      errorCode: null,
      rewardGranted: false,
    }),

  startAnalyzing: () =>
    set({
      phase: 'analyzing',
      result: null,
      errorCode: null,
    }),

  setResult: (result) =>
    set({
      result,
      phase: 'success',
      errorCode: null,
    }),

  setError: (code) =>
    set({
      errorCode: code,
      phase: 'error',
    }),

  markRewardGranted: () => set({ rewardGranted: true }),

  clearAll: () => set({ ...INITIAL_STATE }),
}));
