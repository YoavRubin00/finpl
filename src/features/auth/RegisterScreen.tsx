import { useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FINN_HELLO } from "../retention-loops/finnMascotConfig";
import { getPasswordStrength } from "./password-utils";
import type { PasswordStrength } from "./types";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuth } from "./useGoogleAuth";
import { useAppleAuth } from "./useAppleAuth";
import { getAvatarById, DEFAULT_AVATAR_EMOJI } from "../avatars/avatarData";

const strengthLabels: Record<PasswordStrength, string> = {
  weak: "סיסמה חלשה",
  medium: "סיסמה בינונית",
  strong: "סיסמה חזקה",
};

const strengthBarColors: Record<PasswordStrength, string> = {
  weak: "#f87171",
  medium: "#eab308",
  strong: "#22c55e",
};

const strengthTextColors: Record<PasswordStrength, string> = {
  weak: "#ef4444",
  medium: "#eab308",
  strong: "#22c55e",
};

const strengthWidthPercent: Record<PasswordStrength, `${number}%`> = {
  weak: "33%",
  medium: "66%",
  strong: "100%",
};

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

export function RegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const signIn = useAuthStore((s) => s.signIn);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const avatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const { promptGoogleSignIn, isReady: googleReady } = useGoogleAuth();
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const isValid =
    name.trim().length >= 2 &&
    isValidEmail(email) &&
    passwordStrength !== "weak" &&
    password === confirmPassword &&
    confirmPassword.length > 0 &&
    termsAccepted;

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Compact header with Finn/Avatar + title ── */}
        <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingBottom: 8, backgroundColor: "#ffffff" }}>
          {avatarId ? (
            <View
              accessible={false}
              style={{
                height: 52, width: 52, alignItems: "center", justifyContent: "center",
                borderRadius: 26, borderWidth: 2, borderColor: "#0891b2",
                backgroundColor: "#f0f9ff",
              }}
            >
              <Text style={{ fontSize: 28 }}>{getAvatarById(avatarId)?.emoji ?? DEFAULT_AVATAR_EMOJI}</Text>
            </View>
          ) : (
            <ExpoImage source={FINN_HELLO} accessible={false} style={{ width: 72, height: 72 }} contentFit="contain" />
          )}
          <Text
            style={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: "900",
              color: "#0891b2",
              marginTop: 2,
              writingDirection: "rtl",
            }}
          >
            FinPlay
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontSize: 13,
              fontWeight: "700",
              color: "#64748b",
              writingDirection: "rtl",
              marginTop: 2,
            }}
          >
            צור חשבון והתחל ללמוד
          </Text>
        </SafeAreaView>

        {/* ── Form area ── */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
            paddingTop: 8,
          }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Full Name */}
            <TextInput
              style={{ ...inputStyle, marginBottom: 8 }}
              placeholder="שם מלא"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            accessibilityLabel="שם מלא"
              accessibilityHint="הזן את שמך המלא" />

            {/* Email */}
            <TextInput
              style={{ ...inputStyle, marginBottom: 8 }}
              placeholder="אימייל"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              maxLength={254}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            accessibilityLabel="אימייל"
              accessibilityHint="הזן כתובת אימייל תקינה" />

            {/* Password */}
            <View style={{ marginBottom: 4 }}>
              <TextInput
                style={{ ...inputStyle, paddingStart: 44 }}
                placeholder="סיסמה"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                maxLength={128}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="סיסמה"
                accessibilityHint="הזן סיסמה עם לפחות 6 תווים" />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", start: 12, top: 0, bottom: 0, justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 12, color: "#0891b2", fontWeight: "600" }}>
                  {showPassword ? "הסתר" : "הצג"}
                </Text>
              </Pressable>
            </View>

            {/* Password Strength */}
            {password.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <View style={{ height: 6, width: "100%", borderRadius: 3, backgroundColor: "#f1f5f9" }}>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: strengthBarColors[passwordStrength],
                      width: strengthWidthPercent[passwordStrength],
                    }}
                  />
                </View>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: strengthTextColors[passwordStrength],
                    writingDirection: "rtl",
                    textAlign: "right",
                  }}
                >
                  {strengthLabels[passwordStrength]}
                </Text>
              </View>
            )}
            {password.length === 0 && <View style={{ marginBottom: 8 }} />}

            {/* Confirm Password */}
            <View style={{ marginBottom: 12 }}>
              <TextInput
                style={{ ...inputStyle, paddingStart: 44 }}
                placeholder="אישור סיסמה"
                placeholderTextColor="#64748b"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                maxLength={128}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="אישור סיסמה"
                accessibilityHint="הזן שוב את הסיסמה לאימות" />
              <Pressable
                onPress={() => setShowConfirmPassword((v) => !v)}
                style={{ position: "absolute", start: 12, top: 0, bottom: 0, justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "הסתר אישור סיסמה" : "הצג אישור סיסמה"}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 12, color: "#0891b2", fontWeight: "600" }}>
                  {showConfirmPassword ? "הסתר" : "הצג"}
                </Text>
              </Pressable>
            </View>

            {/* Terms — link + checkbox (separated so link doesn't toggle checkbox) */}
            <View style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() => router.push("/(auth)/terms")}
                style={{ marginBottom: 8 }}
                accessibilityRole="link"
                accessibilityLabel="קרא את תנאי השימוש ומדיניות הפרטיות"
              >
                <Text style={{ fontSize: 12, color: "#0891b2", textDecorationLine: "underline", writingDirection: "rtl", textAlign: "right", fontWeight: "600" }}>
                  קרא/י את תנאי השימוש ומדיניות הפרטיות
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTermsAccepted((v) => !v)}
                style={{ flexDirection: "row-reverse", alignItems: "center" }}
                accessibilityRole="checkbox"
                accessibilityLabel="קראתי ואני מסכים לתנאי השימוש"
                accessibilityState={{ checked: termsAccepted }}
              >
                <View style={{ height: 20, width: 20, alignItems: "center", justifyContent: "center", borderRadius: 4, borderWidth: 1.5, borderColor: termsAccepted ? "#0891b2" : "#cbd5e1", backgroundColor: termsAccepted ? "#0891b2" : "#f8fafc" }}>
                  {termsAccepted && <Text style={{ fontSize: 12, fontWeight: "700", color: "#ffffff" }}>✓</Text>}
                </View>
                <Text style={{ marginRight: 8, fontSize: 12, color: "#64748b", writingDirection: "rtl", textAlign: "right" }}>
                  קראתי ואני מסכים/ה לתנאי השימוש ומדיניות הפרטיות
                </Text>
              </Pressable>
            </View>

            {/* Register Button */}
            <Pressable
              disabled={!isValid}
              onPress={() => {
                if (isValid) {
                  signIn(name.trim(), email.trim());
                  const dest = returnTo ? decodeURIComponent(returnTo) : "/(tabs)/";
                  router.replace(dest as never);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="הירשם"
              accessibilityState={{ disabled: !isValid }}
              style={{
                width: "100%",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: isValid ? "#0891b2" : "#e2e8f0",
                borderBottomWidth: isValid ? 4 : 2,
                borderBottomColor: isValid ? "#0e7490" : "#cbd5e1",
                shadowColor: isValid ? "#0891b2" : "transparent",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: isValid ? 6 : 2,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 15,
                  fontWeight: "700",
                  color: isValid ? "#ffffff" : "#64748b",
                }}
              >
                הירשם
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
              <Text style={{ marginHorizontal: 16, fontSize: 12, color: "#64748b" }}>או</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
            </View>

            {/* Apple Sign-In — required by App Store Guideline 4.8 (iOS only) */}
            {appleAvailable && (
              <Pressable
                onPress={() => promptAppleSignIn()}
                accessibilityRole="button"
                accessibilityLabel="הירשם עם Apple"
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  backgroundColor: "#000000",
                  paddingVertical: 14,
                  marginBottom: 10,
                  borderBottomWidth: 3,
                  borderBottomColor: "#1f2937",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 8, color: "#ffffff" }}></Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff" }}>הירשם עם Apple</Text>
              </Pressable>
            )}

            {/* Google Sign-In */}
            <Pressable
              disabled={!googleReady}
              onPress={() => promptGoogleSignIn()}
              accessibilityRole="button"
              accessibilityLabel="הירשם עם Google"
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "#e2e8f0",
                backgroundColor: "#ffffff",
                paddingVertical: 14,
                borderBottomWidth: 3,
                borderBottomColor: "#e2e8f0",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 8, color: "#1e293b" }}>G</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>
                הירשם עם Google
              </Text>
            </Pressable>

            {/* Login Link */}
            <Pressable
              onPress={() => router.push("/(auth)/sign-in")}
              accessibilityRole="link"
              accessibilityLabel="כבר יש לך חשבון? לחץ כאן"
              style={{ marginTop: 12, paddingVertical: 4 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "#64748b",
                  writingDirection: "rtl",
                }}
              >
                כבר יש לך חשבון?{" "}
                <Text style={{ color: "#0891b2", textDecorationLine: "underline", fontWeight: "600" }}>לחץ כאן</Text>
              </Text>
            </Pressable>

            {/* Skip registration — guest mode → onboarding */}
            <Pressable
              onPress={() => enterGuestMode()}
              accessibilityRole="button"
              accessibilityLabel="התחל ללא חשבון"
              style={{
                marginTop: 8,
                width: "100%",
                borderRadius: 14,
                borderWidth: 2,
                borderColor: "#0891b2",
                backgroundColor: "rgba(8,145,178,0.06)",
                paddingVertical: 12,
                borderBottomWidth: 4,
                borderBottomColor: "#0e7490",
              }}
            >
              <Text style={{ textAlign: "center", fontSize: 15, fontWeight: "800", color: "#0891b2", writingDirection: "rtl" }}>
                התחל ללא חשבון
              </Text>
              <Text style={{ textAlign: "center", fontSize: 11, color: "#64748b", marginTop: 2, writingDirection: "rtl" }}>
                תמיד אפשר להירשם אחר כך
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
