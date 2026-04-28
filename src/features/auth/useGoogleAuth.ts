import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
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

  if (__DEV__) {
    if (Platform.OS === "android" && !GOOGLE_ANDROID_CLIENT_ID) {
      console.warn("[GoogleAuth] EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID missing — Android sign-in will fail silently in this build");
    }
    if (Platform.OS === "ios" && !GOOGLE_IOS_CLIENT_ID) {
      console.warn("[GoogleAuth] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID missing — iOS sign-in falls back to web client");
    }
  }

  // iOS uses the reversed-client-id scheme (registered in app.json
  // ios.infoPlist.CFBundleURLTypes). Android OAuth clients are bound to
  // package + SHA-1; the redirect must be `com.finplay.app:/oauthredirect`,
  // which expo-auth-session derives automatically when redirectUri is
  // omitted. Passing `finpl://` produced Google `400 invalid_request`.
  const redirectUri =
    Platform.OS === "ios"
      ? makeRedirectUri({ native: `${IOS_REVERSED_CLIENT_ID}:/`, scheme: "finpl" })
      : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    scopes: ["profile", "email"],
    ...(redirectUri ? { redirectUri } : {}),
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success" && response.authentication?.accessToken) {
      fetchUserInfo(response.authentication.accessToken);
    } else if (response.type === "error") {
      console.warn("[GoogleAuth] auth error:", response.error);
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
      if (!verified) {
        console.warn("[GoogleAuth] Server verification failed");
        return;
      }
      const email = verified.email || googleUser.email || '';
      const name = verified.name || googleUser.name || '';
      signIn(name, email, verified.hasProfile, verified.syncToken);

      // Explicit routing — iOS-safe pattern matching the email flow.
      // Auto-routing via _layout effect fails on iOS because promptAsync()
      // timing loses the state-change window.
      if (verified.hasProfile) {
        router.replace("/(tabs)/" as never);
      } else {
        router.replace("/(auth)/onboarding" as never);
      }
    } catch (error) {
      console.warn("[GoogleAuth] fetchUserInfo failed:", error);
    }
  };

  return {
    promptGoogleSignIn: () => promptAsync(),
    isReady: !!request,
  };
}
