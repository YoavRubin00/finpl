import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "./useAuthStore";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

interface GoogleUserInfo {
  name: string;
  email: string;
  picture?: string;
}

export function useGoogleAuth() {
  const signIn = useAuthStore((s) => s.signIn);

  // On web, use the Expo auth proxy so the redirect URI matches
  // what's configured in Google Cloud Console: https://auth.expo.io/@yrubin00/finpl
  const redirectUri =
    Platform.OS === "web"
      ? "https://auth.expo.io/@yrubin00/finpl"
      : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    scopes: ["profile", "email"],
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      fetchUserInfo(response.authentication.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user: GoogleUserInfo = await res.json();
      signIn(user.name ?? "", user.email ?? "");
    } catch {
      // Silently fail — user stays on login screen
    }
  };

  return {
    promptGoogleSignIn: () => promptAsync(),
    isReady: !!request,
  };
}
