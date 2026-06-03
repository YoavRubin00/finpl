import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useAuthStore } from "./useAuthStore";
import { getApiBase } from "../../db/apiBase";
import { captureEvent } from "../../lib/posthog";
import { signInWithProfile } from "../../lib/auth/lifecycle";
import { tokenStore } from "../../lib/auth/secureStore";
import { linkProvider } from "../../lib/api/auth";

/**
 * Apple Sign-In hook, required by App Store Guideline 4.8 when other
 * third-party logins (Google) are offered. iOS only.
 */
export function useAppleAuth() {
  const isAvailable = Platform.OS === "ios";

  const verifyWithServer = async (
    appleUserId: string,
    email: string | null,
    displayName: string,
  ): Promise<{ token: string; profile: { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean } } | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'apple', appleUserId, email, displayName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        // Match the Google flow's diagnostic — without the body we can't tell
        // an iOS-side 5xx from a server "Missing Apple identifier" 400. PostHog
        // sees auth_failed/verify_failed counts climbing without context.
        const body = await res.text().catch(() => '<unreadable>');
        console.error("[AppleAuth] /api/auth/verify failed", { status: res.status, body: body.slice(0, 300) });
        captureEvent('auth_failed', { method: 'apple', error_code: `verify_http_${res.status}` });
        return null;
      }
      const data = await res.json() as {
        ok: boolean;
        token?: string;
        syncToken?: string;
        profile: { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean } | null;
      };
      const resolvedToken = data.token ?? data.syncToken ?? null;
      if (!data.ok || !data.profile || !resolvedToken) {
        console.error("[AppleAuth] /api/auth/verify returned incomplete payload", { ok: data.ok, hasProfile: !!data.profile, hasToken: !!resolvedToken });
        captureEvent('auth_failed', { method: 'apple', error_code: 'verify_incomplete_payload' });
        return null;
      }
      return { token: resolvedToken, profile: data.profile };
    } catch (err) {
      console.error("[AppleAuth] /api/auth/verify threw", err);
      captureEvent('auth_failed', { method: 'apple', error_code: err instanceof Error && err.name === 'AbortError' ? 'verify_timeout' : 'verify_threw' });
      return null;
    }
  };

  const promptAppleSignIn = async (): Promise<void> => {
    if (!isAvailable) return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Apple returns email/name only on first sign-in. Persist whatever we get.
      const fullName = credential.fullName;
      const displayName =
        [fullName?.givenName, fullName?.familyName].filter(Boolean).join(" ").trim() ||
        "משתמש Apple";
      // ALWAYS use credential.user as the authId — it is the stable identifier
      // Apple returns on every sign-in. The previous code fell back to email
      // which is only returned on FIRST sign-in, so subsequent sign-ins
      // produced a different authId and created an orphan row server-side.
      // credential.email is sent separately so the server can persist it
      // (and migrate any legacy row keyed on it).
      const appleUserId = credential.user;
      // If already signed in, this is a "connect account" action, not a login:
      // attach the Apple subject to the current uuid and stop (do NOT re-run the
      // sign-in path, which would mint a new session / re-prefetch).
      const alreadySignedIn = !!(await tokenStore.get());
      if (alreadySignedIn) {
        try {
          await linkProvider({ provider: 'apple', appleUserId });
          useAuthStore.getState().setAuthError(null);
        } catch {
          useAuthStore.getState().setAuthError('קישור החשבון נכשל. נסו שוב.');
        }
        return;
      }
      const emailFromApple = credential.email ?? null;
      const result = await verifyWithServer(appleUserId, emailFromApple, displayName);
      if (!result) {
        captureEvent('auth_failed', { method: 'apple', error_code: 'verify_failed' });
        useAuthStore.getState().setAuthError("הכניסה עם Apple נכשלה. נסה שוב או בחר שיטה אחרת.");
        return;
      }
      await signInWithProfile(result.profile, result.token, 'apple');

      // Route by the post-signIn store value rather than the raw server flag,
      // so returning users on the same device aren't bounced through onboarding
      // even when the server response is missing the field.
      const completed =
        result.profile.hasCompletedOnboarding === true ||
        useAuthStore.getState().hasCompletedOnboarding === true;
      if (completed) {
        router.replace("/(tabs)/" as never);
      } else {
        router.replace("/(auth)/onboarding" as never);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      // User canceled or auth failed. Silent for cancel, inline banner for real failures.
      if (code !== "ERR_REQUEST_CANCELED") {
        captureEvent('auth_failed', { method: 'apple', error_code: code ?? 'unknown' });
        useAuthStore.getState().setAuthError("הכניסה עם Apple נכשלה. נסה שוב או בחר שיטה אחרת.");
        console.warn("[AppleAuth] signIn failed:", err);
      } else {
        captureEvent('auth_cancelled', { method: 'apple' });
      }
    }
  };

  return { promptAppleSignIn, isAvailable };
}
