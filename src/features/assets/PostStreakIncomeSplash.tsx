// PRD 38, US-005: PostStreakIncomeSplash
// Shows once per day on first app open, displays daily income from real assets.

import { useEffect, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import { Modal, Text, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRealAssetsStore } from "./useRealAssetsStore";
import { useAuthStore } from "../auth/useAuthStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { getLevelFromXP } from "../../utils/progression";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useRouter } from "expo-router";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";

const SHOWN_KEY = "post-streak-income-shown-date";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PostStreakIncomeSplash() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState(0);
  const [hasAssetsAtShow, setHasAssetsAtShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAndShow() {
      try {
        const lastShown = await AsyncStorage.getItem(SHOWN_KEY);
        const today = todayISO();
        if (lastShown === today) return;

        // Don't show during onboarding
        const onboardingDone = useAuthStore.getState().hasCompletedOnboarding;
        if (!onboardingDone) return;

        // Wait for streak reveal animation to finish
        await new Promise((r) => setTimeout(r, 3500));
        if (cancelled) return;

        await AsyncStorage.setItem(SHOWN_KEY, today);

        // Read fresh state at show time (avoid stale closure)
        const store = useRealAssetsStore.getState();
        const currentPending = Math.floor(store.pendingIncome());
        const currentHasAssets = Object.keys(store.ownedAssets).length > 0;

        // Don't show "earn while sleeping" promo until level 2+
        const userLevel = getLevelFromXP(useEconomyStore.getState().xp);
        if (!currentHasAssets && userLevel < 2) return;

        setHasAssetsAtShow(currentHasAssets);

        // Auto-collect if there is pending income
        if (currentPending > 0) {
          setCollectedAmount(currentPending);
          store.collectDailyIncome();
        }

        setVisible(true);
      } catch {
        // ignore storage errors
      }
    }

    checkAndShow();
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = () => setVisible(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="סגור" />

        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          {/* Finn Lottie */}
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 160, height: 160, marginBottom: 8 }} contentFit="contain" />

          {hasAssetsAtShow && collectedAmount > 0 ? (
            <>
              <Text style={styles.title}>הנכסים שלך עבדו בשבילך! 🌙</Text>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <GoldCoinIcon size={28} />
                <Text style={styles.amount}>+{collectedAmount}</Text>
              </View>
              <Text style={styles.subtitle}>
                ההון שלך גדל בזמן שישנת, המטבעות כבר בחשבון!
              </Text>
            </>
          ) : hasAssetsAtShow ? (
            <>
              <Text style={styles.title}>הנכסים שלך עובדים! 💪</Text>
              <Text style={styles.subtitle}>
                הכנסה הבאה תהיה מוכנה בעוד מספר שעות 🌙
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>להרוויח גם בשינה!</Text>
              <Text style={styles.subtitle}>
                קנה נכס ראשון → הרוויח מטבעות כל יום גם בזמן שישנים
              </Text>
              <AnimatedPressable
                onPress={() => {
                  handleDismiss();
                  router.push("/assets" as never);
                }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaBtnText}>🏠 קנה נכס ראשון</Text>
              </AnimatedPressable>
            </>
          )}

          <Pressable onPress={handleDismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="סגור את ההודעה">
            <Text style={styles.dismissText}>תודה!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderColor: "#bae6fd",
    paddingHorizontal: 28,
    paddingBottom: 44,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 6,
    textAlign: "center",
    writingDirection: "rtl",
  },
  amount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0891b2",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    writingDirection: "rtl",
  },
  ctaBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: "#0e7490",
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  dismissText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "600",
  },
});
