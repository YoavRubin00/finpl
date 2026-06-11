import { create } from 'zustand';
import { registerLocalStore } from '../../lib/stores/registry';

interface GoogleAuthStore {
  promptGoogleSignIn: (() => Promise<void>) | null;
  isReady: boolean;
  /** Transient flag set by call sites that know they're an "existing-account"
   *  sign-in (e.g. the IntroStep login sub-step). The Google OAuth result is
   *  delivered asynchronously through useGoogleAuth's effect, so the caller
   *  can't `.then()` it — flagging via the store lets the post-verify code
   *  decide whether to mark hasCompletedOnboarding=true. Consumed (cleared)
   *  inside useGoogleAuth after the verify-and-route step. */
  pendingExistingAccountIntent: boolean;
  reset: () => void;
}

const initialState = {
  promptGoogleSignIn: null as (() => Promise<void>) | null,
  isReady: false,
  pendingExistingAccountIntent: false,
};

export const useGoogleAuthStore = create<GoogleAuthStore>(() => ({
  ...initialState,
  reset: () => useGoogleAuthStore.setState(initialState),
}));

registerLocalStore('google-auth-store', useGoogleAuthStore, null);
