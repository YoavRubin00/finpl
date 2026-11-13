import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { AccessTokenRequest, makeRedirectUri, type AuthRequest } from "expo-auth-session";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuthStore, type GoogleSignInOutcome } from "./useGoogleAuthStore";
import { getApiBase } from "../../db/apiBase";
import { captureEvent } from "../../lib/posthog";
import { signInWithProfile } from "../../lib/auth/lifecycle";
import { tokenStore } from "../../lib/auth/secureStore";
import { linkProvider } from "../../lib/api/auth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

// Reversed iOS client ID, must also appear in app.json ios.infoPlist.CFBundleURLTypes
const IOS_REVERSED_CLIENT_ID = "com.googleusercontent.apps.847177819309-mbb8nusv6r17oot0e49e1npbgmaecps0";

interface GoogleUserInfo {
  name: string;
  email: string;
  picture?: string;
}

interface VerifyResult {
  token: string;
  profile: {
    id: string;
    authId: string;
    displayName: string | null;
    email: string | null;
    hasCompletedOnboarding?: boolean;
  };
}

/**
 * One Google sign-in attempt, kept so the OAuth redirect can still complete it
 * after the browser promise has already ended.
 *
 * WHY (Android only). expo-web-browser has no native auth session on Android;
 * `openAuthSessionAsync` is a polyfill (expo-web-browser/build/WebBrowser.js,
 * `_openAuthSessionPolyfillAsync`) that races two things:
 *   - the Linking `url` event carrying the redirect  → { type: 'success' }
 *   - AppState returning to `active`                 → { type: 'dismiss' }
 * and tears the `url` listener down the moment either one wins. So ANY return
 * to the app that is not the redirect itself ends the attempt as "dismiss" and
 * the real redirect is then dropped on the floor: the user coming back to the
 * app while the Google tab is still open in its own task (SDK 55 launches the
 * tab through a proxy activity in a separate task, so it stays alive and shows
 * in recents), an SMS / authenticator / password-manager detour, or `active`
 * simply being delivered before `url`. PostHog, Android 1.4.9: 33 people
 * tapped Google at the signup gate, 21 got "cancelled", 12 were signed in.
 *
 * The fix does not touch the race. We keep our own `url` listener for the
 * attempt; when the redirect arrives after a dismiss/cancel we finish the
 * sign-in from it through exactly the same checks as the normal path:
 * `AuthRequest.parseReturnUrl` (the `state` comparison) and the code exchange
 * with this request's PKCE `code_verifier`, then the same server verify.
 */
interface PendingGoogleAttempt {
  request: AuthRequest;
  startedAt: number;
  /** Set once the browser promise ended WITHOUT the redirect. */
  endedAs: 'cancel' | 'dismiss' | null;
  /** The redirect URL, if our listener saw one for this attempt. */
  redirectUrl: string | null;
  /** The auth-session hook delivered a final response for this attempt. */
  responseSeen: boolean;
  /** Resolved one way or the other; nothing may process it again. */
  done: boolean;
}

// After a dismiss, wait this long for the redirect before telling the user the
// sign-in did not complete (covers `active` being delivered just before `url`).
const REDIRECT_GRACE_MS = 1200;
// A redirect that arrives later than this is ignored (the user went back to the
// still-open Google tab and finished there).
const LATE_REDIRECT_WINDOW_MS = 5 * 60 * 1000;
// The provider hook exchanges the code with no error handler: if that request
// fails, no response is ever delivered. Stop waiting after this long.
const CODE_EXCHANGE_TIMEOUT_MS = 20000;

