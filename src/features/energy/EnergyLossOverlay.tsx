/* ------------------------------------------------------------------ */
/*  EnergyLossOverlay — dramatic energy-loss animation (was             */
/*  HeartBreakOverlay in LessonFlowScreen). Extracted 2026-06-17 so the */
/*  global EnergyAnimationProvider can fire it on EVERY penalty loss     */
/*  (quiz/recall/dilemma/sim/podcast/practice), not just in the lesson. */
/* ------------------------------------------------------------------ */
import { useEffect } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { heavyHaptic } from "../../utils/haptics";
import { SHARK_SPARK_LOST } from "./energyScenes";

export function EnergyLossOverlay({
  visible,
  onFinish,
  originY = 120,
  originX = undefined,
  isLastHeart = false,
}: {
  visible: boolean;
  onFinish: () => void;
  originY?: number;
  originX?: number;
  isLastHeart?: boolean;
}) {
  const flashOpacity = useSharedValue(0);
  const heartDropY = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartRotate = useSharedValue(0);
  const leftTranslateX = useSharedValue(0);
  const rightTranslateX = useSharedValue(0);
  const minusOpacity = useSharedValue(0);
  const minusTranslateY = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const { width: screenWidth } = Dimensions.get("window");
  const startX = originX ?? screenWidth / 2;

  useEffect(() => {
    if (!visible) return;

    // Reset values
    flashOpacity.value = 0;
    heartDropY.value = 0;
    heartScale.value = 0.8;
    heartRotate.value = 0;
    leftTranslateX.value = 0;
    rightTranslateX.value = 0;
    minusOpacity.value = 0;
    minusTranslateY.value = 0;
    heartOpacity.value = 1;

    // Fade in flash
    flashOpacity.value = withSequence(
      withTiming(0.2, { duration: 150 }),
      withTiming(0, { duration: 600 }),
    );

    let finishTimeout = 1800;

    if (isLastHeart) {
      // Phase 1: Pop out from origin
      heartScale.value = withSpring(1.2, { damping: 12, stiffness: 90 });
      heartDropY.value = withSequence(
        withSpring(-30, { damping: 14, stiffness: 180 }),
        withSpring(20, { damping: 10, stiffness: 70 })
      );

      // Phase 2: Heart breaks mid-air
      setTimeout(() => {
        heavyHaptic();
        leftTranslateX.value = withSpring(-20, { damping: 14, stiffness: 90 });
        rightTranslateX.value = withSpring(20, { damping: 14, stiffness: 90 });
        heartRotate.value = withSpring(-10, { damping: 14, stiffness: 90 });

        minusOpacity.value = withTiming(1, { duration: 300 });
        minusTranslateY.value = withSpring(-50, { damping: 15, stiffness: 100 });
      }, 500);

      finishTimeout = 1800;
    } else {
      // Simple smooth float up and disappear
      heartScale.value = withSpring(1.2, { damping: 15, stiffness: 100 });
      heartDropY.value = withTiming(-150, { duration: 1000 });

      setTimeout(() => {
        minusOpacity.value = withTiming(1, { duration: 300 });
        minusTranslateY.value = withTiming(-30, { duration: 800 });
      }, 100);

      setTimeout(() => {
        heartOpacity.value = withTiming(0, { duration: 500 });
      }, 600);

      finishTimeout = 1000;
    }

    // Phase 4: Fade everything out and notify complete
    const finishTimer = setTimeout(() => {
      if (isLastHeart) heartOpacity.value = withTiming(0, { duration: 400 });
      setTimeout(() => onFinish(), 400);
    }, finishTimeout);

    return () => {
      clearTimeout(finishTimer);
    };
  }, [visible, isLastHeart]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const heartAnimsStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateY: heartDropY.value },
      { scale: heartScale.value },
      { rotate: `${heartRotate.value}deg` },
    ],
  }));

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftTranslateX.value }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightTranslateX.value }],
  }));

  const minusStyle = useAnimatedStyle(() => ({
    opacity: minusOpacity.value,
    transform: [{ translateY: minusTranslateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={[heartBreakStyles.overlay, { paddingTop: originY }]} pointerEvents="none">
      {/* Red flash vignette */}
      <Animated.View style={[heartBreakStyles.flash, flashStyle]} />

      {/* Heart halves container */}
      <Animated.View style={[heartBreakStyles.heartContainer, heartAnimsStyle, originX !== undefined && { left: startX - (screenWidth / 2) }]}>
        {/* Mistake reaction — Captain Shark reacts (concerned-but-supportive) as a
            battery segment dims. Replaces the red heart shatter. leftStyle/rightStyle
            kept on the wrappers so the same gentle shake rig still plays. */}
        <Animated.View style={leftStyle}>
          <Animated.View style={rightStyle}>
            <ExpoImage source={SHARK_SPARK_LOST} style={{ width: 104, height: 104 }} contentFit="contain" accessible={false} />
          </Animated.View>
        </Animated.View>

        {/* "-1" floating text attached to heart */}
        <Animated.Text style={[heartBreakStyles.minusText, minusStyle, { position: 'absolute', top: -40, width: 100, textAlign: 'center' }]}>
          -1
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const heartBreakStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 90,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(168, 85, 247, 0.18)",
  },
  heartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  minusText: {
    position: "absolute",
    fontSize: 28,
    fontWeight: "900",
    color: "#7c3aed",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
