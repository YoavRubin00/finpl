import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuthStore } from "./useAuthStore";

/**
 * Apple Sign-In hook — required by App Store Guideline 4.8 when other
 * third-party logins (Google) are offered. iOS only.
 */
export function useAppleAuth() {
  const signIn = useAuthStore((s) => s.signIn);

  const isAvailable = Platform.OS === "ios";

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
      const email = credential.email ?? credential.user;
      signIn(displayName, email);
    } catch (err: unknown) {
      // User canceled or auth failed — silently no-op so login screen stays.
      if ((err as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        // eslint-disable-next-line no-console
        // swallow other errors; UI will simply not advance.
      }
    }
  };

  return { promptAppleSignIn, isAvailable };
}