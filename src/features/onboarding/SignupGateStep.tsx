// Signup gate, shown after the onboarding questions (dream / goal / age).
// It is an OFFER, not a wall: the user is already a guest (entered at the
// welcome CTA) and can reach the first lesson without an account.
//
// Activation pass 2026-11 (PostHog, 45 days, 119 people saw this screen):
//   - everyone who tapped the guest exit finished onboarding (51 of 51);
//   - 15 left without tapping anything, and 8 more tapped Google, never got
//     signed in, and left. Google sign-in ended in "cancelled" for 35 of the 54
//     people who tried it, and the screen showed nothing when that happened;
//   - after returning from the Google/Apple sheet the screen sat frozen for the
//     seconds the server verify takes, with every button still live.
// So: one clear primary sign-in, a guest exit that reads as a real button, a
// visible "connecting" state, and a plain next step when a sign-in does not
// complete.

import React from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { ChevronRight } from "lucide-react-native";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { GoogleLogo } from "../../components/ui/GoogleLogo";
import { AppleLogo } from "../../components/ui/AppleLogo";
import { useAuthStore } from "../auth/useAuthStore";
import { useAppleAuth } from "../auth/useAppleAuth";
import { useGoogleAuthStore } from "../auth/useGoogleAuthStore";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic, successHaptic } from "../../utils/haptics";

const SOURCE = "post_onboarding_questions";

export type SignupGateMethod = "apple" | "google" | "email" | "guest";
export type SignupGateOutcome = SignupGateMethod | "account";

/** Gate bookkeeping that must survive a ProfilingFlow re-mount: the Google and
 *  email exits leave through `router.replace("/(auth)/onboarding")`, which
 *  mounts a fresh ProfilingFlow at the celebration step. Module scope is the
 *  only place both instances can see. */
const gateSession: { lastMethod: SignupGateMethod | null; completionReported: boolean; shownAt: number | null } = {
  lastMethod: null,
  completionReported: false,
  shownAt: null,
};

/** The method tapped on the most recent gate, if any (null after a relaunch). */
export function getSignupGateLastMethod(): SignupGateMethod | null {
  return gateSession.lastMethod;
}

/**
 * Report that the user got past the gate — once per gate pass, on EVERY exit.
 * Fires the funnel step (`onboarding_step_completed` / 'signup-gate') plus
 * `signup_gate_completed` with the exit actually taken. Before this the step
 * event fired only for the guest and Apple exits, so Google and email signups
 * were counted as drop-offs.
 */
export function reportSignupGateCompleted(outcome: SignupGateOutcome, via: "in_place" | "resume"): void {
  if (gateSession.completionReported) return;
  gateSession.completionReported = true;
  try {
    captureEvent("onboarding_step_completed", { step_name: "signup-gate", next_step: "celebration", mode: "new", direction: "forward" });
    captureEvent("signup_gate_completed", {
      source: SOURCE,
      outcome,
      via,
      ...(gateSession.shownAt !== null ? { time_open_ms: Date.now() - gateSession.shownAt } : {}),
    });
  } catch { /* non-fatal */ }
}

// If a sign-in neither finishes nor fails within this window, give the buttons
// back so the user is never locked on a "connecting" state.
const BUSY_WATCHDOG_MS = 30000;
// A successful OAuth normally re-mounts the flow (router.replace) right after
// the store flips to signed-in. Wait a beat before advancing in place so the
// two don't both run; if the re-mount happens, this timer is cancelled.
const ADVANCE_AFTER_SIGN_IN_MS = 600;

interface Props {
  /** The user now has a real account. `method` is what they tapped here. */
  onSignupSuccess: (method: SignupGateOutcome) => void;
  /** The user chose to continue as a guest. */
  onSkip: () => void;
  /** Called before any signup path navigates away — parent should persist
   *  the in-progress `collected` profile so OAuth races / register-screen
   *  redirects don't lose dream/goal/age. Wired in ProfilingFlow. */
  saveCollected?: () => void;
  /** Override of the email-signup tap. Parent uses this to seed the profile
   *  BEFORE router.push so the post-register re-mount resumes at celebration. */
  onEmailPress?: () => void;
  /** If provided, renders a back chevron in the header (returns to age). */
  onBack?: () => void;
}

