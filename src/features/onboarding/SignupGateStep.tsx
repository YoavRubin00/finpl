// Signup gate, shown after the 3 onboarding questions (dream / goal / age).
// Goal: capture signup at peak commitment (sunk cost from answering questions)
// while keeping the path optional so D1 retention isn't sacrificed.
// Pattern: Duolingo / Headspace post-onboarding signup wall, with explicit
// "continue as guest" so users who aren't ready can keep their progress.

import React from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Platform, ScrollView } from "react-native";
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
  // Surfaced on-screen below — without this the gate failed silently (a Google
  // tap that set authError showed nothing, reading as "כלום קורה").
  const authError = useAuthStore((s) => s.authError);

  // Track which users close the gate without ever making a decision (no
  // method click, no skip). Currently invisible in the funnel — PostHog
  // shows ~25% of shown gates have no follow-up event. The cleanup effect
  // below fires `signup_gate_abandoned` only if `decisionMadeRef` is still
  // false at unmount, so we can finally measure intent vs friction.
  const decisionMadeRef = React.useRef(false);
  const mountedAtRef = React.useRef(Date.now());

  React.useEffect(() => {
    try { captureEvent("signup_gate_shown", { source: "post_onboarding_questions" }); } catch { /* non-fatal */ }
    return () => {
      if (!decisionMadeRef.current) {
        try {
          captureEvent("signup_gate_abandoned", {
            source: "post_onboarding_questions",
            time_open_ms: Date.now() - mountedAtRef.current,
          });
        } catch { /* non-fatal */ }
      }
    };
  }, []);

  const handleSkip = () => {
    decisionMadeRef.current = true;
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center", paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ alignItems: "center", width: "100%" }}>
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", marginBottom: 12 }}>
          <LinearGradient
            colors={["#ecfeff", "#f0fdfa"]}
            style={{ width: 116, height: 116, borderRadius: 58, alignItems: "center", justifyContent: "center" }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ExpoImage source={FINN_HAPPY} style={{ width: 98, height: 98 }} contentFit="contain" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#0c4a6e", writingDirection: "rtl", textAlign: "center", marginBottom: 8 }}>
            {"כל הכבוד! 🎉"}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#475569", writingDirection: "rtl", textAlign: "center", lineHeight: 24, marginBottom: 14 }}>
            {"שמרו את ההתקדמות שלכם"}
          </Text>
          {/* Value-prop bullets — explicit answer to "why register". Keeps
              the gate informative without out-shouting the buttons below. */}
          <View style={{ alignSelf: "stretch", gap: 6, paddingHorizontal: 0 }}>
            {[
              "סנכרון בין מכשירים",
              "ההתקדמות נשמרת לתמיד",
              "מטבעות, יהלומים ופיצ׳רי Pro",
            ].map((text) => (
              <View key={text} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#0ea5e9" }}>✓</Text>
                <Text allowFontScaling={false} style={{ fontSize: 13, fontWeight: "600", color: "#334155", writingDirection: "rtl", textAlign: "right", flex: 1 }}>
                  {text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={{ width: "100%", gap: 10, marginTop: 20 }}>
          {authError ? (
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#dc2626", writingDirection: "rtl", textAlign: "center" }}>
              {authError}
            </Text>
          ) : null}
          {appleAvailable && (
            <Pressable
              onPress={() => {
                useAuthStore.getState().setAuthError(null);
                decisionMadeRef.current = true;
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
              useAuthStore.getState().setAuthError(null);
              if (!googleReady || !promptGoogleSignIn) {
                useAuthStore.getState().setAuthError("הכניסה עם Google לא זמינה כרגע. נסה שוב בעוד רגע.");
                return;
              }
              decisionMadeRef.current = true;
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
              backgroundColor: "#0ea5e9",
              paddingVertical: 15,
              borderBottomWidth: 3,
              borderBottomColor: "#0284c7",
              opacity: googleReady ? 1 : 0.6,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>המשך עם Google</Text>
            <GoogleLogo size={20} />
          </Pressable>

          {/* Email signup. The parent's onEmailPress wires completeOnboarding
              with the in-progress collected profile BEFORE the push so the
              root layout's !hasCompletedOnboarding redirect doesn't bounce the
              user back to the questions (the historical bug). */}
          <Pressable
            onPress={() => {
              useAuthStore.getState().setAuthError(null);
              decisionMadeRef.current = true;
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
              backgroundColor: "#0ea5e9",
              paddingVertical: 15,
              borderBottomWidth: 3,
              borderBottomColor: "#0284c7",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff", writingDirection: "rtl" }}>הירשם עם אימייל</Text>
          </Pressable>

          {/* Guest CTA — identical shape/size to the auth buttons above
              (width, radius, padding, border, text), just in neutral gray
              (#64748b, WCAG-passing on white) so the colored signup buttons
              read as the primary path (user direction 2026-06-04). */}
          <Pressable
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="המשך כאורח"
            style={({ pressed }) => ({
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: pressed ? "#475569" : "#64748b",
              paddingVertical: 15,
              borderBottomWidth: 3,
              borderBottomColor: "#475569",
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff", writingDirection: "rtl", textAlign: "center" }}>
              {"המשך כאורח"}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
