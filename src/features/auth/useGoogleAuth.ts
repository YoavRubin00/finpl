import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuthStore } from "./useGoogleAuthStore";
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

  // iOS uses the reversed-client-id scheme.
  // Android OAuth clients require the strict package:/oauthredirect format.
  const redirectUri = makeRedirectUri({
    native: Platform.OS === "ios" ? `${IOS_REVERSED_CLIENT_ID}:/` : "com.finplay.app:/oauthredirect",
    scheme: "finpl"
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    scopes: ["profile", "email"],
    redirectUri,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      // Prefer accessToken; fall back to idToken if Google only returned a JWT.
      // The server (/api/auth/verify) handles both via tokeninfo/userinfo.
      const token = response.authentication?.accessToken ?? response.authentication?.idToken;
      if (token) {
        const isJwt = (token.match(/\./g) ?? []).length === 2;
        fetchUserInfo(token, isJwt);
        return;
      }
    }
    const details: Record<string, unknown> = { type: response.type };
    if ("error" in response && response.error) details.error = String(response.error);
    if ("errorCode" in response && response.errorCode) details.errorCode = response.errorCode;
    if ("params" in response && response.params) details.params = response.params;
    if ("url" in response && response.url) details.url = response.url;
    if (response.type === "success") {
      details.hasAccessToken = !!response.authentication?.accessToken;
      details.hasIdToken = !!response.authentication?.idToken;
    }
    console.error("[GoogleAuth] OAuth response failed", details);
    Alert.alert("OAuth Debug — response", JSON.stringify(details, null, 2));
  }, [response]);

  const verifyWithServer = async (token: string): Promise<{ email: string; name: string; syncToken: string | null; hasProfile: boolean } | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', token }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '<unreadable>');
        console.error("[GoogleAuth] /api/auth/verify failed", { status: res.status, body: body.slice(0, 300) });
        return null;
      }
      const data = await res.json() as { profile: { email?: string; displayName?: string; hasCompletedOnboarding?: boolean } | null; syncToken: string | null };
      return {
        email: data.profile?.email ?? '',
        name: data.profile?.displayName ?? '',
        syncToken: data.syncToken,
        hasProfile: !!data.profile,
      };
    } catch (err) {
      console.error("[GoogleAuth] /api/auth/verify threw", err);
      return null;
    }
  };

  const fetchUserInfo = async (token: string, isJwt: boolean) => {
    try {
      // Optional fallback: only access_tokens can call userinfo.
      // For id_tokens (JWT), skip — server resolves identity via tokeninfo.
      let googleUser: GoogleUserInfo | null = null;
      if (!isJwt) {
        try {
          const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) googleUser = await res.json();
        } catch {
          // Non-fatal — server-side verification is the source of truth.
        }
      }
      // Verify server-side to get syncToken (server handles both token kinds)
      const verified = await verifyWithServer(token);
      if (!verified) {
        console.error("[GoogleAuth] verifyWithServer returned null", { isJwt, tokenLength: token.length });
        Alert.alert("OAuth Debug — verify failed", "verifyWithServer returned null. Check API /api/auth/verify status & response.");
        return;
      }
      const email = verified.email || googleUser?.email || '';
      const name = verified.name || googleUser?.name || '';
      signIn(name, email, verified.hasProfile, verified.syncToken);

      // Explicit routing — iOS-safe pattern matching the email flow.
      if (verified.hasProfile) {
        router.replace("/(tabs)/" as never);
      } else {
        router.replace("/(auth)/onboarding" as never);
      }
    } catch (error) {
      console.error("[GoogleAuth] fetchUserInfo threw", error);
      Alert.alert("OAuth Debug — fetchUserInfo threw", String(error));
    }
  };

  // Sync to store instead of returning
  useEffect(() => {
    useGoogleAuthStore.setState({
      isReady: !!request,
      promptGoogleSignIn: async () => {
        if (!request) {
          Alert.alert(
            "OAuth Debug — request not ready",
            JSON.stringify({
              androidClientIdLen: GOOGLE_ANDROID_CLIENT_ID.length,
              iosClientIdLen: GOOGLE_IOS_CLIENT_ID.length,
              webClientIdLen: GOOGLE_WEB_CLIENT_ID.length,
              platform: Platform.OS,
            }, null, 2),
          );
          return;
        }
        try {
          await promptAsync();
        } catch (error) {
          Alert.alert("OAuth Debug — promptAsync threw", String(error));
        }
      }
    });
  }, [request, promptAsync]);
}
