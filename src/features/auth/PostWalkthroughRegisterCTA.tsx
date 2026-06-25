// Modal shown to Guest users AFTER the Pro teaser, once the mod-0-1 chest has
// opened (chest → Pro → register, Yoav 2026-06-25). The flag is armed when the
// Pro teaser is dismissed (PostWalkthroughProTeaser); the gate
// in app/_layout.tsx renders this once the user lands on /(tabs). Fires
// register_cta_{shown,accepted,dismissed} with source: 'post_walkthrough'
// so the PostHog funnel can be sliced separately from the mid-lesson CTA.

import React, { useEffect } from "react";
import { Modal, Pressable, Text } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter, usePathname } from "expo-router";
import { useAuthStore } from "./useAuthStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic } from "../../utils/haptics";

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

function PostWalkthroughRegisterCTA(): React.JSX.Element {
  const router = useRouter();
  const clearFlag = useTutorialStore((s) => s.setPendingPostWalkthroughCTA);
  // Pro teaser now fires BEFORE this register CTA (chest → Pro → register, Yoav
  // 2026-06-25), so this CTA no longer arms it — see PostWalkthroughProTeaser.

  useEffect(() => {
    try { captureEvent("register_cta_shown", { source: "post_walkthrough" }); } catch { /* non-fatal */ }
  }, []);

  const dismissAsGuest = (trigger: "backdrop" | "skip_button" | "system_back") => {
    try { captureEvent("register_cta_dismissed", { source: "post_walkthrough", trigger }); } catch { /* non-fatal */ }
    clearFlag(false);
  };

  const acceptRegister = () => {
    tapHaptic();
    try { captureEvent("register_cta_accepted", { source: "post_walkthrough" }); } catch { /* non-fatal */ }
    clearFlag(false);
    router.replace(`/(auth)/register?returnTo=${encodeURIComponent("/(tabs)")}` as never);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismissAsGuest("system_back")}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
        onPress={() => dismissAsGuest("backdrop")}
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
            כל הכבוד! סיימת את הסיור 🚢
          </Text>
          <Text style={{ ...RTL_STYLE, fontSize: 15, fontWeight: "600", color: "#334155", lineHeight: 24, textAlign: "center", marginBottom: 20 }}>
            הירשמו כדי לשמור את ההתקדמות ולחזור אליה בכל מכשיר
          </Text>
          <Pressable
            onPress={acceptRegister}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0284c7", shadowColor: "#0ea5e9", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}
            accessibilityRole="button"
            accessibilityLabel="הירשמו עכשיו"
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }}>הירשמו עכשיו</Text>
          </Pressable>
          <Pressable
            onPress={() => { tapHaptic(); dismissAsGuest("skip_button"); }}
            style={{ marginTop: 12, paddingVertical: 8 }}
            accessibilityRole="button"
            accessibilityLabel="המשך כאורח"
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>המשך כאורח</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Public wrapper. Mounted globally in app/_layout.tsx; the gate guarantees
// the modal renders only when the flag is set AND the user is a Guest AND
// they have landed back on the learn map (so we never overlap with the
// /pricing screen or any other surface).
export function PostWalkthroughRegisterCTAGate(): React.JSX.Element | null {
  const pending = useTutorialStore((s) => s.pendingPostWalkthroughCTA);
  const firstChestPending = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  const isGuest = useAuthStore((s) => s.isGuest);
  const pathname = usePathname();

  // Hold the register CTA until the first-chest onboarding moment is dismissed.
  if (!pending || !isGuest || firstChestPending) return null;
  // expo-router exposes the rewritten path; /(tabs) screens surface as `/`
  // or as the underlying tab path (`/index`, `/learn`, …). We accept the
  // tab root + any tab subpath so the modal can fire on the user's actual
  // landing screen regardless of which tab is the default.
  const onLearnMap = pathname === "/" || pathname === "" || (pathname?.startsWith("/") && !pathname.startsWith("/pricing") && !pathname.startsWith("/(auth)") && !pathname.startsWith("/lesson") && !pathname.startsWith("/bridge"));
  if (!onLearnMap) return null;

  return <PostWalkthroughRegisterCTA />;
}

// Also expose the inner component for dev tooling that wants to skip the
// gate (e.g. Storybook, a debug menu).
export { PostWalkthroughRegisterCTA };
