import { create } from 'zustand';
import { registerLocalStore } from '../../lib/stores/registry';

interface GoogleAuthStore {
  promptGoogleSignIn: (() => Promise<void>) | null;
  isReady: boolean;
  reset: () => void;
}

const initialState = {
  promptGoogleSignIn: null as (() => Promise<void>) | null,
  isReady: false,
};

export const useGoogleAuthStore = create<GoogleAuthStore>(() => ({
  ...initialState,
  reset: () => useGoogleAuthStore.setState(initialState),
}));

registerLocalStore('google-auth-store', useGoogleAuthStore, null);
