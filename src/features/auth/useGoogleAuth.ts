import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useEffect } from "react";
import { useAuthStore } from "./useAuthStore";
import { getApiBase } from "../../db/apiBase";

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

export function useGoogleAuth() {
  const signIn = useAuthStore((s) => s.signIn);

  const redirectUri = makeRedirectUri({
    native: `${IOS_REVERSED_CLIENT_ID}:/`,
    scheme: "finpl",
  });

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

  const checkServerProfile = async (email: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `${getApiBase()}/api/sync/profile?authId=${encodeURIComponent(email)}`,
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

  const fetchUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user: GoogleUserInfo = await res.json();
      const email = user.email ?? "";
      const serverHasProfile = email ? await checkServerProfile(email) : false;
      signIn(user.name ?? "", email, serverHasProfile);
    } catch {
      // Silently fail, user stays on login screen
    }
  };

  return {
    promptGoogleSignIn: () => promptAsync(),
    isReady: !!request,
  };
}
