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
import { fetchUserProfile } from "../../db/sync/syncUserProfile";
import { useEconomyStore } from "../economy/useEconomyStore";
import { captureEvent } from "../../lib/posthog";

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
  const signIn = useAuthStore((s) => s.signIn);
  const promptGoogleSignIn = useGoogleAuthStore((s) => s.promptGoogleSignIn);
  const googleReady = useGoogleAuthStore((s) => s.isReady);
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureEvent('login_form_viewed');
  }, []);

  const canSubmit = isValidEmail(email) && !loading;

  async function handleLogin() {
    if (!canSubmit) return;
    captureEvent('login_method_clicked', { method: 'email' });
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchUserProfile(email.trim().toLowerCase());
      if (!profile) {
        captureEvent('login_failed', { method: 'email', reason: 'not_found' });
        setError("לא נמצא חשבון עם כתובת אימייל זו");
        return;
      }
      // Hydrate paper-trading currency from server. NUMERIC comes over JSON
      // as a string, so parse before handing to the store.
      const serverBalance = parseFloat(String(profile.virtual_balance ?? '0'));
      if (Number.isFinite(serverBalance)) {
        useEconomyStore.getState().setVirtualBalance(serverBalance);
      }
      signIn((profile.displayName as string) ?? email, email.trim().toLowerCase());
      router.replace("/(tabs)/" as never);
    } catch {
      captureEvent('login_failed', { method: 'email', reason: 'network' });
      setError("שגיאה בחיבור לשרת, נסה שוב");
    } finally {
      setLoading(false);
    }
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