export function useGoogleAuth() {
  if (__DEV__) {
    if (Platform.OS === "android" && !GOOGLE_ANDROID_CLIENT_ID) {
      console.warn("[GoogleAuth] EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID missing — Android sign-in will fail silently in this build");
    }
    if (Platform.OS === "ios" && !GOOGLE_IOS_CLIENT_ID) {
      console.warn("[GoogleAuth] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID missing — iOS sign-in falls back to web client");
    }
  }

  // iOS uses the reversed-client-id scheme.
  // Android OAuth clients require the strict package:/oauthredirect format.
  const redirectUri = makeRedirectUri({
    native: Platform.OS === "ios" ? `${IOS_REVERSED_CLIENT_ID}:/` : "com.finplay.app:/oauthredirect",
    scheme: "finpl"
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    scopes: ["profile", "email"],
    redirectUri,
  });

  const pendingRef = useRef<PendingGoogleAttempt | null>(null);

  useEffect(() => {
    if (!response) return;
    // cancel / dismiss are resolved by promptGoogleSignIn below, which first
    // gives a late redirect the chance to complete the sign-in.
    if (response.type === 'cancel' || response.type === 'dismiss') return;
    const pending = pendingRef.current;
    if (pending) {
      // The redirect-recovery path already took this attempt over.
      if (pending.done && pending.endedAs) return;
      pending.responseSeen = true;
      pending.done = true;
    }
    if (response.type === "success") {
      // Prefer accessToken; fall back to idToken if Google only returned a JWT.
      // The server (/api/auth/verify) handles both via tokeninfo/userinfo.
      const token = response.authentication?.accessToken ?? response.authentication?.idToken;
      if (token) {
        const isJwt = (token.match(/\./g) ?? []).length === 2;
        fetchUserInfo(token, isJwt);
        return;
      }
    }
    const details: Record<string, unknown> = { type: response.type };
    if ("error" in response && response.error) details.error = String(response.error);
    if ("errorCode" in response && response.errorCode) details.errorCode = response.errorCode;
    if ("params" in response && response.params) details.params = response.params;
    if ("url" in response && response.url) details.url = response.url;
    if (response.type === "success") {
      details.hasAccessToken = !!response.authentication?.accessToken;
      details.hasIdToken = !!response.authentication?.idToken;
    }
    captureEvent('auth_failed', { method: 'google', error_code: String(details.errorCode ?? details.type) });
    useAuthStore.getState().setAuthError("הכניסה עם Google נכשלה. נסה שוב או בחר שיטה אחרת.");
    useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: 'failed' });
    console.error("[GoogleAuth] OAuth response failed", details);
  }, [response]);

  const verifyWithServer = async (googleToken: string): Promise<VerifyResult | null> => {
    try {
      // 5s was too aggressive: a cold Vercel function + Google tokeninfo
      // round-trip routinely exceeds it on mobile networks, aborting a
      // perfectly valid sign-in → surfaces as error_code "verify_returned_null"
      // (the #1 Google failure in PostHog). 12s covers the cold-start tail.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', token: googleToken }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '<unreadable>');
        console.error("[GoogleAuth] /api/auth/verify failed", { status: res.status, body: body.slice(0, 300) });
        return null;
      }
      const data = await res.json() as {
        ok: boolean;
        token?: string;
        syncToken?: string;
        profile: { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean } | null;
      };
      const resolvedToken = data.token ?? data.syncToken ?? null;
      if (!data.ok || !data.profile || !resolvedToken) return null;
      return { token: resolvedToken, profile: data.profile };
    } catch (err) {
      console.error("[GoogleAuth] /api/auth/verify threw", err);
      return null;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchUserInfo = async (token: string, _isJwt: boolean) => {
    // Resolved in `finally` so every exit (link, verify failure, throw, success)
    // releases the "connecting" state screens show while this runs.
    let outcome: GoogleSignInOutcome = 'failed';
    try {
      // Already signed in → connect-account action, not login.
      const alreadySignedIn = !!(await tokenStore.get());
      if (alreadySignedIn) {
        try {
          await linkProvider({ provider: 'google', token });
          useAuthStore.getState().setAuthError(null);
          outcome = 'success';
        } catch {
          useAuthStore.getState().setAuthError('קישור החשבון נכשל. נסו שוב.');
        }
        return;
      }
      // Optional fallback: only access_tokens can call userinfo.
      // For id_tokens (JWT), skip — server resolves identity via tokeninfo.
      let googleUser: GoogleUserInfo | null = null;
      if (!_isJwt) {
        try {
          const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) googleUser = await res.json();
        } catch {
          // Non-fatal — server-side verification is the source of truth.
        }
      }
      // Verify server-side to get JWT (server handles both token kinds)
      const verified = await verifyWithServer(token);
      if (!verified) {
        console.error("[GoogleAuth] verifyWithServer returned null", { _isJwt, tokenLength: token.length });
        captureEvent('auth_failed', { method: 'google', error_code: 'verify_returned_null' });
        useAuthStore.getState().setAuthError("השרת לא הצליח לאמת את הכניסה. נסה שוב.");
        return;
      }
      // If Google userinfo gave us a richer name, patch the profile display name
      if (googleUser?.name && !verified.profile.displayName) {
        verified.profile.displayName = googleUser.name;
      }
      await signInWithProfile(verified.profile, verified.token, 'google');
      outcome = 'success';

      // Yoav 2026-06-11: consume the "existing-account intent" flag set by
      // the IntroStep login sub-step. If the user explicitly tapped "כבר
      // יש לי חשבון" before signing in with Google, they've onboarded on
      // a prior install by definition — flip hasCompletedOnboarding=true
      // so the root layout's redirect guard routes them straight to /(tabs)
      // instead of bouncing them back through onboarding.
      let existingAccountIntent = false;
      try {
        existingAccountIntent = useGoogleAuthStore.getState().pendingExistingAccountIntent === true;
        if (existingAccountIntent) {
          useGoogleAuthStore.setState({ pendingExistingAccountIntent: false });
          useAuthStore.getState().setOnboardingCompleted(true);
        }
      } catch { /* non-fatal */ }

      // Route by the post-signIn store value rather than the raw server flag.
      // The store preserves prior-session hasCompletedOnboarding when the server
      // doesn't include the field, so returning users on the same device land
      // straight in /(tabs) without bouncing through onboarding.
      const completed =
        existingAccountIntent ||
        verified.profile.hasCompletedOnboarding === true ||
        useAuthStore.getState().hasCompletedOnboarding === true;
      if (completed) {
        router.replace("/(tabs)/" as never);
      } else {
        router.replace("/(auth)/onboarding" as never);
      }
    } catch (error) {
      console.error("[GoogleAuth] fetchUserInfo threw", error);
      captureEvent('auth_failed', { method: 'google', error_code: 'fetchUserInfo_threw' });
      useAuthStore.getState().setAuthError("שגיאת רשת בכניסה. בדוק את החיבור ונסה שוב.");
    } finally {
      useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: outcome });
    }
  };

  // Finish a sign-in from a redirect that arrived after the browser promise
  // had already ended as cancel/dismiss (see PendingGoogleAttempt). Mirrors the
  // provider hook's own success path step for step: parseReturnUrl checks
  // `state`, the code is exchanged with this request's PKCE verifier, and the
  // resulting token goes through the same server verify as always.
  const completeFromRedirect = async (pending: PendingGoogleAttempt): Promise<void> => {
    if (pending.done || !pending.redirectUrl || !pending.endedAs) return;
    pending.done = true;
    const fail = (errorCode: string) => {
      captureEvent('auth_failed', { method: 'google', error_code: errorCode });
      useAuthStore.getState().setAuthError("הכניסה עם Google נכשלה. נסה שוב או בחר שיטה אחרת.");
      useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: 'failed' });
    };
    useAuthStore.getState().setAuthError(null);
    useGoogleAuthStore.setState({ isSigningIn: true, lastOutcome: null });
    try {
      const parsed = pending.request.parseReturnUrl(pending.redirectUrl);
      if (parsed.type !== 'success') {
        // state mismatch, or Google returned an error (e.g. access_denied).
        fail(`redirect_${parsed.type === 'error' ? (parsed.error?.code ?? 'error') : parsed.type}`);
        return;
      }
      const code = parsed.params.code;
      if (!code) {
        fail('redirect_no_code');
        return;
      }
      const authentication = await new AccessTokenRequest({
        clientId: pending.request.clientId,
        redirectUri: pending.request.redirectUri,
        scopes: pending.request.scopes,
        code,
        extraParams: { code_verifier: pending.request.codeVerifier ?? '' },
      }).performAsync(Google.discovery);
      const token = authentication.accessToken || authentication.idToken;
      if (!token) {
        fail('redirect_no_token');
        return;
      }
      captureEvent('auth_redirect_recovered', {
        method: 'google',
        after: pending.endedAs,
        delay_ms: Date.now() - pending.startedAt,
      });
      await fetchUserInfo(token, (token.match(/\./g) ?? []).length === 2);
    } catch (error) {
      console.error("[GoogleAuth] redirect recovery threw", error);
      fail('redirect_exchange_threw');
    }
  };
  // The listener and the prompt closure outlive a render; always call the latest.
  const completeFromRedirectRef = useRef(completeFromRedirect);
  completeFromRedirectRef.current = completeFromRedirect;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const pending = pendingRef.current;
      if (!pending || pending.done) return;
      if (!url.startsWith(pending.request.redirectUri)) return;
      if (Date.now() - pending.startedAt > LATE_REDIRECT_WINDOW_MS) return;
      pending.redirectUrl = url;
      // Browser promise still pending → it will normally win with this same
      // URL, and if it loses the race promptGoogleSignIn picks the URL up.
      // Already ended as cancel/dismiss → nobody else will process it.
      if (pending.endedAs) void completeFromRedirectRef.current(pending);
    });
    return () => subscription.remove();
  }, []);

  // Sync to store instead of returning
  useEffect(() => {
    useGoogleAuthStore.setState({
      isReady: !!request,
      promptGoogleSignIn: async () => {
        if (!request) {
          useAuthStore.getState().setAuthError("הכניסה עם Google לא זמינה כרגע. נסה שוב בעוד רגע.");
          return;
        }
        useGoogleAuthStore.setState({ isSigningIn: true, lastOutcome: null });
        const pending: PendingGoogleAttempt = {
          request,
          startedAt: Date.now(),
          endedAs: null,
          redirectUrl: null,
          responseSeen: false,
          done: false,
        };
        pendingRef.current = pending;
        try {
          const result = await promptAsync();

          if (result.type === 'success') {
            // isSigningIn stays true: the code exchange + server verify continue
            // in the `response` effect and are released in fetchUserInfo's
            // finally. The exchange inside the provider hook has no error
            // handler, so guard against it never delivering a response.
            setTimeout(() => {
              if (pendingRef.current !== pending || pending.responseSeen) return;
              pending.done = true;
              captureEvent('auth_failed', { method: 'google', error_code: 'code_exchange_timeout' });
              useAuthStore.getState().setAuthError("הכניסה עם Google נכשלה. נסה שוב או בחר שיטה אחרת.");
              useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: 'failed' });
            }, CODE_EXCHANGE_TIMEOUT_MS);
            return;
          }

          if (result.type === 'cancel' || result.type === 'dismiss') {
            pending.endedAs = result.type;
            // The redirect may already be here (it lost the race), or be a
            // moment behind. Only Android has this race; iOS and web get the
            // redirect inside the browser promise itself.
            if (Platform.OS === 'android') {
              if (!pending.redirectUrl) {
                await new Promise<void>((resolve) => setTimeout(resolve, REDIRECT_GRACE_MS));
              }
              if (pending.redirectUrl) {
                await completeFromRedirectRef.current(pending);
                return;
              }
            }
            // No redirect: the user really closed the browser. `pending` stays
            // open (done=false) so a redirect inside LATE_REDIRECT_WINDOW_MS —
            // the user returns to the still-open Google tab and finishes —
            // still signs them in.
            captureEvent('auth_cancelled', { method: 'google', result_type: result.type });
            useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: 'cancelled' });
            return;
          }

          // 'error' / 'locked': the `response` effect reports it; make sure the
          // attempt is released even if that effect does not run.
          pending.done = true;
          useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: 'failed' });
        } catch (error) {
          pending.done = true;
          useGoogleAuthStore.setState({ isSigningIn: false, lastOutcome: 'failed' });
          captureEvent('auth_failed', { method: 'google', error_code: 'promptAsync_threw' });
          useAuthStore.getState().setAuthError("שגיאה בפתיחת חלון הכניסה. נסה שוב.");
          console.error("[GoogleAuth] promptAsync threw", error);
        }
      }
    });
  }, [request, promptAsync]);
}
