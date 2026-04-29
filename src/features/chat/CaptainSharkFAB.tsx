import { useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { FINN_TALKING } from "../retention-loops/finnMascotConfig";

const RTL_TEXT = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface CaptainSharkFABProps {
  onPress: () => void;
  visible?: boolean;
  /** Show a subtle "ping" badge to indicate the captain has something to add. */
  hasHint?: boolean;
}

export function CaptainSharkFAB({ onPress, visible = true, hasHint = false }: CaptainSharkFABProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (!visible || reduceMotion) {
      cancelAnimation(breathe);
      breathe.value = 1;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withDelay(2000, withTiming(1.06, { duration: 900 })),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(breathe);
    };
  }, [breathe, visible, reduceMotion]);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 14,
        bottom: Math.max(insets.bottom, 12) + 88,
        zIndex: 90,
      }}
    >
      <Animated.View style={breatheStyle}>
        <AnimatedPressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="שאלו את הקפטן"
          accessibilityHint="פותח צ׳אט עם קפטן שארק עם ההקשר של השיעור הנוכחי"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#0ea5e9",
            paddingVertical: 10,
            paddingLeft: 14,
            paddingRight: 8,
            borderRadius: 999,
            borderBottomWidth: 3,
            borderBottomColor: "#0284c7",
            shadowColor: "#0c4a6e",
            shadowOpacity: 0.28,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: Platform.OS === "android" ? 8 : 0,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <ExpoImage
              source={FINN_TALKING}
              accessible={false}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
            />
          </View>
          <Text style={{ ...RTL_TEXT, color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
            שאלו את הקפטן
          </Text>
        </AnimatedPressable>

        {hasHint && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#f59e0b",
              borderWidth: 2,
              borderColor: "#ffffff",
            }}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}
