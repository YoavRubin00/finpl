import { useState, useCallback } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { BridgeScreen } from "../../src/features/the-bridge/BridgeScreen";
import { FINN_HAPPY } from "../../src/features/retention-loops/finnMascotConfig";
import { useTutorialStore } from "../../src/stores/useTutorialStore";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

export default function BridgePage() {
  const isWalkthrough = !useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const [showWelcome, setShowWelcome] = useState(true);

  const dismiss = useCallback(() => {
    setShowWelcome(false);
  }, []);

  // During walkthrough — skip welcome, go straight to BridgeScreen with auto-scroll
  if (isWalkthrough || !showWelcome) {
    return <BridgeScreen walkthroughAutoScroll={isWalkthrough} />;
  }

  return (
    <Pressable style={styles.overlay} onPress={dismiss}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.backdrop} />
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
        <ExpoImage
          source={FINN_HAPPY}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
        />
        <Text style={[styles.title, RTL]}>הידע שלך שווה כסף!</Text>
        <Text style={[styles.sub, RTL]}>
          כאן תמיר את המטבעות במשחק להטבות בעולם האמיתי
        </Text>
        <Text style={styles.tapHint}>לחץ בכל מקום להמשך</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,165,233,0.08)",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 10,
    width: "85%",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    shadowColor: "#0891b2",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0369a1",
    textAlign: "center",
  },
  sub: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
  },
  tapHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#94a3b8",
  },
});
