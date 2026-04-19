// ---------------------------------------------------------------------------
// PRD 32, US-005 AC2: Diamond Chest Celebration Overlay
// Lottie-animated chest opening + confetti when claiming referral reward
// ---------------------------------------------------------------------------

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  ZoomIn,
} from "react-native-reanimated";
import { DIAMOND_CHEST_GEMS } from "./referralData";

interface DiamondChestOverlayProps {
  visible: boolean;
  friendName: string;
  onClose: () => void;
}

export function DiamondChestOverlay({
  visible,
  friendName,
  onClose,
}: DiamondChestOverlayProps) {
  const confettiRef = useRef<LottieView>(null);
  const chestRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      confettiRef.current?.play();
      chestRef.current?.play();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose} accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(300)} style={styles.backdrop}>
        {/* Confetti Layer */}
        <View style={styles.confettiWrap} pointerEvents="none">
          <LottieView
            ref={confettiRef}
            source={require("../../../assets/lottie/Confetti.json")}
            style={styles.confetti}
            autoPlay={false}
            loop={false}
          />
        </View>

        {/* Content Card */}
        <Animated.View entering={ZoomIn.duration(500).springify()} style={styles.card}>
          {/* Treasure Chest Animation */}
          <LottieView
            ref={chestRef}
            source={require("../../../assets/lottie/3D Treasure Box.json")}
            style={styles.chest}
            autoPlay={false}
            loop={false}
          />

          {/* Diamond shower */}
          <LottieView
            source={require("../../../assets/lottie/Diamond.json")}
            style={styles.diamondAnim}
            autoPlay
            loop
          />

          <Animated.Text entering={FadeInUp.delay(400)} style={styles.title}>
            ארגז יהלום!
          </Animated.Text>

          <Animated.Text entering={FadeInUp.delay(600)} style={styles.subtitle}>
            {friendName} סיים/ה אונבורדינג
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(800)} style={styles.rewardRow}>
            <Text style={styles.rewardValue}>+{DIAMOND_CHEST_GEMS}</Text>
            <Text style={styles.rewardLabel}>💎 Gems</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(1000)}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>מעולה!</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  confettiWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  confetti: {
    width: "100%",
    height: "100%",
  },
  card: {
    width: "85%",
    backgroundColor: "rgba(12, 25, 41, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.5)",
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    zIndex: 5,
  },
  chest: {
    width: 140,
    height: 140,
  },
  diamondAnim: {
    width: 60,
    height: 60,
    marginTop: -10,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#22d3ee",
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
  },
  rewardValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#67e8f9",
  },
  rewardLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#22d3ee",
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    borderBottomWidth: 3,
    borderBottomColor: "#0369a1",
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
});
