import React, { useEffect } from "react";
import { View } from "react-native";
import LottieView from "lottie-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const DIAMOND_LOTTIE = require("../../../../assets/lottie/Diamond.json");

const BUTTON_SIZE = 260;

interface Props {
  isHolding: boolean;
  disabled?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

export function HodlButton({
  isHolding,
  disabled,
  onHoldStart,
  onHoldEnd,
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
    return () => {
      pulse.value = 1;
    };
  }, [pulse, reduceMotion]);

  useEffect(() => {
    if (isHolding) {
      scale.value = withSpring(0.93, { damping: 12, stiffness: 280 });
      glow.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      glow.value = withTiming(0.4, { duration: 300 });
    }
  }, [isHolding, scale, glow]);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .maxPointers(1)
    .onBegin(() => {
      if (disabled) return;
      onHoldStart();
    })
    .onFinalize(() => {
      onHoldEnd();
    })
    .runOnJS(true);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View
      style={{
        width: BUTTON_SIZE + 40,
        height: BUTTON_SIZE + 40,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: BUTTON_SIZE + 60,
            height: BUTTON_SIZE + 60,
            borderRadius: (BUTTON_SIZE + 60) / 2,
            backgroundColor: "#e0f2fe",
            opacity: 0.6,
          },
          glowStyle,
        ]}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              justifyContent: "center",
              alignItems: "center",
            },
            animStyle,
          ]}
        >
          <LottieView
            source={DIAMOND_LOTTIE}
            style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
            autoPlay
            loop
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
