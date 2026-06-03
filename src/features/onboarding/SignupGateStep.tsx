// Signup gate, shown after the 3 onboarding questions (dream / goal / age).
// Goal: capture signup at peak commitment (sunk cost from answering questions)
// while keeping the path optional so D1 retention isn't sacrificed.
// Pattern: Duolingo / Headspace post-onboarding signup wall, with explicit
// "continue as guest" so users who aren't ready can keep their progress.

import React from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { GoogleLogo } from "../../components/ui/GoogleLogo";
import { AppleLogo } from "../../components/ui/AppleLogo";
import { useAuthStore } from "../auth/useAuthStore";
import { useAppleAuth } from "../auth/useAppleAuth";
import { useGoogleAuthStore } from "../auth/useGoogleAuthStore";
import { captureEvent } from "../../lib/posthog";

interface Props {
  onSignupSuccess: () => void;
  onSkip: () => void;
  /** Called before any signup path navigates away — parent should persist
   *  the in-progress `collected` profile so OAuth races / register-screen
   *  redirects don't lose dream/goal/age. Wired in ProfilingFlow. */
  saveCollected?: () => void;
  /** Override of the email-signup tap. Parent uses this to call
   *  completeOnboarding(collected) BEFORE router.push so the root layout's
   *  !hasCompletedOnboarding redirect doesn't bounce the user back to dream. */
  onEmailPress?: () => void;
  /** If provided, renders a back chevron in the header (returns to age). */
  onBack?: () => void;
}

export function SignupGateStep({ onSignupSuccess, onSkip, saveCollected, onEmailPress, onBack }: Props) {
  const router = useRouter();
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();
  const promptGoogleSignIn = useGoogleAuthStore((s) => s.promptGoogleSignIn);
  const googleReady = useGoogleAuthStore((s) => s.isReady);

  React.useEffect(() => {
    try { captureEvent("signup_gate_shown", { source: "post_onboarding_questions" }); } catch { /* non-fatal */ }
  }, []);

  const handleSkip = () => {
    try { captureEvent("signup_gate_skipped", { source: "post_onboarding_questions" }); } catch { /* non-fatal */ }
    onSkip();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top", "bottom"]}>
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזור לשאלת הגיל"
          hitSlop={12}
          style={{ position: "absolute", top: 12, right: 16, zIndex: 10, padding: 8 }}
        >
          <ChevronRight size={26} color="#475569" />
        </Pressable>
      )}
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center" }}>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", marginBottom: 24 }}>
          <LinearGradient
            colors={["#ecfeff", "#f0fdfa"]}
            style={{ width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center" }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ExpoImage source={FINN_HAPPY} style={{ width: 120, height: 120 }} contentFit="contain" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={{ alignItems: "center", marginBottom: 32 }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#0c4a6e", writingDirection: "rtl", textAlign: "center", marginBottom: 10 }}>
            {"כל הכבוד!"}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#475569", writingDirection: "rtl", textAlign: "center", lineHeight: 24 }}>
            {"בנינו לך פרופיל מותאם.\nרוצה לשמור אותו?"}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={{ width: "100%", gap: 10 }}>
          {appleAvailable && (
            <Pressable
              onPress={() => {
                try { captureEvent("signup_gate_method_clicked", { method: "apple", source: "post_onboarding_questions" }); } catch { /* non-fatal */ }
                // Persist the in-progress dream/goal/age BEFORE the OAuth
                // prompt so that useAppleAuth's router.replace (which fires
                // for existing users before onSignupSuccess) can't strand
                // the collected fields. Safe to call repeatedly.
                saveCollected?.();
                promptAppleSignIn().then(onSignupSuccess);
              }}
              accessibilityRole="button"
              accessibilityLabel="המשך עם Apple"
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 14,
                backgroundColor: "#000000",
                paddingVertical: 15,
                borderBottomWidth: 3,
                borderBottomColor: "#1f2937",
              }}
            >
              <AppleLogo size={18} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>המשך עם Apple</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              if (!googleReady || !promptGoogleSignIn) {
                useAuthStore.getState().setAuthError("הכניסה עם Google לא זמינה כרגע. נסה שוב בעוד רגע.");
                return;
              }
              try { captureEvent("signup_gate_method_clicked", { method: "google", source: "post_onboarding_questions" }); } catch { /* non-fatal */ }
              // See Apple branch — persist before prompt so Google's redirect
              // race can't drop dream/goal/age.
              saveCollected?.();
              promptGoogleSignIn();
            }}
            accessibilityRole="button"
            accessibilityLabel="המשך עם Google"
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 14,
              backgroundColor: "#ffffff",
              paddingVertical: 15,
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderBottomWidth: 3,
              borderBottomColor: "#cbd5e1",
              opacity: googleReady ? 1 : 0.6,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>המשך עם Google</Text>
            <GoogleLogo size={20} />
          </Pressable>

          {/* Email signup. The parent's onEmailPress wires completeOnboarding
              with the in-progress collected profile BEFORE the push so the
              root layout's !hasCompletedOnboarding redirect doesn't bounce the
              user back to the questions (the historical bug). */}
          <Pressable
            onPress={() => {
              try { captureEvent("signup_gate_method_clicked", { method: "email", source: "post_onboarding_questions" }); } catch { /* non-fatal */ }
              if (onEmailPress) {
                onEmailPress();
              } else {
                router.push(`/(auth)/register?returnTo=${encodeURIComponent("/")}` as never);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="הירשם עם אימייל"
            style={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#ffffff",
              paddingVertical: 15,
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderBottomWidth: 3,
              borderBottomColor: "#cbd5e1",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b", writingDirection: "rtl" }}>הירשם עם אימייל</Text>
          </Pressable>

          {/* Skip — secondary ghost button. Was a text-only link with muted
              slate-500 that read as disabled (user report 2026-06-03: "פחות
              דהוי"). Now a bordered pill with slate-700 weight-700 text so
              guest-mode is clearly an option without out-shouting the
              primary signup CTA above. */}
          <Pressable
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="המשך כאורח"
            style={({ pressed }) => ({
              width: "100%",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 18,
              marginTop: 8,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: "#cbd5e1",
              backgroundColor: pressed ? "#f1f5f9" : "#f8fafc",
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#334155", writingDirection: "rtl" }}>
              {"המשך כאורח"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
