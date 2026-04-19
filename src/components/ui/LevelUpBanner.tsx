import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEconomyStore } from "../../features/economy/useEconomyStore";
import { LottieIcon } from "./LottieIcon";
import { LEVEL_TO_PYRAMID_LAYER } from "../../constants/economy";
import { tapHaptic, successHaptic } from "../../utils/haptics";

const LOTTIE_TROPHY = require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json");
const LOTTIE_UNLOCK = require("../../../assets/lottie/wired-flat-94-lock-unlock-hover-locked.json");
const LAYER_EMOJIS = ["", "🌱", "🛡️", "⚖️", "📈", "🏆"];
const LAYER_NAMES_HE = ["", "הישרדות", "ביטחון", "יציבות", "צמיחה", "חירות"];

interface LayerUnlock {
  text: string;
  ctaLabel: string;
  route: string;
}

const LAYER_UNLOCKS: Record<number, LayerUnlock> = {
  2: {
    text: "תרחישים ותוכן מתקדם נפתחו!",
    ctaLabel: "בוא נמשיך ללמוד",
    route: "/(tabs)/",
  },
  3: {
    text: "סימולציות מתקדמות נפתחו!",
    ctaLabel: "נסה את הסימולטור",
    route: "/simulator",
  },
  4: {
    text: "זירת המסחר נפתחה!",
    ctaLabel: "גלה את המסחר",
    route: "/trading-hub",
  },
  5: {
    text: "כל התכנים הפרמיום זמינים לך!",
    ctaLabel: "גלה את כל ההטבות",
    route: "/bridge",
  },
};

export function LevelUpBanner() {
  const router = useRouter();
  const pendingLevelUp = useEconomyStore((s) => s.pendingLevelUp);
  const dismissLevelUp = useEconomyStore((s) => s.dismissLevelUp);

  if (pendingLevelUp === null) return null;

  const layer = (LEVEL_TO_PYRAMID_LAYER as readonly number[])[pendingLevelUp] ?? 1;
  const emoji = LAYER_EMOJIS[layer] ?? "";
  const layerName = LAYER_NAMES_HE[layer] ?? "";
  const unlock = LAYER_UNLOCKS[layer];

  const handleCta = () => {
    tapHaptic();
    dismissLevelUp();
    if (unlock) {
      router.push(unlock.route as never);
    }
  };

  const handleDismiss = () => {
    dismissLevelUp();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss} accessibilityViewIsModal>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <LinearGradient
            colors={["#ffffff", "#f0f9ff"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />

          {/* Close button */}
          <Pressable onPress={handleDismiss} style={styles.closeBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={18} color="#6b7280" />
          </Pressable>

          <Animated.View entering={FadeInDown.duration(350)} style={styles.content}>
            {/* Trophy Lottie */}
            <View style={styles.trophyCircle}>
              <LottieIcon source={LOTTIE_TROPHY} size={72} />
            </View>

            {/* Level badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>שלב {layer}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              עלית לשלב {layer}!
            </Text>

            {/* Layer info */}
            <Text style={styles.layerName}>
              {emoji} {layerName}
            </Text>

            {/* Unlock description */}
            {unlock && (
              <View style={styles.unlockCard}>
                <LottieIcon source={LOTTIE_UNLOCK} size={28} />
                <Text style={styles.unlockText}>{unlock.text}</Text>
              </View>
            )}

            {/* CTA button */}
            {unlock && (
              <Pressable
                onPress={() => { successHaptic(); handleCta(); }}
                accessibilityRole="button"
                accessibilityLabel={unlock.ctaLabel}
                style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={["#0ea5e9", "#0284c7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>← {unlock.ctaLabel}</Text>
                </LinearGradient>
              </Pressable>
            )}

            {/* Dismiss text */}
            <Pressable onPress={handleDismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="אחר כך" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dismissText}>אחר כך</Text>
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
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#e0f2fe",
    padding: 28,
    overflow: "hidden",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  trophyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fef3c7",
    borderWidth: 2,
    borderColor: "#fde68a",
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadge: {
    backgroundColor: "#0ea5e9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
  },
  layerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },
  unlockCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ecfdf5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 14,
    width: "100%",
  },
  unlockIcon: {
    fontSize: 22,
  },
  unlockText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
    writingDirection: "rtl",
    textAlign: "right",
  },
  ctaBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    writingDirection: "rtl",
  },
});
