import { useEffect, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FINN_HELLO } from "../retention-loops/finnMascotConfig";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuthStore } from "./useGoogleAuthStore";
import { useAppleAuth } from "./useAppleAuth";
import { captureEvent } from "../../lib/posthog";
import { signInWithProfile } from "../../lib/auth/lifecycle";
import { getApiBase } from "../../db/apiBase";
import { ProfileBootScreen } from "./ProfileBootScreen";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: "#e2e8f0",
  backgroundColor: "#f8fafc",
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 15,
  color: "#1e293b",
  writingDirection: "rtl" as const,
  textAlign: "right" as const,
  shadowColor: "#0891b2",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};

export function LoginScreen() {
  const router = useRouter();
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const promptGoogleSignIn = useGoogleAuthStore((s) => s.promptGoogleSignIn);
  const googleReady = useGoogleAuthStore((s) => s.isReady);
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    captureEvent('login_form_viewed');
  }, []);

  const canSubmit = isValidEmail(email) && !loading;

  async function handleLogin() {
    if (!canSubmit) return;
    captureEvent('login_method_clicked', { method: 'email' });
    setLoading(true);
    setError(null);
    setSigningIn(true);
    try {
      const response = await fetch(`${getApiBase()}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'email', email: email.trim().toLowerCase() }),
      });
      const data = await response.json() as {
        ok: boolean;
        token?: string;
        syncToken?: string;
        profile: { id: string; authId: string; displayName: string | null; email: string | null } | null;
      };
      const resolvedToken = data.token ?? data.syncToken ?? null;
      if (!response.ok || !data?.ok || !data.profile || !resolvedToken) {
        captureEvent('login_failed', { method: 'email', reason: 'not_found' });
        setError("לא נמצא חשבון עם כתובת אימייל זו");
        setSigningIn(false);
        return;
      }
      await signInWithProfile(data.profile, resolvedToken, 'email');
      // This screen is "sign in to an existing account" — by definition the
      // user already onboarded. Mark it locally so the _layout nav guard routes
      // them into the app instead of bouncing back to /(auth)/onboarding.
      // (hasCompletedOnboarding is local-only state and was reset by the
      // auth-store-v3 key bump, so returning users would otherwise be stuck.)
      useAuthStore.getState().setOnboardingCompleted(true);
      router.replace("/(tabs)/" as never);
    } catch {
      captureEvent('login_failed', { method: 'email', reason: 'network' });
      setError("שגיאה בחיבור לשרת, נסה שוב");
      setSigningIn(false);
    } finally {
      setLoading(false);
    }
  }

  if (signingIn) {
    return <ProfileBootScreen loading onRetry={() => setSigningIn(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingBottom: 8, backgroundColor: "#ffffff" }}>
          <ExpoImage source={FINN_HELLO} accessible={false} style={{ width: 72, height: 72 }} contentFit="contain" />
          <Text style={{ textAlign: "center", fontSize: 28, fontWeight: "900", color: "#0891b2", marginTop: 2, writingDirection: "rtl" }}>
            FinPlay
          </Text>
          <Text style={{ textAlign: "center", fontSize: 13, fontWeight: "700", color: "#64748b", writingDirection: "rtl", marginTop: 2 }}>
            כניסה לחשבון קיים
          </Text>
        </SafeAreaView>

        <View style={{ flex: 1, backgroundColor: "#ffffff", paddingTop: 8 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Inline auth error banner — populated by Apple/Google OAuth failures. */}
            {authError && (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
              >
                <Text style={{ flex: 1, color: '#991b1b', fontSize: 13, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' }}>
                  {authError}
                </Text>
                <Pressable onPress={clearAuthError} accessibilityRole="button" accessibilityLabel="סגור התראה" hitSlop={8}>
                  <Text style={{ color: '#991b1b', fontWeight: '900', fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>
            )}

            {/* Email */}
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              placeholder="אימייל"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="אימייל"
              accessibilityHint="הזן את כתובת האימייל שרשמת איתה"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            {error && (
              <Text style={{ textAlign: "right", writingDirection: "rtl", fontSize: 13, color: "#ef4444", marginBottom: 10, fontWeight: "600" }}>
                {error}
              </Text>
            )}

            {/* Login Button */}
            <Pressable
              disabled={!canSubmit}
              onPress={handleLogin}
              accessibilityRole="button"
              accessibilityLabel="כניסה"
              accessibilityState={{ disabled: !canSubmit }}
              style={{
                width: "100%",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSubmit ? "#0891b2" : "#e2e8f0",
                borderBottomWidth: canSubmit ? 4 : 2,
                borderBottomColor: canSubmit ? "#0e7490" : "#cbd5e1",
                shadowColor: canSubmit ? "#0891b2" : "transparent",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: canSubmit ? 6 : 2,
              }}
            >
              {loading
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={{ fontSize: 15, fontWeight: "700", color: canSubmit ? "#ffffff" : "#64748b" }}>כניסה</Text>
              }
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
              <Text style={{ marginHorizontal: 16, fontSize: 12, color: "#64748b" }}>או</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
            </View>

            {/* Apple */}
            {appleAvailable && (
              <Pressable
                onPress={() => {
                  captureEvent('login_method_clicked', { method: 'apple' });
                  promptAppleSignIn();
                }}
                accessibilityRole="button"
                accessibilityLabel="כניסה עם Apple"
                style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#000000", paddingVertical: 14, marginBottom: 10, borderBottomWidth: 3, borderBottomColor: "#1f2937" }}
              >
                <Text style={{ fontSize: 18, marginRight: 8, color: "#ffffff" }}></Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff" }}>כניסה עם Apple</Text>
              </Pressable>
            )}

            {/* Google */}
            <Pressable
              disabled={!googleReady}
              onPress={() => {
                captureEvent('login_method_clicked', { method: 'google' });
                promptGoogleSignIn?.();
              }}
              accessibilityRole="button"
              accessibilityLabel="כניסה עם Google"
              style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#ffffff", paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: "#e2e8f0" }}
            >
              <Text style={{ fontSize: 16, marginRight: 8, color: "#1e293b" }}>G</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>כניסה עם Google</Text>
            </Pressable>

            {/* Link to register */}
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(auth)/register' as never);
              }}
              accessibilityRole="link"
              accessibilityLabel="אין לך חשבון? הירשם"
              hitSlop={12}
              style={{ marginTop: 12, paddingVertical: 8 }}
            >
              <Text style={{ textAlign: "center", fontSize: 12, color: "#64748b", writingDirection: "rtl" }}>
                אין לך חשבון?{" "}
                <Text style={{ color: "#0891b2", textDecorationLine: "underline", fontWeight: "600" }}>הירשם כאן</Text>
              </Text>
            </Pressable>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
