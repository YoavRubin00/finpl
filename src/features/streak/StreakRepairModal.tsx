import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_EMPATHIC } from "../retention-loops/finnMascotConfig";
import { successHaptic } from "../../utils/haptics";

const REPAIR_COST = 200;

interface StreakRepairModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function StreakRepairModal({ visible, onDismiss }: StreakRepairModalProps) {
  const coins = useEconomyStore((s) => s.coins);
  const previousStreak = useEconomyStore((s) => s.previousStreakBeforeBreak);
  const repairStreak = useEconomyStore((s) => s.repairStreak);
  const dismissRepairOffer = useEconomyStore((s) => s.dismissRepairOffer);

  const canAfford = coins >= REPAIR_COST;

  const handleRepairCoins = () => {
    const ok = repairStreak("coins");
    if (ok) {
      successHaptic();
      onDismiss();
    }
  };

  const handleRepairAd = () => {
    // TODO: integrate rewarded ad SDK — for now treat as free repair
    const ok = repairStreak("ad");
    if (ok) {
      successHaptic();
      onDismiss();
    }
  };

  const handleDecline = () => {
    dismissRepairOffer();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
    >
      <Pressable style={styles.overlay} onPress={handleDecline}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
            {/* Finn empathic */}
            <ExpoImage
              source={FINN_EMPATHIC}
              style={styles.finn}
              contentFit="contain"
              accessible={false}
            />

            {/* Title */}
            <Animated.Text
              entering={FadeInDown.delay(100).duration(300)}
              style={styles.title}
            >
              הרצף שלך ({previousStreak} ימים) נשבר 💔
            </Animated.Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              נחזיר אותו? Finn מאמין בך!
            </Text>

            {/* Option A: Coins */}
            <Pressable
              onPress={handleRepairCoins}
              style={[styles.primaryBtn, !canAfford && styles.disabledBtn]}
              disabled={!canAfford}
              accessibilityRole="button"
              accessibilityLabel={`החזר את הרצף ב-${REPAIR_COST} מטבעות`}
              accessibilityState={{ disabled: !canAfford }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.primaryBtnText}>
                החזר ב-{REPAIR_COST} מטבעות 🪙
              </Text>
            </Pressable>

            {/* Option B: Ad */}
            <Pressable
              onPress={handleRepairAd}
              style={styles.adBtn}
              accessibilityRole="button"
              accessibilityLabel="החזר את הרצף דרך צפייה בפרסומת"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.adBtnText}>
                החזר דרך צפייה בפרסומת 🎬
              </Text>
            </Pressable>

            {/* Option C: Decline */}
            <Pressable
              onPress={handleDecline}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="סגור, התחל רצף מחדש"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.secondaryBtnText}>לא, אתחיל מחדש</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "85%",
    maxWidth: 340,
  },
  content: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#38bdf8",
    padding: 28,
    alignItems: "center",
  },
  finn: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#e0f2fe",
    textAlign: "center",
    writingDirection: "rtl" as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
    writingDirection: "rtl" as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl" as const,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  adBtn: {
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  adBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e0f2fe",
    writingDirection: "rtl" as const,
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38bdf8",
    writingDirection: "rtl" as const,
  },
});
