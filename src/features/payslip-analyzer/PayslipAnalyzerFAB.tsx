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
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { FINN_TABLET } from "../retention-loops/finnMascotConfig";
import { usePayslipMetaStore } from "./usePayslipMetaStore";

const RTL_TEXT = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface PayslipAnalyzerFABProps {
  visible?: boolean;
}

export function PayslipAnalyzerFAB({ visible = true }: PayslipAnalyzerFABProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const everUsed = usePayslipMetaStore((s) => s.everUsed);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (!visible || reduceMotion) {
      cancelAnimation(breathe);
      breathe.value = 1;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withDelay(2200, withTiming(1.06, { duration: 900 })),
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
        right: 20,
        bottom: 80,
        zIndex: 90,
      }}
    >
      <Animated.View style={breatheStyle}>
        <AnimatedPressable
          onPress={() => router.push("/payslip-analyzer")}
          accessibilityRole="button"
          accessibilityLabel="נתח תלוש שכר"
          accessibilityHint="פותח את מנתח תלוש השכר עם פין"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#7c3aed",
            paddingVertical: 10,
            paddingLeft: 14,
            paddingRight: 8,
            borderRadius: 999,
            borderBottomWidth: 3,
            borderBottomColor: "#5b21b6",
            shadowColor: "#3b0764",
            shadowOpacity: 0.32,
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
              source={FINN_TABLET}
              accessible={false}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
            />
          </View>
          <Text style={{ ...RTL_TEXT, color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
            נתח תלוש
          </Text>
        </AnimatedPressable>

        {!everUsed && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              paddingHorizontal: 6,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#f59e0b",
              borderWidth: 2,
              borderColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "900", letterSpacing: 0.3 }}>
              NEW
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}
