import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useAuthStore } from "./useAuthStore";
import { getApiBase } from "../../db/apiBase";
import { captureEvent } from "../../lib/posthog";
import { signInWithProfile } from "../../lib/auth/lifecycle";

/**
 * Apple Sign-In hook, required by App Store Guideline 4.8 when other
 * third-party logins (Google) are offered. iOS only.
 */
export function useAppleAuth() {
  const isAvailable = Platform.OS === "ios";

  const verifyWithServer = async (
    appleUserId: string,
    displayName: string,
  ): Promise<{ token: string; profile: { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean } } | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'apple', appleUserId, displayName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json() as {
        ok: boolean;
        token?: string;
        syncToken?: string;
        profile: { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean } | null;
      };
      const resolvedToken = data.token ?? data.syncToken ?? null;
      if (!data.ok || !data.profile || !resolvedToken) return null;
      return { token: resolvedToken, profile: data.profile };
    } catch {
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
      // user identifier is stable; use it as fallback when email is hidden
      const appleUserId = credential.email ?? credential.user;
      const result = await verifyWithServer(appleUserId, displayName);
      if (!result) {
        captureEvent('auth_failed', { method: 'apple', error_code: 'verify_failed' });
        useAuthStore.getState().setAuthError("הכניסה עם Apple נכשלה. נסה שוב או בחר שיטה אחרת.");
        return;
      }
      await signInWithProfile(result.profile, result.token);

      // Explicit routing — iOS-safe pattern matching the email/Google flows.
      // Auto-routing via _layout effect fails on iOS because the async prompt
      // timing loses the state-change window.
      if (result.profile.hasCompletedOnboarding) {
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
