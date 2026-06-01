import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuthStore } from "./useGoogleAuthStore";
import { getApiBase } from "../../db/apiBase";
import { captureEvent } from "../../lib/posthog";
import { signInWithProfile } from "../../lib/auth/lifecycle";
import { tokenStore } from "../../lib/auth/secureStore";
import { linkProvider } from "../../lib/api/auth";

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

interface VerifyResult {
  token: string;
  profile: {
    id: string;
    authId: string;
    displayName: string | null;
    email: string | null;
    hasCompletedOnboarding?: boolean;
  };
}

export function useGoogleAuth() {
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
    if (response.type === 'cancel' || response.type === 'dismiss') {
      captureEvent('auth_cancelled', { method: 'google' });
    } else {
      captureEvent('auth_failed', { method: 'google', error_code: String(details.errorCode ?? details.type) });
      useAuthStore.getState().setAuthError("הכניסה עם Google נכשלה. נסה שוב או בחר שיטה אחרת.");
    }
    console.error("[GoogleAuth] OAuth response failed", details);
  }, [response]);

  const verifyWithServer = async (googleToken: string): Promise<VerifyResult | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', token: googleToken }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '<unreadable>');
        console.error("[GoogleAuth] /api/auth/verify failed", { status: res.status, body: body.slice(0, 300) });
        return null;
      }
      const data = await res.json() as {
        ok: boolean;
        token?: string;
        syncToken?: string;
        profile: { id: string; authId: string; displayName: string | null; email: string | null; hasCompletedOnboarding?: boolean } | null;
      };
      const resolvedToken = data.token ?? data.syncToken ?? null;
      if (!data.ok || !data.profile || !resolvedToken) return null;
      return { token: resolvedToken, profile: data.profile };
    } catch (err) {
      console.error("[GoogleAuth] /api/auth/verify threw", err);
      return null;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchUserInfo = async (token: string, _isJwt: boolean) => {
    try {
      // Already signed in → connect-account action, not login.
      const alreadySignedIn = !!(await tokenStore.get());
      if (alreadySignedIn) {
        try {
          await linkProvider({ provider: 'google', token });
          useAuthStore.getState().setAuthError(null);
        } catch {
          useAuthStore.getState().setAuthError('קישור החשבון נכשל. נסו שוב.');
        }
        return;
      }
      // Optional fallback: only access_tokens can call userinfo.
      // For id_tokens (JWT), skip — server resolves identity via tokeninfo.
      let googleUser: GoogleUserInfo | null = null;
      if (!_isJwt) {
        try {
          const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) googleUser = await res.json();
        } catch {
          // Non-fatal — server-side verification is the source of truth.
        }
      }
      // Verify server-side to get JWT (server handles both token kinds)
      const verified = await verifyWithServer(token);
      if (!verified) {
        console.error("[GoogleAuth] verifyWithServer returned null", { _isJwt, tokenLength: token.length });
        captureEvent('auth_failed', { method: 'google', error_code: 'verify_returned_null' });
        useAuthStore.getState().setAuthError("השרת לא הצליח לאמת את הכניסה. נסה שוב.");
        return;
      }
      // If Google userinfo gave us a richer name, patch the profile display name
      if (googleUser?.name && !verified.profile.displayName) {
        verified.profile.displayName = googleUser.name;
      }
      await signInWithProfile(verified.profile, verified.token, 'google');

      // Route by the post-signIn store value rather than the raw server flag.
      // The store preserves prior-session hasCompletedOnboarding when the server
      // doesn't include the field, so returning users on the same device land
      // straight in /(tabs) without bouncing through onboarding.
      const completed =
        verified.profile.hasCompletedOnboarding === true ||
        useAuthStore.getState().hasCompletedOnboarding === true;
      if (completed) {
        router.replace("/(tabs)/" as never);
      } else {
        router.replace("/(auth)/onboarding" as never);
      }
    } catch (error) {
      console.error("[GoogleAuth] fetchUserInfo threw", error);
      captureEvent('auth_failed', { method: 'google', error_code: 'fetchUserInfo_threw' });
      useAuthStore.getState().setAuthError("שגיאת רשת בכניסה. בדוק את החיבור ונסה שוב.");
    }
  };

  // Sync to store instead of returning
  useEffect(() => {
    useGoogleAuthStore.setState({
      isReady: !!request,
      promptGoogleSignIn: async () => {
        if (!request) {
          useAuthStore.getState().setAuthError("הכניסה עם Google לא זמינה כרגע. נסה שוב בעוד רגע.");
          return;
        }
        try {
          await promptAsync();
        } catch (error) {
          captureEvent('auth_failed', { method: 'google', error_code: 'promptAsync_threw' });
          useAuthStore.getState().setAuthError("שגיאה בפתיחת חלון הכניסה. נסה שוב.");
          console.error("[GoogleAuth] promptAsync threw", error);
        }
      }
    });
  }, [request, promptAsync]);
}
