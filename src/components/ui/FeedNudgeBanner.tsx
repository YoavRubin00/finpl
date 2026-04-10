import { useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { ChevronLeft, X } from "lucide-react-native";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";

interface FeedNudgeBannerProps {
  message: string;
  onPress: () => void;
  onDismiss: () => void;
  visible: boolean;
  duration?: number;
}

export function FeedNudgeBanner({
  message,
  onPress,
  onDismiss,
  visible,
  duration = 5000,
}: FeedNudgeBannerProps) {
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  function dismiss() {
    translateY.value = withSpring(120, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(0, { duration: 200 }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  }

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });

      if (duration > 0) {
        const timer = setTimeout(dismiss, duration);
        return () => clearTimeout(timer);
      }
    } else {
      dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* X close button — top right */}
      <Pressable onPress={dismiss} style={styles.closeBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="סגור">
        <X size={14} color="#94a3b8" strokeWidth={2.5} />
      </Pressable>

      <Pressable
        style={styles.inner}
        onPress={() => {
          onPress();
          dismiss();
        }}
        accessibilityRole="button"
        accessibilityLabel={message}
      >
        <ChevronLeft size={16} color="#0ea5e9" />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 72, height: 72 }} contentFit="contain" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    start: 16,
    end: 16,
    zIndex: 999,
  },
  closeBtn: {
    position: "absolute",
    top: -8,
    end: -4,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0c4a6e",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
});
