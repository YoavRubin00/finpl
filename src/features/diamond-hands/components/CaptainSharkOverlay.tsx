import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  FINN_EMPATHIC,
  FINN_HAPPY,
  FINN_STANDARD,
} from "../retention-loops-compat";
import type { HodlPhase } from "../types";

interface Props {
  phase: HodlPhase;
}

function lineFor(phase: HodlPhase): string | null {
  switch (phase) {
    case "fear":
      return "משהו לא בסדר...";
    case "panic":
      return "תמכור!! הכל הולך לאפס!!";
    case "hope":
      return "אולי... זה מתייצב?";
    case "victory":
      return "ידי יהלום! אני גאה בך 💎";
    case "paperHands":
      return "ידיים רכות... פעם הבאה.";
    default:
      return null;
  }
}

function sourceFor(phase: HodlPhase) {
  switch (phase) {
    case "victory":
      return FINN_HAPPY;
    case "fear":
    case "panic":
    case "paperHands":
      return FINN_EMPATHIC;
    default:
      return FINN_STANDARD;
  }
}

export function CaptainSharkOverlay({ phase }: Props) {
  const bubbleOpacity = useSharedValue(0);
  const bubbleTranslate = useSharedValue(12);

  React.useEffect(() => {
    const line = lineFor(phase);
    if (!line) {
      bubbleOpacity.value = withTiming(0, { duration: 200 });
      return;
    }
    bubbleTranslate.value = 12;
    bubbleOpacity.value = withSequence(
      withTiming(0, { duration: 50 }),
      withDelay(120, withTiming(1, { duration: 300 }))
    );
    bubbleTranslate.value = withDelay(
      120,
      withTiming(0, { duration: 300 })
    );
  }, [phase, bubbleOpacity, bubbleTranslate]);

  const line = lineFor(phase);
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ translateY: bubbleTranslate.value }],
  }));

  if (!line) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 40,
        left: 16,
        flexDirection: "row-reverse",
        alignItems: "flex-end",
        gap: 8,
        zIndex: 30,
      }}
    >
      <Image
        source={sourceFor(phase)}
        style={{ width: 90, height: 90 }}
        resizeMode="contain"
      />
      <Animated.View
        style={[
          {
            maxWidth: 180,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: "rgba(10, 54, 34, 0.92)",
            borderWidth: 2,
            borderColor: "#d4a017",
          },
          bubbleStyle,
        ]}
      >
        <Text
          style={{
            color: "#fefce8",
            fontSize: 13,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_700Bold",
          }}
        >
          {line}
        </Text>
      </Animated.View>
    </View>
  );
}
