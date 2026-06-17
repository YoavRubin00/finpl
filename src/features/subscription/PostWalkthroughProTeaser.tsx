// Soft, dismissible Pro teaser shown to NON-Pro users right after they finish
// the in-app walkthrough. Restores the `paywall_viewed{post_walkthrough}`
// monetization moment (volume) that was removed in commit 3a57bd3 — but as a
// friendly 7-day-free-trial card the user can dismiss, NOT a full-screen
// blocker (the early hard paywall cratered first-module completion). The hard
// paywall still fires later at post_mod_0_1b / post_mod_0_4.
//
// Flag is armed in AppWalkthroughOverlay (registered non-Pro) or after the
// guest register CTA resolves (PostWalkthroughRegisterCTA). The gate below
// renders this once the user lands on /(tabs), never overlapping the register
// CTA. Mirrors PostWalkthroughRegisterCTAGate.

import React, { useEffect } from "react";
import { Modal, Pressable, Text } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter, usePathname } from "expo-router";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useIsPro } from "./useSubscription";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic } from "../../utils/haptics";

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

function PostWalkthroughProTeaser(): React.JSX.Element {
  const router = useRouter();
  const clearFlag = useTutorialStore((s) => s.setPendingPostWalkthroughProTeaser);

  useEffect(() => {
    // Restores the post_walkthrough paywall-view metric (124/week → 0 regression).
    try {
      captureEvent("paywall_viewed", {
        paywall: "post_walkthrough",
        source: "post_walkthrough",
        via: "soft_teaser",
      });
    } catch { /* non-fatal */ }
  }, []);

  const dismiss = (trigger: "backdrop" | "skip_button" | "system_back") => {
    try { captureEvent("paywall_dismissed", { paywall: "post_walkthrough", source: "post_walkthrough", trigger }); } catch { /* non-fatal */ }
    clearFlag(false);
  };

  const startTrial = () => {
    tapHaptic();
    try { captureEvent("paywall_cta_clicked", { paywall: "post_walkthrough", source: "post_walkthrough", via: "soft_teaser" }); } catch { /* non-fatal */ }
    clearFlag(false);
    router.push(`/pricing?source=post_walkthrough&returnTo=${encodeURIComponent("/(tabs)")}` as never);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismiss("system_back")}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
        onPress={() => dismiss("backdrop")}
        accessibilityRole="button"
        accessibilityLabel="סגור"
      >
        <Pressable
          style={{ backgroundColor: "#e0f2fe", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
          onPress={() => { /* swallow taps on card */ }}
          accessible={false}
        >
          <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 88, height: 88, marginBottom: 12 }} contentFit="contain" />
          <Text style={{ ...RTL_STYLE, fontSize: 18, fontWeight: "900", color: "#0c4a6e", marginBottom: 10, textAlign: "center" }}>
            שבוע ראשון עלינו 🎁
          </Text>
          <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
            נסו את כל היכולות של FinPlay 7 ימים בחינם. בלי התחייבות, אפשר לבטל מתי שרוצים.
          </Text>
          <Pressable
            onPress={startTrial}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0284c7", shadowColor: "#0ea5e9", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
            accessibilityRole="button"
            accessibilityLabel="התחילו 7 ימים חינם"
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }}>התחילו 7 ימים חינם</Text>
          </Pressable>
          <Pressable
            onPress={() => { tapHaptic(); dismiss("skip_button"); }}
            style={{ marginTop: 12, paddingVertical: 8 }}
            accessibilityRole="button"
            accessibilityLabel="אולי אחר כך"
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>אולי אחר כך</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Public wrapper. Mounted globally in app/_layout.tsx beside the register gate.
// Renders only when: the flag is set AND the user is NOT Pro AND the register
// CTA is NOT pending (guards against stacking on top of it) AND the user has
// landed back on the learn map (never over /pricing, /lesson, auth, bridge).
export function PostWalkthroughProTeaserGate(): React.JSX.Element | null {
  const pending = useTutorialStore((s) => s.pendingPostWalkthroughProTeaser);
  const registerPending = useTutorialStore((s) => s.pendingPostWalkthroughCTA);
  const isPro = useIsPro();
  const pathname = usePathname();

  if (!pending || isPro || registerPending) return null;
  const onLearnMap = pathname === "/" || pathname === "" || (pathname?.startsWith("/") && !pathname.startsWith("/pricing") && !pathname.startsWith("/(auth)") && !pathname.startsWith("/lesson") && !pathname.startsWith("/bridge"));
  if (!onLearnMap) return null;

  return <PostWalkthroughProTeaser />;
}

export { PostWalkthroughProTeaser };
