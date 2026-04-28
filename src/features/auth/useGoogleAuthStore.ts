import { create } from 'zustand';

interface GoogleAuthStore {
  promptGoogleSignIn: (() => Promise<void>) | null;
  isReady: boolean;
}

export const useGoogleAuthStore = create<GoogleAuthStore>(() => ({
  promptGoogleSignIn: null,
  isReady: false,
}));
