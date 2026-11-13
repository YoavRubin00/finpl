import { useEffect, useRef, useState } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { GoogleLogo } from "../../components/ui/GoogleLogo";
import { AppleLogo } from "../../components/ui/AppleLogo";
import { FINN_HELLO, FINN_DANCING } from "../retention-loops/finnMascotConfig";
import { useAuthStore } from "./useAuthStore";
import { useGoogleAuthStore } from "./useGoogleAuthStore";
import { useAppleAuth } from "./useAppleAuth";
import { AvatarImage } from "../avatars/AvatarImage";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { captureEvent } from "../../lib/posthog";
import { signInWithProfile } from "../../lib/auth/lifecycle";
import type { VerifiedSession } from "../../lib/api/auth";
import { EmailCodeStep, sendEmailCode } from "./EmailCodeStep";

// The form is name + email + one button. Email accounts have no password: the
// button mails a 6-digit code and the account is created (or signed in) only
// once that code is entered (2026-11-13). Before, the app signed the user in
// locally and asked the server for a session with the email alone, which let
// anyone sign in as anyone.

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
  const insets = useSafeAreaInsets();
  const { returnTo, onboarding } = useLocalSearchParams<{ returnTo?: string; onboarding?: string }>();
  const convertGuestToUser = useAuthStore((s) => s.convertGuestToUser);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);
  const avatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const authError = useAuthStore((s) => s.authError);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);
  const promptGoogleSignIn = useGoogleAuthStore((s) => s.promptGoogleSignIn);
  const googleReady = useGoogleAuthStore((s) => s.isReady);
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  // "form" → name + email; "code" → the mailed code (EmailCodeStep).
  const [phase, setPhase] = useState<"form" | "code">("form");
  const [codeEmail, setCodeEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    captureEvent('signup_form_viewed', { is_guest: isGuest });
  }, [isGuest]);

  // Deferred navigation — only fire router.replace once the auth store has
  // actually committed isAuthenticated=true (and isGuest=false after a guest
  // conversion). Without this, the 1.8s celebration timeout would sometimes
  // race against the global routing observer in _layout.tsx, which bounced
  // converted-guest users back to the register screen.
  useEffect(() => {
    if (!showSuccess) return;
    if (!isAuthenticated || isGuest) return;
    const dest = returnTo ? decodeURIComponent(returnTo) : "/(tabs)/";
    const t = setTimeout(() => router.replace(dest as never), 1800);
    return () => clearTimeout(t);
  }, [showSuccess, isAuthenticated, isGuest, returnTo, router]);

  // Terms were already accepted implicitly when the user tapped one of the
  // CTAs on the previous Welcome screen (per Duolingo/Spotify pattern). We
  // don't gate the register button on it a second time.
  const isValid = name.trim().length >= 2 && isValidEmail(email.trim());

  async function handleRegister() {
    if (!isValid || sending || showSuccess) return;
    captureEvent('signup_method_clicked', { method: 'email' });
    const normalized = email.trim().toLowerCase();
    setSending(true);
    setFormError(null);
    clearAuthError();
    const failure = await sendEmailCode(normalized, 'register');
    setSending(false);
    if (failure) {
      setFormError(failure);
      return;
    }
    setCodeEmail(normalized);
    setPhase("code");
  }

  // The server accepted the code: only now does the app become signed in.
  async function handleVerified(session: VerifiedSession) {
    if (isGuest) {
      // ?onboarding=1 means we arrived from the signup-gate email button: keep
      // onboarding incomplete so returnTo bounces back to /(auth)/onboarding →
      // celebration → streak → mod-0-1 (the flag is flipped by enterFirstModule).
      // Fires guest_converted_to_user / registration attribution as before.
      convertGuestToUser(name.trim(), session.profile.email ?? codeEmail, { completeOnboarding: onboarding !== "1" });
    }
    // Stores the JWT, logs RevenueCat in with the profile id, pushes guest-era
    // local progress (backfill) and fires user_signed_in.
    await signInWithProfile(session.profile, session.token, 'email');
    // Navigation is deferred to the effect above, which waits for the store to
    // reflect isAuthenticated so _layout.tsx can't bounce us back mid-update.
    setShowSuccess(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Back chevron. When we arrived from an in-game register CTA (returnTo set),
          advance FORWARD to that destination instead of popping back to the lesson
          that's still on the stack — otherwise the user lands back on the module
          they just finished and feels stuck. No returnTo → onboarding choice. */}
      <Pressable
        onPress={() => {
          if (phase === "code") setPhase("form");
          else if (returnTo) router.replace(decodeURIComponent(returnTo) as never);
          else if (router.canGoBack()) router.back();
          else router.replace("/(auth)/onboarding" as never);
        }}
        accessibilityRole="button"
        accessibilityLabel="חזרה"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          position: "absolute",
          top: insets.top + 8,
          right: 16,
          zIndex: 20,
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
        }}
      >
        <ChevronRight size={24} color="#64748b" />
      </Pressable>
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
                overflow: "hidden",
              }}
            >
              <AvatarImage avatarId={avatarId} size={48} emojiStyle={{ fontSize: 28 }} />
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
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {/* Inline auth error banner — set by Apple/Google/email auth failures.
                Stays visible until the user taps X or attempts auth again. */}
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

            {phase === "code" ? (
              <EmailCodeStep
                email={codeEmail}
                displayName={name.trim() || null}
                source="register"
                onVerified={handleVerified}
                onChangeEmail={() => setPhase("form")}
              />
            ) : (
            <>
            {/* Full Name */}
            <TextInput
              style={{ ...inputStyle, marginBottom: 8 }}
              placeholder="שם מלא"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailInputRef.current?.focus()}
              accessibilityLabel="שם מלא"
              accessibilityHint="הזן את שמך המלא" />

            {/* Email — the last field. System autofill offers the saved address. */}
            <TextInput
              ref={emailInputRef}
              style={{ ...inputStyle, marginBottom: 12 }}
              placeholder="אימייל"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={(v) => { setEmail(v); if (formError) setFormError(null); }}
              maxLength={254}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={() => void handleRegister()}
              accessibilityLabel="אימייל"
              accessibilityHint="הזן כתובת אימייל תקינה" />

            {formError && (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{ fontSize: 13, fontWeight: "600", color: "#dc2626", textAlign: "right", writingDirection: "rtl", marginBottom: 10 }}
              >
                {formError}
              </Text>
            )}

            {/* Terms reminder — implicit consent on Register tap; this is just
                a discoverable link to read them. No checkbox: the gate already
                happened on the Welcome screen. */}
            <Pressable
              onPress={() => router.push("/(auth)/terms")}
              style={{ marginBottom: 16, alignSelf: "flex-end" }}
              accessibilityRole="link"
              accessibilityLabel="קרא את תנאי השימוש ומדיניות הפרטיות"
            >
              <Text style={{ fontSize: 11, color: "#94a3b8", writingDirection: "rtl", textAlign: "right" }}>
                {"בלחיצה על 'הרשמה' אתם מאשרים את "}
                <Text style={{ color: "#0891b2", textDecorationLine: "underline" }}>תנאי השימוש ומדיניות הפרטיות</Text>
              </Text>
            </Pressable>

            {/* Register Button */}
            {/* Register Button — mails the code; the account exists only after
                the code is entered (handleVerified). RevenueCat is logged in
                there with the real profile id, so no email-keyed RC login and
                no "ghost" local-only account any more. */}
            <Pressable
              disabled={!isValid || showSuccess || sending}
              onPress={() => void handleRegister()}
              accessibilityRole="button"
              accessibilityLabel="הירשם"
              accessibilityState={{ disabled: !isValid, busy: sending }}
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
              {sending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
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
              )}
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
              <Text style={{ marginHorizontal: 16, fontSize: 12, color: "#64748b" }}>או</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
            </View>

            {/* Apple Sign-In, required by App Store Guideline 4.8 (iOS only) */}
            {appleAvailable && (
              <Pressable
                onPress={() => {
                  captureEvent('signup_method_clicked', { method: 'apple' });
                  promptAppleSignIn();
                }}
                accessibilityRole="button"
                accessibilityLabel="הירשם עם Apple"
                style={{
                  width: "100%",
                  // row-reverse keeps the Hebrew label first in reading order
                  // but places the Apple logo on the visual RIGHT — matches
                  // RTL convention for icon placement.
                  flexDirection: "row-reverse",
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
                <AppleLogo size={18} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff", marginRight: 8 }}>הירשם עם Apple</Text>
              </Pressable>
            )}

            {/* Google Sign-In */}
            <Pressable
              disabled={!googleReady}
              onPress={() => {
                captureEvent('signup_method_clicked', { method: 'google' });
                promptGoogleSignIn?.();
              }}
              accessibilityRole="button"
              accessibilityLabel="הירשם עם Google"
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1e293b" }}>
                הירשם עם Google
              </Text>
              <GoogleLogo size={18} />
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

            {/* Skip-to-guest — kept as a subtle text link so it doesn't compete
                with the primary "Register" CTA above (which is the conversion
                goal). Was previously a full-width outlined button which drew
                too much attention away from sign-up.
                Hidden when `returnTo` is set: that means the user arrived from
                an in-app upgrade CTA (e.g., guest tapping "create account from
                More menu"), and offering "start as guest" there is meaningless
                — they're already a guest, and the link would just no-op back
                into the app. Visible only on the initial onboarding path. */}
            {!returnTo && (
              <Pressable
                onPress={() => {
                  captureEvent('signup_skipped_for_guest');
                  enterGuestMode('register_screen_skip');
                }}
                accessibilityRole="button"
                accessibilityLabel="התחל ללא חשבון"
                style={{ marginTop: 12, paddingVertical: 6, alignSelf: "center" }}
              >
                <Text style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", writingDirection: "rtl", textDecorationLine: "underline" }}>
                  התחל ללא חשבון
                </Text>
              </Pressable>
            )}

            </>
            )}

            {/* The bottom "back to game" link was removed. The top chevron
                already provides a back path and a second exit duplicated it. */}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Success celebration overlay */}
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(200)}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          accessibilityLabel="נרשמת בהצלחה! חוזרים למשחק"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(8,145,178,0.92)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          pointerEvents="auto"
        >
          <ConfettiExplosion />
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center" }}>
            <ExpoImage
              source={FINN_DANCING}
              style={{ width: 160, height: 160 }}
              contentFit="contain"
              accessible={false}
            />
            <Text
              style={{
                fontSize: 28,
                fontWeight: "900",
                color: "#ffffff",
                marginTop: 16,
                textAlign: "center",
                writingDirection: "rtl",
                textShadowColor: "rgba(0,0,0,0.25)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}
              accessibilityRole="header"
            >
              נרשמת בהצלחה! 🎉
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#e0f2fe",
                marginTop: 8,
                textAlign: "center",
                writingDirection: "rtl",
              }}
            >
              יאללה, חוזרים למשחק
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}
