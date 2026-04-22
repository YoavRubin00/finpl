import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useAuthStore } from "./useAuthStore";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { tapHaptic } from "../../utils/haptics";

const NUDGE_DATE_KEY = "guest_register_nudge_date";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Shown once per day to guest users, prompting registration so their progress
 * is saved across devices. Mirrors the DailyBridgeNudgeModal pattern.
 */
export function GuestRegisterDailyNudge() {
  const router = useRouter();
  const isGuest = useAuthStore((s) => s.isGuest);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isGuest) return;
    let cancelled = false;
    AsyncStorage.getItem(NUDGE_DATE_KEY).then((val) => {
      if (cancelled) return;
      if (val !== todayISO()) {
        // Slight delay so the user lands on a screen before the prompt fires.
        setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 2500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest]);

  const markSeen = () => {
    AsyncStorage.setItem(NUDGE_DATE_KEY, todayISO()).catch(() => { /* fire-and-forget */ });
  };

  const handleRegister = () => {
    tapHaptic();
    markSeen();
    setVisible(false);
    router.push("/(auth)/register" as never);
  };

  const handleDismiss = () => {
    tapHaptic();
    markSeen();
    setVisible(false);
  };

  if (!isAuthenticated || !isGuest) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.overlay}>
        <Animated.View entering={FadeInUp.duration(360).springify().damping(16)} style={styles.card}>
          <ExpoImage source={FINN_HAPPY} style={styles.finn} contentFit="contain" accessible={false} />

          <Text style={styles.title}>שמור על ההתקדמות שלך!</Text>
          <Text style={styles.subtitle}>
            הירשם חינם תוך 30 שניות, וההתקדמות שלך תהיה מסונכרנת בכל מכשיר
          </Text>

          <Pressable
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.cta,
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="הירשם עכשיו"
          >
            <Text style={styles.ctaText}>הירשם עכשיו ✨</Text>
          </Pressable>

          <Pressable
            onPress={handleDismiss}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="אחר כך"
            hitSlop={10}
          >
            <Text style={styles.dismissText}>אחר כך</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0f172a",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(59,130,246,0.45)",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 16,
  },
  finn: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#facc15",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 22,
    marginBottom: 22,
  },
  cta: {
    width: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1d4ed8",
    marginBottom: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "center",
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "700",
    writingDirection: "rtl",
    textAlign: "center",
  },
});