import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGoogleAuthStore } from "../src/features/auth/useGoogleAuthStore";
import { captureEvent } from "../src/lib/posthog";

// How long to wait once nothing is signing in any more. A successful sign-in
// navigates away by itself (useGoogleAuth → router.replace) before this fires.
const IDLE_EXIT_MS = 1500;
// Upper bound while a sign-in IS in flight (server verify has a 12s timeout,
// then profile prefetch). Past this the spinner is hiding a stuck request.
const BUSY_EXIT_MS = 30000;

/**
 * Landing route for the Google OAuth deep link (`…:/oauthredirect`).
 *
 * On Android the redirect is delivered as a deep link, so the router lands
 * here while useGoogleAuth finishes the sign-in and then replaces this route.
 * This used to be a bare spinner with no exit, and the root layout's redirect
 * guard deliberately leaves this path alone before onboarding is complete. So
 * whenever the sign-in did NOT finish — the browser result came back as
 * cancel/dismiss, the server verify failed, or Android killed the app while the
 * browser was open and the link cold-started it — the user was left on an
 * endless spinner in the middle of onboarding.
 *
 * Now the screen leaves by itself: back to where the user came from (the signup
 * gate, which shows what happened and still offers "continue without an
 * account"), or to the root when there is nothing to go back to — the layout
 * guard then routes to the right place.
 */
export default function OAuthRedirect() {
  const router = useRouter();
  const isSigningIn = useGoogleAuthStore((s) => s.isSigningIn);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        captureEvent("oauth_redirect_recovered", { reason: isSigningIn ? "timeout" : "no_sign_in_in_flight" });
      } catch { /* non-fatal */ }
      try {
        if (router.canGoBack()) router.back();
        else router.replace("/" as never);
      } catch { /* non-fatal */ }
    }, isSigningIn ? BUSY_EXIT_MS : IDLE_EXIT_MS);
    return () => clearTimeout(timer);
  }, [isSigningIn, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" }}>
      <View style={{ alignItems: "center", gap: 14 }}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#475569", writingDirection: "rtl", textAlign: "center" }}>
          {"מתחברים…"}
        </Text>
      </View>
    </SafeAreaView>
  );
}
