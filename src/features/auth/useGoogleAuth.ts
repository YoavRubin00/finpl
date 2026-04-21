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

  const verifyWithServer = async (accessToken: string): Promise<{ email: string; name: string; syncToken: string | null; hasProfile: boolean } | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', token: accessToken }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json() as { profile: { email?: string; displayName?: string; hasCompletedOnboarding?: boolean } | null; syncToken: string | null };
      return {
        email: data.profile?.email ?? '',
        name: data.profile?.displayName ?? '',
        syncToken: data.syncToken,
        hasProfile: !!data.profile,
      };
    } catch {
      return null;
    }
  };

  const fetchUserInfo = async (accessToken: string) => {
    try {
      // Still fetch basic info from Google for fallback display name
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googleUser: GoogleUserInfo = await res.json();
      // Verify server-side to get syncToken
      const verified = await verifyWithServer(accessToken);
      if (!verified) return;
      const email = verified.email || googleUser.email || '';
      const name = verified.name || googleUser.name || '';
      signIn(name, email, verified.hasProfile, verified.syncToken);
    } catch {
      // Silently fail, user stays on login screen
    }
  };

  return {
    promptGoogleSignIn: () => promptAsync(),
    isReady: !!request,
  };
}
