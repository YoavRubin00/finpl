// "הוזמנת דרך חבר?" invite-code entry for the first-run sequence.
//
// Moved here from ProfilingFlow's old "profile ready" celebration screen, which
// the 2026-11-20 shortening pass removed. It now sits under the welcome chest
// (PostWalkthroughFirstChest), the one reward screen left before the first
// lesson. Behaviour is unchanged:
//
// Clipboard bridge (Yoav 14.10.26). finplay.me/invite/CODE copies the code
// before handing off to the store; that is the ONLY way an iOS install can
// carry an invite (no install-referrer on iOS). `hasStringAsync` needs no
// permission and shows no banner, so it is safe on mount; it only tells us a
// string EXISTS. The content is read in `open()`, in direct response to the
// user's tap, so any iOS paste prompt is something they just asked for.
//
// The code is only stored as pending here; the post-signup hook in
// app/_layout.tsx redeems it (and emits referral_redeem_succeeded/failed with
// source 'pending_hook').

import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { captureEvent } from "../../lib/posthog";
import { PENDING_REFERRAL_STORAGE_KEY, PENDING_REFERRAL_ATTEMPTS_STORAGE_KEY } from "../social/InviteRedemptionScreen";

const CODE_RE = /^[A-Z0-9-]{4,12}$/;

export function InviteCodeEntry(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [clipboardMayHaveCode, setClipboardMayHaveCode] = useState(false);
  // A code is already waiting (Android install-referrer or a deep link on an
  // installed app): there is nothing to offer, so the link stays hidden.
  const [alreadyPending, setAlreadyPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pending = await AsyncStorage.getItem(PENDING_REFERRAL_STORAGE_KEY);
        if (pending) {
          if (!cancelled) setAlreadyPending(true);
          return;
        }
        const has = await Clipboard.hasStringAsync();
        if (!cancelled) setClipboardMayHaveCode(has);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleOpen = () => {
    setOpen(true);
    // Pre-fill from the clipboard when it holds something code-shaped. The
    // user still taps "אישור", so nothing is attributed without their say.
    (async () => {
      try {
        const raw = (await Clipboard.getStringAsync())?.trim().toUpperCase() ?? "";
        const candidate = raw.replace(/^.*\/INVITE\//, "");
        if (CODE_RE.test(candidate)) {
          setCode(candidate);
          setPasted(true);
          try { captureEvent("referral_code_autofilled", { source: "clipboard", invite_code: candidate }); } catch { /* non-fatal */ }
        }
      } catch { /* clipboard denied, the user can still type the code */ }
    })();
  };

  const handleSave = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!CODE_RE.test(trimmed)) return;
    try {
      await AsyncStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, trimmed);
      // Fresh code → fresh retry budget for the _layout pending-redemption hook.
      try { await AsyncStorage.removeItem(PENDING_REFERRAL_ATTEMPTS_STORAGE_KEY); } catch { /* non-fatal */ }
    } catch { return; }
    try { captureEvent("referral_redeem_attempted", { source: pasted ? "profiling_clipboard" : "profiling_manual", invite_code: trimmed, deferred: true }); } catch { /* non-fatal */ }
    setSaved(true);
  };

  if (alreadyPending) return null;

  if (saved) {
    return <Text style={styles.saved}>{"✓ הקוד נשמר"}</Text>;
  }

  if (open) {
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="קוד הזמנה"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            returnKeyType="done"
            onSubmitEditing={() => void handleSave()}
            accessibilityLabel="קוד הזמנה"
          />
          <Pressable onPress={() => void handleSave()} style={styles.submit} accessibilityRole="button" accessibilityLabel="אישור קוד">
            <Text style={styles.submitText}>אישור</Text>
          </Pressable>
        </View>
        {pasted ? <Text style={styles.hint}>{"הדבקנו את הקוד שהעתקת. רק לאשר."}</Text> : null}
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleOpen}
      style={[styles.toggle, clipboardMayHaveCode && styles.togglePrimed]}
      accessibilityRole="button"
      accessibilityLabel="הוזמנת דרך חבר? להוספת קוד הזמנה"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.toggleText, clipboardMayHaveCode && styles.toggleTextPrimed]}>
        {clipboardMayHaveCode ? "הוזמנת דרך חבר? להדביק את הקוד" : "הוזמנת דרך חבר? להוסיף קוד"}
      </Text>
    </Pressable>
  );
}

// Tuned for the welcome chest's dark backdrop (#0f172a).
const styles = StyleSheet.create({
  wrap: { width: "100%", marginTop: 14 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  submit: {
    backgroundColor: "#0891b2",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  hint: { fontSize: 12, fontWeight: "700", color: "#7dd3fc", textAlign: "center", writingDirection: "rtl", marginTop: 6 },
  toggle: { marginTop: 14, paddingVertical: 6, alignSelf: "center" },
  togglePrimed: { backgroundColor: "rgba(14,165,233,0.18)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  toggleText: { color: "#94a3b8", fontSize: 13, textAlign: "center", textDecorationLine: "underline", writingDirection: "rtl" },
  toggleTextPrimed: { color: "#7dd3fc", fontWeight: "800", textDecorationLine: "none" },
  saved: { color: "#4ade80", textAlign: "center", fontSize: 14, marginTop: 14, writingDirection: "rtl" },
});