export function SignupGateStep({ onSignupSuccess, onSkip, saveCollected, onEmailPress, onBack }: Props) {
  const router = useRouter();
  const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();
  const promptGoogleSignIn = useGoogleAuthStore((s) => s.promptGoogleSignIn);
  const googleReady = useGoogleAuthStore((s) => s.isReady);
  const googleSigningIn = useGoogleAuthStore((s) => s.isSigningIn);
  const googleOutcome = useGoogleAuthStore((s) => s.lastOutcome);
  const authError = useAuthStore((s) => s.authError);
  const hasAccount = useAuthStore((s) => s.isAuthenticated && !s.isGuest);
  const isFocused = useIsFocused();

  // Which OAuth sheet is in flight. While set, every button is disabled and the
  // tapped one shows a spinner.
  const [busy, setBusy] = React.useState<"apple" | "google" | null>(null);
  // A sign-in came back without an account and without an error message
  // (the user closed the sheet, or Android reported the browser as dismissed).
  const [notCompleted, setNotCompleted] = React.useState(false);
  // Google resolves in two stages: the prompt returns, then (on success) the
  // server verify runs. Only react to the store once the prompt has returned.
  const googlePromptReturnedRef = React.useRef(false);

  // Track which users close the gate without ever making a decision (no
  // method click, no skip). The cleanup below fires `signup_gate_abandoned`
  // only if `decisionMadeRef` is still false at unmount.
  const decisionMadeRef = React.useRef(false);
  const mountedAtRef = React.useRef(Date.now());
  const advancedRef = React.useRef(false);

  React.useEffect(() => {
    gateSession.lastMethod = null;
    gateSession.completionReported = false;
    gateSession.shownAt = Date.now();
    try { captureEvent("signup_gate_shown", { source: SOURCE }); } catch { /* non-fatal */ }
    return () => {
      if (!decisionMadeRef.current) {
        try {
          captureEvent("signup_gate_abandoned", {
            source: SOURCE,
            time_open_ms: Date.now() - mountedAtRef.current,
          });
        } catch { /* non-fatal */ }
      }
    };
  }, []);

  // The store says the user now has a real account → move on. Covers every
  // sign-in path without depending on the flow being re-mounted (it is on
  // Android, where the OAuth deep link passes through /oauthredirect; a
  // same-route replace on iOS is not guaranteed to re-mount).
  // Only while this screen is the focused one: on the paths that DO re-mount,
  // this instance stays alive underneath the new one (and underneath the
  // register screen), and must not run its own celebration in the background.
  React.useEffect(() => {
    if (!hasAccount || !isFocused || advancedRef.current) return;
    const timer = setTimeout(() => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      decisionMadeRef.current = true;
      try { successHaptic(); } catch { /* non-fatal */ }
      onSignupSuccess(gateSession.lastMethod && gateSession.lastMethod !== "guest" ? gateSession.lastMethod : "account");
    }, ADVANCE_AFTER_SIGN_IN_MS);
    return () => clearTimeout(timer);
    // onSignupSuccess is re-created by the parent on every render; depending
    // on it would restart the timer for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccount, isFocused]);

  // Google attempt finished without an account → give the buttons back.
  React.useEffect(() => {
    if (busy !== "google" || googleSigningIn || !googlePromptReturnedRef.current) return;
    if (googleOutcome === "success") return; // the hasAccount effect advances
    setBusy(null);
    if (googleOutcome === "cancelled") setNotCompleted(true);
  }, [busy, googleSigningIn, googleOutcome]);

  React.useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setBusy(null), BUSY_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  const startAttempt = (method: SignupGateMethod) => {
    useAuthStore.getState().setAuthError(null);
    setNotCompleted(false);
    decisionMadeRef.current = true;
    gateSession.lastMethod = method;
    try { tapHaptic(); } catch { /* non-fatal */ }
    try { captureEvent("signup_gate_method_clicked", { method, source: SOURCE }); } catch { /* non-fatal */ }
  };

  const handleApple = async () => {
    if (busy) return;
    startAttempt("apple");
    // Persist the in-progress dream/goal/age BEFORE the OAuth prompt so the
    // post-sign-in route change can't strand the collected fields.
    saveCollected?.();
    setBusy("apple");
    try {
      await promptAppleSignIn();
    } catch { /* promptAppleSignIn reports its own failures */ }
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated && !auth.isGuest) return; // hasAccount effect advances
    setBusy(null);
    // No account and no error banner → the user closed the Apple sheet.
    if (!auth.authError) setNotCompleted(true);
  };

  const handleGoogle = async () => {
    if (busy) return;
    if (!googleReady || !promptGoogleSignIn) {
      setNotCompleted(false);
      useAuthStore.getState().setAuthError("הכניסה עם Google לא זמינה כרגע. אפשר לנסות שוב בעוד רגע.");
      return;
    }
    startAttempt("google");
    saveCollected?.();
    googlePromptReturnedRef.current = false;
    setBusy("google");
    try {
      await promptGoogleSignIn();
    } catch { /* promptGoogleSignIn reports its own failures */ }
    googlePromptReturnedRef.current = true;
    // Cancelled / failed attempts are already resolved in the store by now;
    // a successful prompt is still verifying (isSigningIn stays true) and the
    // effect above picks it up when it settles.
    const g = useGoogleAuthStore.getState();
    if (!g.isSigningIn && g.lastOutcome !== "success") {
      setBusy(null);
      if (g.lastOutcome === "cancelled") setNotCompleted(true);
    }
  };

  const handleEmail = () => {
    if (busy) return;
    startAttempt("email");
    if (onEmailPress) {
      onEmailPress();
    } else {
      router.push(`/(auth)/register?returnTo=${encodeURIComponent("/")}` as never);
    }
  };

  const handleSkip = () => {
    if (busy || advancedRef.current) return;
    advancedRef.current = true;
    decisionMadeRef.current = true;
    gateSession.lastMethod = "guest";
    useAuthStore.getState().setAuthError(null);
    try { tapHaptic(); } catch { /* non-fatal */ }
    try { captureEvent("signup_gate_skipped", { source: SOURCE }); } catch { /* non-fatal */ }
    onSkip();
  };

  const disabled = busy !== null;
  const message = authError ?? (notCompleted ? "ההתחברות לא הושלמה. אפשר לנסות שוב או להמשיך בלי חשבון." : null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top", "bottom"]}>
      {onBack && (
        <Pressable
          onPress={disabled ? undefined : onBack}
          accessibilityRole="button"
          accessibilityLabel="חזרה לשאלת הגיל"
          hitSlop={12}
          style={{ position: "absolute", top: 12, right: 16, zIndex: 10, padding: 8 }}
        >
          <ChevronRight size={26} color="#475569" />
        </Pressable>
      )}
      <ScrollView
        style={{ flex: 1 }}
        // Mascot + one line of copy sit in the upper part; the choices are
        // pinned to the bottom of the screen, inside thumb reach. On short
        // screens the content scrolls instead of clipping.
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingTop: 56, paddingBottom: 20, gap: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={["#ecfeff", "#f0fdfa"]}
              style={{ width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center" }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ExpoImage source={FINN_HAPPY} style={{ width: 112, height: 112 }} contentFit="contain" accessible={false} />
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(120)} style={{ alignItems: "center", gap: 8 }}>
            <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "900", color: "#0c4a6e", writingDirection: "rtl", textAlign: "center" }}>
              {"שומרים את ההתקדמות שלך?"}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#475569", writingDirection: "rtl", textAlign: "center", lineHeight: 22 }}>
              {"חשבון חינמי בלחיצה אחת. אפשר גם אחר כך."}
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={{ width: "100%", gap: 10 }}>
          {message ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ fontSize: 13, fontWeight: "700", color: authError ? "#dc2626" : "#475569", writingDirection: "rtl", textAlign: "center", lineHeight: 19 }}
            >
              {message}
            </Text>
          ) : null}

          {appleAvailable && (
            <Pressable
              onPress={handleApple}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="המשך עם Apple"
              accessibilityState={{ disabled, busy: busy === "apple" }}
              style={{
                width: "100%",
                minHeight: 54,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 14,
                backgroundColor: "#000000",
                paddingVertical: 15,
                borderBottomWidth: 3,
                borderBottomColor: "#1f2937",
                opacity: disabled && busy !== "apple" ? 0.5 : 1,
              }}
            >
              {busy === "apple" ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff", writingDirection: "rtl" }}>{"מתחברים…"}</Text>
                </>
              ) : (
                <>
                  <AppleLogo size={18} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>המשך עם Apple</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            onPress={handleGoogle}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="המשך עם Google"
            accessibilityState={{ disabled, busy: busy === "google" }}
            style={{
              width: "100%",
              minHeight: 54,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 14,
              backgroundColor: "#0ea5e9",
              paddingVertical: 15,
              borderBottomWidth: 3,
              borderBottomColor: "#0284c7",
              opacity: (disabled && busy !== "google") || !googleReady ? 0.5 : 1,
            }}
          >
            {busy === "google" ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff", writingDirection: "rtl" }}>{"מתחברים…"}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>המשך עם Google</Text>
                <GoogleLogo size={20} />
              </>
            )}
          </Pressable>

          {/* Guest exit. A full-size outlined button (not an underlined text
              link): PostHog shows nobody who takes this exit is lost, so it has
              to read as a real, safe choice. Same width / height / radius as
              the sign-in buttons, neutral colors so it stays secondary. */}
          <Pressable
            onPress={handleSkip}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="ממשיכים בלי חשבון"
            accessibilityHint="ההתקדמות נשמרת במכשיר הזה, ואפשר להירשם בכל רגע"
            accessibilityState={{ disabled }}
            style={{
              width: "100%",
              minHeight: 54,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#ffffff",
              borderWidth: 2,
              borderColor: "#cbd5e1",
              borderBottomWidth: 4,
              paddingVertical: 14,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a", writingDirection: "rtl" }}>{"ממשיכים בלי חשבון"}</Text>
          </Pressable>

          {/* Email signup, kept as a quiet link: three stacked buttons was one
              decision too many, and email is the slowest path (a 4-field form).
              The parent's onEmailPress seeds the collected profile BEFORE the
              push so the post-register re-mount resumes at celebration. */}
          <Pressable
            onPress={handleEmail}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="הרשמה עם אימייל"
            accessibilityState={{ disabled }}
            hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}
            style={{ alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 12, opacity: disabled ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0284c7", writingDirection: "rtl", textAlign: "center" }}>{"הרשמה עם אימייל"}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
