/**
 * NotificationBanner, Duolingo-style sliding notification banner.
 * Slides in from the top in Duo-Blue. Auto-dismisses after `duration` ms.
 */
import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { LottieIcon } from "./LottieIcon";
import { STITCH } from "../../constants/theme";

const BANNER_BG = STITCH.surfaceLowest;
const BANNER_SHADOW = STITCH.outlineVariant;

export interface NotificationBannerProps {
  message: string;
  /** Optional action label, e.g. "אישור" */
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  /** Auto-dismiss after ms (default 4000, 0 = never) */
  duration?: number;
  visible: boolean;
  /** Optional Lottie source to show on left side */
  lottieSource?: number;
  /** Optional static image source (e.g. Finn WebP), used instead of lottieSource */
  imageSource?: ImageSource;
}

export function NotificationBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 4000,
  visible,
  lottieSource,
  imageSource,
}: NotificationBannerProps) {
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  function dismiss() {
    translateY.value = withSpring(-80, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(0, { duration: 200 }, (done) => {
      if (done && onDismiss) runOnJS(onDismiss)();
    });
  }

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 180 });

      if (duration > 0) {
        const timer = setTimeout(dismiss, duration);
        return () => clearTimeout(timer);
      }
    } else {
      dismiss();
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.banner, containerStyle]} pointerEvents={visible ? "auto" : "none"}>
      {imageSource ? (
        <View style={styles.lottieWrap}>
          <ExpoImage source={imageSource} style={{ width: 32, height: 32 }} contentFit="contain" />
        </View>
      ) : lottieSource ? (
        <View style={styles.lottieWrap}>
          <LottieIcon source={lottieSource} size={32} autoPlay loop />
        </View>
      ) : (
        <View style={styles.leftStripe} />
      )}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
      <Pressable onPress={dismiss} style={styles.closeBtn} hitSlop={14} accessibilityRole="button" accessibilityLabel="סגור התראה">
        <X size={16} color={STITCH.outlineVariant} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BANNER_BG,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.ghostBorder,
    shadowColor: BANNER_SHADOW,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  leftStripe: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: STITCH.primaryCyan,
    flexShrink: 0,
  },
  lottieWrap: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    color: STITCH.onSurface,
    fontSize: 14,
    fontWeight: "700",
    writingDirection: "rtl",
    textAlign: "right",
  },
  actionBtn: {
    backgroundColor: STITCH.primaryCyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionText: {
    color: STITCH.surfaceLowest,
    fontSize: 13,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 4,
  },
});
