import React from "react";
import { View, StyleSheet } from "react-native";
import type { AnimationObject } from "lottie-react-native";
import { SafeLottie } from "../../../components/ui/SafeLottie";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { VisualFrame } from "./VisualFrame";

type LottieVisualData = Extract<FlashcardVisual, { kind: "lottie" }>;

interface Props {
  visual: LottieVisualData;
  animate: boolean;
}

/**
 * Bundled Lottie icon-animation. Plays ONCE on mount (autoPlay + loop=false)
 * rather than looping — a looping Lottie here would eat into the ≤2
 * simultaneous-infinite-loops budget for no reason, since this is a single
 * illustrative beat, not an ambient decoration. Under reduced-motion it
 * renders its settled last frame instead of playing.
 */
export function LottieVisual({ visual, animate }: Props) {
  // require() returns number in RN — same cast LottieIcon.tsx already uses
  // to bridge the asset id into LottieView's (AnimationObject|uri|string) source type.
  const resolvedSource = visual.source as unknown as AnimationObject | { uri: string } | string;

  return (
    <VisualFrame caption={visual.caption} minHeight={150}>
      <View style={styles.box}>
        <SafeLottie
          source={resolvedSource}
          autoPlay={animate}
          loop={false}
          progress={animate ? undefined : 1}
          style={styles.lottie}
        />
      </View>
    </VisualFrame>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
});
