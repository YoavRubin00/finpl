import { useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Modal, StyleSheet , Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { heavyHaptic } from "../../utils/haptics";

interface QuizStartPopupProps {
  visible: boolean;
  quizCount: number;
  onStart: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
}

export function QuizStartPopup({ visible, quizCount, onStart, unitColors }: QuizStartPopupProps) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      // Auto-dismiss after 2 seconds
      const t = setTimeout(() => {
        onStart();
      }, 2000);
      return () => {
        clearTimeout(t);
      };
    } else {
      scale.value = withTiming(0.85, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Animated.View style={[styles.card, cardStyle, { borderColor: unitColors.bg, shadowColor: unitColors.glow }]}>
          {/* Finn mascot */}
          <View style={styles.finnWrapper}>
            <ExpoImage source={FINN_STANDARD} accessible={false}
              style={styles.finn} contentFit="contain" />
          </View>

          {/* Title */}
          <Text style={styles.title}>מוכן לאתגר?</Text>

          {/* Quiz count pill */}
          <View style={[styles.badge, { backgroundColor: unitColors.dim, borderColor: unitColors.bg }]}>
            <Text style={[styles.badgeText, { color: unitColors.bottom }]}>{quizCount} שאלות מחכות לך</Text>
          </View>

          <Text style={styles.sub}>
            בדוק את עצמך על מה שלמדת
          </Text>

          {/* CTA — 3D button */}
          <View style={{ alignSelf: "stretch" }}>
            <View style={{
              position: "absolute",
              top: 5,
              left: 0,
              right: 0,
              bottom: -5,
              borderRadius: 16,
              backgroundColor: unitColors.bottom,
            }} />
            <AnimatedPressable
              onPress={() => {
                heavyHaptic();
                onStart();
              }}
              style={[styles.btn, { backgroundColor: unitColors.bg, shadowColor: unitColors.glow }]}
            >
              <Text style={styles.btnText}>בואו נתחיל!</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    borderWidth: 2,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: "center",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  finnWrapper: {
    marginBottom: -8,
  },
  finn: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
    writingDirection: "rtl",
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: "800",
    writingDirection: "rtl",
    textAlign: "center",
  },
  sub: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 22,
    writingDirection: "rtl",
  },
  btn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: "center",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
