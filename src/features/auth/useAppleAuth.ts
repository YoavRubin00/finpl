import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useAuthStore } from "./useAuthStore";
import { getApiBase } from "../../db/apiBase";
import { captureEvent } from "../../lib/posthog";

/**
 * Apple Sign-In hook, required by App Store Guideline 4.8 when other
 * third-party logins (Google) are offered. iOS only.
 */
export function useAppleAuth() {
  const signIn = useAuthStore((s) => s.signIn);

  const isAvailable = Platform.OS === "ios";

  const verifyWithServer = async (authId: string, displayName: string): Promise<{ syncToken: string | null; hasProfile: boolean }> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'apple', appleUserId: authId, displayName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return { syncToken: null, hasProfile: false };
      const data = await res.json() as { profile: unknown; syncToken: string | null };
      return { syncToken: data.syncToken, hasProfile: !!data.profile };
    } catch {
      return { syncToken: null, hasProfile: false };
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
      const authId = credential.email ?? credential.user;
      const { syncToken, hasProfile } = await verifyWithServer(authId, displayName);
      signIn(displayName, authId, hasProfile, syncToken);

      // Explicit routing — iOS-safe pattern matching the email/Google flows.
      // Auto-routing via _layout effect fails on iOS because the async prompt
      // timing loses the state-change window.
      if (hasProfile) {
        router.replace("/(tabs)/" as never);
      } else {
        router.replace("/(auth)/onboarding" as never);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      // User canceled or auth failed, silently no-op so login screen stays.
      if (code !== "ERR_REQUEST_CANCELED") {
        captureEvent('auth_failed', { method: 'apple', error_code: code ?? 'unknown' });
        console.warn("[AppleAuth] signIn failed:", err);
      } else {
        captureEvent('auth_cancelled', { method: 'apple' });
      }
    }
  };

  return { promptAppleSignIn, isAvailable };
}