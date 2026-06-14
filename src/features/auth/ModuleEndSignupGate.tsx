// Module-end signup gate for Guest users — shown AFTER the chest sequence at
// the end of every module from mod-0-2 onward, once per module (Yoav
// 2026-06-15: "גייט הרשמה כמו שמופיע בסוף ההדרכה 0 בסוף כל מודולה החל ממודולה
// 0-2"). Mirrors PostWalkthroughRegisterCTA's look; analytics source:
// 'module_end' so the funnel slices it separately from the post-walkthrough +
// mid-lesson CTAs. The per-module once-guard lives in useTutorialStore
// (moduleEndGateShown); this component is purely the modal.

import React, { useEffect } from "react";
import { Modal, Pressable, Text } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic } from "../../utils/haptics";

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface Props {
  visible: boolean;
  moduleId: string;
  onClose: () => void;
}

export function ModuleEndSignupGate({ visible, moduleId, onClose }: Props): React.JSX.Element | null {
  const router = useRouter();

  useEffect(() => {
    if (!visible) return;
    try { captureEvent("register_cta_shown", { source: "module_end", module_id: moduleId }); } catch { /* non-fatal */ }
  }, [visible, moduleId]);

  if (!visible) return null;

  const dismissAsGuest = (trigger: "backdrop" | "skip_button" | "system_back") => {
    try { captureEvent("register_cta_continue_guest", { source: "module_end", module_id: moduleId, trigger }); } catch { /* non-fatal */ }
    onClose();
  };

  const acceptRegister = () => {
    tapHaptic();
    try { captureEvent("register_cta_accepted", { source: "module_end", module_id: moduleId }); } catch { /* non-fatal */ }
    onClose();
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
            עוד מודולה בכיס 🎉
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
