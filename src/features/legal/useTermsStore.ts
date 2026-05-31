import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

interface TermsState {
  acceptedVersion: string | null;
  acceptedAt: number | null;
  accept: (version: string) => void;
  needsReconsent: (currentVersion: string) => boolean;
  reset: () => void;
}

export const useTermsStore = create<TermsState>()(
  persist(
    (set, get) => ({
      acceptedVersion: null,
      acceptedAt: null,
      accept: (version) => set({ acceptedVersion: version, acceptedAt: Date.now() }),
      needsReconsent: (current) => {
        const v = get().acceptedVersion;
        if (v === null) return true;
        return v < current;
      },
      reset: () => set({ acceptedVersion: null, acceptedAt: null }),
    }),
    {
      name: 'finplay-terms',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
