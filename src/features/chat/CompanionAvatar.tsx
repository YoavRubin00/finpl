import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import type { CompanionId } from "../auth/types";
import type { CompanionAnimationState } from "./chatTypes";
import { COMPANION_PERSONALITIES } from "./chatData";

/* eslint-disable @typescript-eslint/no-require-imports */
const LOTTIE_SOURCES: Record<CompanionId, ReturnType<typeof require>> = {
  "warren-buffett": require("../../../assets/lottie/warren-buffett.json"),
  "moshe-peled": require("../../../assets/lottie/moshe-peled.json"),
  rachel: require("../../../assets/lottie/rachel.json"),
  robot: require("../../../assets/lottie/robot.json"),
};

const COMPANION_COLORS: Record<CompanionId, string> = {
  "warren-buffett": "#d4a017",
  "moshe-peled": "#f97316",
  rachel: "#ec4899",
  robot: "#22d3ee",
};

interface CompanionAvatarProps {
  companionId: CompanionId;
  animationState: CompanionAnimationState;
}

export function CompanionAvatar({
  companionId,
  animationState,
}: CompanionAvatarProps) {
  const lottieRef = useRef<LottieView>(null);
  const personality = COMPANION_PERSONALITIES[companionId];
  const animation = personality.animation;
  const glowColor = COMPANION_COLORS[companionId];

  useEffect(() => {
    const ref = lottieRef.current;
    if (!ref) return;

    let startFrame: number;
    let endFrame: number;

    switch (animationState) {
      case "talking":
        startFrame = animation.talkingFrames[0];
        endFrame = animation.talkingFrames[1];
        break;
      case "thinking":
        startFrame = animation.thinkingFrames[0];
        endFrame = animation.thinkingFrames[1];
        break;
      default:
        startFrame = animation.idleFrames[0];
        endFrame = animation.idleFrames[1];
        break;
    }

    ref.play(startFrame, endFrame);
  }, [animationState, animation]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarFrame,
          {
            borderColor: glowColor,
            shadowColor: glowColor,
          },
        ]}
      >
        <LottieView
          ref={lottieRef}
          source={LOTTIE_SOURCES[companionId]}
          loop
          style={styles.lottie}
          autoPlay
        />
      </View>
      <Text
        style={[styles.nameText, { writingDirection: "rtl", textAlign: "center" }]}
      >
        {personality.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  avatarFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    backgroundColor: "#0a0a0a",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
  },
  lottie: {
    width: 100,
    height: 100,
  },
  nameText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
