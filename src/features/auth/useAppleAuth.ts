import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuthStore } from "./useAuthStore";
import { getApiBase } from "../../db/apiBase";

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
    } catch (err: unknown) {
      // User canceled or auth failed, silently no-op so login screen stays.
      if ((err as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        // swallow other errors; UI will simply not advance.
      }
    }
  };

  return { promptAppleSignIn, isAvailable };
}