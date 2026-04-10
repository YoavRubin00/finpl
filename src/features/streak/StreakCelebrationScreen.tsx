import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SPRING_BOUNCY, SPRING_SMOOTH } from "../../utils/animations";
import { heavyHaptic, doubleHeavyHaptic, successHaptic } from "../../utils/haptics";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { SparkleOverlay } from "../../components/ui/SparkleOverlay";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

interface StreakCelebrationScreenProps {
  streak: number;
  onDismiss: () => void;
}

export function StreakCelebrationScreen({
  streak,
  onDismiss,
}: StreakCelebrationScreenProps) {
  const isMilestone = streak === 7 || streak === 30 || streak === 100;
  const [showConfetti, setShowConfetti] = useState(false);

  // --- Animated values ---
  const overlayOpacity = useSharedValue(0);
  const numberScale = useSharedValue(0.3);
  const numberOpacity = useSharedValue(0);
  const fireScale = useSharedValue(0.5);
  const fireOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);
  const bearScale = useSharedValue(0);
  const bearRotate = useSharedValue(-0.1);
  const calendarOpacity = useSharedValue(0);
  const calendarTranslateY = useSharedValue(20);
  const motivationOpacity = useSharedValue(0);
  const milestoneFlash = useSharedValue(0);
  const fireGlow = useSharedValue(0.6);

  // Breathing fire glow
  useEffect(() => {
    fireGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(fireGlow);
  }, []);

  // Entrance sequence
  useEffect(() => {
    if (isMilestone) {
      doubleHeavyHaptic(); // Extra dramatic burst for milestones (7, 30, 100 days)
    } else {
      heavyHaptic();
    }

    // Overlay fade in
    overlayOpacity.value = withTiming(1, { duration: 300 });

    // Fire appears first
    fireOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    fireScale.value = withDelay(100, withSpring(1, SPRING_BOUNCY));

    // Number bounces in
    numberOpacity.value = withDelay(250, withTiming(1, { duration: 200 }));
    numberScale.value = withDelay(250, withSpring(1, SPRING_BOUNCY));
    setTimeout(() => successHaptic(), 300); // Success burst when number lands
    // Confetti burst after number lands
    setTimeout(() => setShowConfetti(true), 400);

    // Subtitle fades in
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    subtitleTranslateY.value = withDelay(500, withSpring(0, SPRING_SMOOTH));

    // Bear bounces in
    bearScale.value = withDelay(650, withSpring(1, SPRING_BOUNCY));
    bearRotate.value = withDelay(
      650,
      withSpring(0, { damping: 8, stiffness: 100 })
    );

    // Calendar slides in
    calendarOpacity.value = withDelay(850, withTiming(1, { duration: 400 }));
    calendarTranslateY.value = withDelay(850, withSpring(0, SPRING_SMOOTH));

    // Motivation text
    motivationOpacity.value = withDelay(1050, withTiming(1, { duration: 400 }));

    // Milestone flash
    if (isMilestone) {
      milestoneFlash.value = withDelay(
        300,
        withSequence(
          withTiming(0.6, { duration: 200 }),
          withTiming(0, { duration: 800 })
        )
      );
    }

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    overlayOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  // --- Animated styles ---
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
    transform: [{ scale: numberScale.value }],
  }));

  const fireStyle = useAnimatedStyle(() => ({
    opacity: fireOpacity.value * fireGlow.value,
    transform: [{ scale: fireScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const bearStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bearScale.value },
      { rotate: `${bearRotate.value}rad` },
    ],
  }));

  const calendarStyle = useAnimatedStyle(() => ({
    opacity: calendarOpacity.value,
    transform: [{ translateY: calendarTranslateY.value }],
  }));

  const motivationStyle = useAnimatedStyle(() => ({
    opacity: motivationOpacity.value,
  }));

  const milestoneFlashStyle = useAnimatedStyle(() => ({
    opacity: milestoneFlash.value,
  }));

  // Weekly calendar: show current day of week as "today"
  const todayIndex = new Date().getDay(); // 0=Sun → map to Hebrew week
  // Hebrew week: 0=א(Sun), 1=ב(Mon), ..., 6=ש(Sat)
  const completedDays = useMemo(() => {
    const days: boolean[] = Array(7).fill(false);
    // Mark consecutive days completed backwards from today
    for (let i = 0; i < Math.min(streak, 7); i++) {
      const dayIdx = (todayIndex - i + 7) % 7;
      days[dayIdx] = true;
    }
    return days;
  }, [streak, todayIndex]);

  const milestoneText =
    streak >= 100
      ? "!אלוף האלופים 🏆"
      : streak >= 30
        ? "!חודש שלם 🌟"
        : streak >= 7
          ? "!שבוע מושלם"
          : "";

  return (
    <Pressable style={styles.pressableContainer} onPress={handleDismiss}>
      <Animated.View style={[styles.container, overlayStyle]}>
        <LinearGradient
          colors={["#072a42", "#0b3d5e", "#072a42"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Confetti explosion on streak gain */}
        {showConfetti && (
          <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
        )}

        {/* Ambient sparkles for milestones */}
        {isMilestone && <SparkleOverlay density="high" />}

        {/* Milestone gold flash overlay */}
        {isMilestone && (
          <Animated.View
            style={[styles.milestoneFlash, milestoneFlashStyle]}
            pointerEvents="none"
          />
        )}

        {/* Close hint */}
        <View style={styles.closeHint}>
          <X size={20} color="#71717a" />
        </View>

        {/* Fire animation area */}
        <Animated.View style={[styles.fireContainer, fireStyle]}>
          <LottieView
            source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
            style={{ width: 80, height: 80 }}
            autoPlay
            loop
           />
        </Animated.View>

        {/* Streak number */}
        <Animated.View style={[styles.numberContainer, numberStyle]}>
          <Text
            style={[
              styles.streakNumber,
              isMilestone && styles.streakNumberMilestone,
            ]}
          >
            {streak}
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleStyle}>
          <Text style={styles.streakLabel}>ימים רצופים!</Text>
          {isMilestone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {streak >= 7 && streak < 30 && (
                <LottieView
                  source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                  style={{ width: 24, height: 24 }}
                  autoPlay
                  loop
                 />
              )}
              <Text style={styles.milestoneLabel}>{milestoneText}</Text>
            </View>
          )}
        </Animated.View>

        {/* Finn mascot — success celebration */}
        <Animated.View style={[styles.bearContainer, bearStyle]}>
          <ExpoImage
            source={FINN_HAPPY} accessible={false}
            style={{ width: 120, height: 120 }}
            contentFit="contain"
          />
          {/* Sparkle dots around Finn */}
          <View style={[styles.sparkle, styles.sparkle1]} />
          <View style={[styles.sparkle, styles.sparkle2]} />
          <View style={[styles.sparkle, styles.sparkle3]} />
        </Animated.View>

        {/* Weekly calendar — Duolingo style with fire */}
        <Animated.View style={[styles.calendarContainer, calendarStyle]}>
          <View style={styles.calendarRow}>
            {WEEKDAY_LABELS.map((label, i) => {
              const isCompleted = completedDays[i];
              const isToday = i === todayIndex;
              return (
                <View key={label} style={styles.calendarDayCol}>
                  <View
                    style={[
                      styles.calendarDay,
                      isCompleted && styles.calendarDayCompleted,
                      isToday && styles.calendarDayToday,
                    ]}
                  >
                    {isCompleted ? (
                      Platform.OS === 'web' ? (
                        <Text style={{ fontSize: 18 }}>🔥</Text>
                      ) : (
                        <LottieView
                          source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                          style={{ width: 26, height: 26 }}
                          autoPlay
                          loop
                         />
                      )
                    ) : (
                      <Text style={styles.calendarDayEmpty}>—</Text>
                    )}
                  </View>
                  <Text style={[styles.calendarDayLabel, isToday && styles.calendarDayLabelToday]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Motivational text */}
        <Animated.View style={motivationStyle}>
          <Text style={styles.motivationText}>המשך ככה!</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  milestoneFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#facc15",
  },
  closeHint: {
    position: "absolute",
    top: 60,
    right: 24,
    opacity: 0.5,
  },
  fireContainer: {
    marginBottom: 4,
  },
  numberContainer: {
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: "900",
    color: "#f97316",
    textShadowColor: "rgba(249, 115, 22, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  streakNumberMilestone: {
    fontSize: 88,
    color: "#facc15",
    textShadowColor: "rgba(250, 204, 21, 0.6)",
    textShadowRadius: 30,
  },
  streakLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fafafa",
    textAlign: "center",
    writingDirection: "rtl" as const,
    marginBottom: 4,
  },
  milestoneLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#facc15",
    textAlign: "center",
    marginTop: 4,
  },
  bearContainer: {
    marginTop: 24,
    marginBottom: 24,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  bearImage: {
    width: 110,
    height: 110,
  },
  sparkle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#a78bfa",
  },
  sparkle1: {
    top: 5,
    right: 0,
    backgroundColor: "#facc15",
  },
  sparkle2: {
    bottom: 10,
    left: -2,
    backgroundColor: "#85c1e9",
  },
  sparkle3: {
    top: 20,
    left: 5,
    backgroundColor: "#3498db",
  },
  calendarContainer: {
    marginBottom: 24,
  },
  calendarRow: {
    flexDirection: "row-reverse",
    gap: 6,
  },
  calendarDayCol: {
    alignItems: "center",
    gap: 4,
  },
  calendarDay: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(7, 42, 66, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(11, 61, 94, 0.7)",
  },
  calendarDayCompleted: {
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderColor: "rgba(249, 115, 22, 0.5)",
  },
  calendarDayToday: {
    borderColor: "#f97316",
    borderWidth: 2.5,
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarDayEmpty: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a5276",
  },
  calendarDayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#85c1e9",
  },
  calendarDayLabelToday: {
    color: "#f97316",
  },
  motivationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#d6eaf8",
    textAlign: "center",
    writingDirection: "rtl" as const,
  },
});
