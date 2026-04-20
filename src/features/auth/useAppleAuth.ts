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

  const checkServerProfile = async (authId: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `${getApiBase()}/api/sync/profile?authId=${encodeURIComponent(authId)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!res.ok) return false;
      const data = await res.json() as { profile: unknown };
      return !!data.profile;
    } catch {
      return false;
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
      const serverHasProfile = await checkServerProfile(authId);
      signIn(displayName, authId, serverHasProfile);
    } catch (err: unknown) {
      // User canceled or auth failed, silently no-op so login screen stays.
      if ((err as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        // swallow other errors; UI will simply not advance.
      }
    }
  };

  return { promptAppleSignIn, isAvailable };
}