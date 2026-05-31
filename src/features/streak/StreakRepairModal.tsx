import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Flame } from "lucide-react-native";
import { useEconomy } from "../economy/useEconomy";
import { useEconomyUIStore } from "../economy/useEconomyUIStore";
import { FINN_EMPATHIC } from "../retention-loops/finnMascotConfig";
import { successHaptic, tapHaptic } from "../../utils/haptics";
import { useBandit } from "../bandit/useBandit";

const REPAIR_COST_GEMS = 30;

interface StreakRepairModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function StreakRepairModal({ visible, onDismiss }: StreakRepairModalProps) {
  const router = useRouter();
  const { data: economyData } = useEconomy();
  const gems = economyData?.gems ?? 0;
  const previousStreak = useEconomyUIStore((s) => s.previousStreakBeforeBreak);
  const repairStreak = useEconomyUIStore((s) => s.repairStreak);
  const dismissRepairOffer = useEconomyUIStore((s) => s.dismissRepairOffer);

  const { payload, trackImpression, trackConversion, trackDismiss } = useBandit('streak_repair_offer');

  useEffect(() => {
    if (visible) trackImpression();
  }, [visible, trackImpression]);

  const canAfford = gems >= REPAIR_COST_GEMS;

  const title = payload.title.replace('{streak}', String(previousStreak));

  const handleRepairGems = () => {
    if (!canAfford) {
      // Not enough gems → navigate to shop to buy gems
      tapHaptic();
      onDismiss();
      router.push("/(tabs)/shop" as never);
      return;
    }
    const ok = repairStreak("gems");
    if (ok) {
      successHaptic();
      trackConversion();
      onDismiss();
    }
  };

  const handleRepairAd = () => {
    const ok = repairStreak("ad");
    if (ok) {
      successHaptic();
      trackConversion();
      onDismiss();
    }
  };

  const handleDecline = () => {
    trackDismiss();
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

            {/* Eyebrow — establishes immediately that this modal is about the
                user's daily streak, not a generic interruption. Orange flame
                pill matches the streak indicator in GlobalWealthHeader so the
                visual chain "header counter → this modal" reads as one thing. */}
            <View style={styles.eyebrow}>
              <Flame size={14} color="#f97316" strokeWidth={2.6} fill="#f97316" />
              <Text style={styles.eyebrowText} allowFontScaling={false}>
                הרצף היומי שלך
              </Text>
            </View>

            {/* Title */}
            <Animated.Text
              entering={FadeInDown.delay(100).duration(300)}
              style={styles.title}
            >
              {title}
            </Animated.Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              {payload.subtitle}
            </Text>

            {/* Option A: Gems (or navigate to shop if not enough) */}
            <Pressable
              onPress={handleRepairGems}
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel={canAfford ? `שחזרו את הרצף עם ${REPAIR_COST_GEMS} יהלומים` : "קנו יהלומים בחנות"}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.primaryBtnText}>
                {canAfford ? `שחזרו את הרצף · ${REPAIR_COST_GEMS} 💎` : "קנו יהלומים בחנות 💎"}
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
                {payload.adCTA}
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
              <Text style={styles.secondaryBtnText}>{payload.declineCTA}</Text>
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
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 2,
    // Streak orange instead of cyan — visually classifies this modal as a
    // streak interaction at a glance (matches the flame eyebrow + the
    // GlobalWealthHeader streak pill).
    borderColor: "#fdba74",
    padding: 28,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  finn: {
    width: 110,
    height: 110,
    marginBottom: 10,
  },
  eyebrow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#c2410c",
    writingDirection: "rtl" as const,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    writingDirection: "rtl" as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
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
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  adBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
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
    color: "#64748b",
    writingDirection: "rtl" as const,
  },
});
