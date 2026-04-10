import { useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ScrollView, 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuth } from "./useGoogleAuth";
import { useAppleAuth } from "./useAppleAuth";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { FINN_HELLO } from "../retention-loops/finnMascotConfig";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: "#e2e8f0",
  backgroundColor: "#f8fafc",
  paddingHorizontal: 16,
  paddingVertical: 13,
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
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const { promptGoogleSignIn, isReady: googleReady } = useGoogleAuth();
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isValid = isValidEmail(email) && password.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Top 38% — Ocean bg + Finn + title ── */}
        <ImageBackground
          source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/CHAT%20BACK.jpg' }}
          style={{ flex: 0.38, justifyContent: "flex-end", alignItems: "center", paddingBottom: 24 }}
          resizeMode="cover"
        >
          <SafeAreaView edges={["top"]} style={{ alignItems: "center" }}>
            <ExpoImage source={FINN_HELLO} accessible={false} style={{ width: 100, height: 100 }} contentFit="contain" />
            <Text
              style={{
                textAlign: "center",
                fontSize: 34,
                fontWeight: "900",
                color: "#ffffff",
                marginTop: 6,
                textShadowColor: "rgba(0,0,0,0.6)",
                textShadowOffset: { width: 0, height: 3 },
                textShadowRadius: 10,
              }}
            >
              FinPlay
            </Text>
            <Text
              style={{
                textAlign: "center",
                fontSize: 14,
                fontWeight: "700",
                color: "#ffffff",
                writingDirection: "rtl",
                marginTop: 4,
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 6,
              }}
            >
              משנים את כללי המשחק הפיננסי
            </Text>
          </SafeAreaView>
        </ImageBackground>

        {/* ── Bottom 62% — White form area with rounded top ── */}
        <View
          style={{
            flex: 0.62,
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            marginTop: -24,
            paddingTop: 24,
          }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Email */}
            <TextInput
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder="אימייל"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="כתובת אימייל"
              accessibilityHint="הזן כתובת אימייל"
            />

            {/* Password */}
            <View style={{ marginBottom: 6 }}>
              <TextInput
                style={{ ...inputStyle, paddingLeft: 48 }}
                placeholder="סיסמה"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="סיסמה"
                accessibilityHint="הזן את הסיסמה שלך"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", start: 14, top: 0, bottom: 0, justifyContent: "center" }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                <Text style={{ fontSize: 13, color: "#0891b2", fontWeight: "600" }}>
                  {showPassword ? "הסתר" : "הצג"}
                </Text>
              </Pressable>
            </View>

            {/* Forgot Password */}
            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              style={{ alignSelf: "flex-end", marginBottom: 16 }}
              accessibilityRole="link"
              accessibilityLabel="שכחתי סיסמה"
            >
              <Text style={{ fontSize: 13, color: "#0891b2", fontWeight: "600", writingDirection: "rtl" }}>
                שכחתי סיסמה
              </Text>
            </Pressable>

            {/* Login Button */}
            <Pressable
              disabled={!isValid}
              onPress={() => { if (isValid) signIn("", email.trim()); }}
              accessibilityRole="button"
              accessibilityLabel="התחבר"
              accessibilityState={{ disabled: !isValid }}
              style={{
                width: "100%",
                backgroundColor: isValid ? "#0891b2" : "#e2e8f0",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
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
                  fontSize: 16,
                  fontWeight: "800",
                  color: isValid ? "#ffffff" : "#64748b",
                }}
              >
                התחבר
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
              <Text style={{ marginHorizontal: 12, fontSize: 13, color: "#64748b" }}>או</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
            </View>

            {/* Apple Sign-In — required by App Store Guideline 4.8 (iOS only) */}
            {appleAvailable && (
              <Pressable
                onPress={() => promptAppleSignIn()}
                accessibilityRole="button"
                accessibilityLabel="התחבר עם Apple"
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
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff" }}>התחבר עם Apple</Text>
              </Pressable>
            )}

            {/* Google Sign-In */}
            <Pressable
              disabled={!googleReady}
              onPress={() => promptGoogleSignIn()}
              accessibilityRole="button"
              accessibilityLabel="התחבר עם Google"
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
              <Text style={{ fontSize: 18, marginRight: 8, color: "#1e293b" }}>G</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#1e293b" }}>התחבר עם Google</Text>
            </Pressable>

            {/* Register Link */}
            <Pressable
              onPress={() => router.push("/(auth)/register")}
              accessibilityRole="button"
              accessibilityLabel="הירשם עכשיו"
              style={{
                marginTop: 14,
                width: "100%",
                borderRadius: 14,
                backgroundColor: "#0891b2",
                paddingVertical: 14,
                alignItems: "center",
                borderBottomWidth: 4,
                borderBottomColor: "#0e7490",
                shadowColor: "#0891b2",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#ffffff", writingDirection: "rtl" }}>
                הירשם עכשיו
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginTop: 2, writingDirection: "rtl" }}>
                אין לך חשבון? בוא נתחיל!
              </Text>
            </Pressable>

            {/* Guest Mode */}
            <Pressable
              onPress={() => enterGuestMode()}
              accessibilityRole="button"
              accessibilityLabel="התחל ללא הרשמה"
              style={{
                marginTop: 14,
                width: "100%",
                borderRadius: 14,
                borderWidth: 2,
                borderColor: "#0891b2",
                backgroundColor: "rgba(8,145,178,0.06)",
                paddingVertical: 12,
                borderBottomWidth: 4,
                borderBottomColor: "#0e7490",
                shadowColor: "#0891b2",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text style={{ textAlign: "center", fontSize: 16, fontWeight: "800", color: "#0891b2", writingDirection: "rtl" }}>
                התחל ללא הרשמה
              </Text>
              <Text style={{ textAlign: "center", fontSize: 12, color: "#64748b", marginTop: 2, writingDirection: "rtl" }}>
                נשחק ואז נרשם
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
