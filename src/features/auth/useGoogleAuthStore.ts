import { create } from 'zustand';
import { registerLocalStore } from '../../lib/stores/registry';

/** How the most recent Google sign-in attempt ended. `null` while one is in
 *  flight or before the first attempt. */
export type GoogleSignInOutcome = 'success' | 'cancelled' | 'failed';

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
  /** TRUE from the moment the Google prompt opens until the attempt is fully
   *  resolved (cancelled, failed, or the server verify + sign-in finished).
   *  The OAuth result arrives through an effect, so screens cannot await it —
   *  they read this to show a "connecting" state instead of a frozen screen,
   *  and /oauthredirect reads it to know when it must not keep spinning. */
  isSigningIn: boolean;
  lastOutcome: GoogleSignInOutcome | null;
  reset: () => void;
}

const initialState = {
  promptGoogleSignIn: null as (() => Promise<void>) | null,
  isReady: false,
  pendingExistingAccountIntent: false,
  isSigningIn: false,
  lastOutcome: null as GoogleSignInOutcome | null,
};

export const useGoogleAuthStore = create<GoogleAuthStore>(() => ({
  ...initialState,
  reset: () => useGoogleAuthStore.setState(initialState),
}));

registerLocalStore('google-auth-store', useGoogleAuthStore, null);
