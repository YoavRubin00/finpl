/**
 * SharkInsightToast — reusable Captain Shark bottom-toast for retention nudges.
 *
 * Used by:
 *   • Session-stacking bonus (חזרה לאפליקציה)
 *   • Seasonal events (יום העצמאות, חנוכה, …)
 *   • Hearts-full XP boost (5/5 ❤️)
 *
 * Visual pattern matches `SharkCTAModals` — bottom card, Captain Shark WebP,
 * title + body + optional CTA + dismiss X. Auto-dismisses after `autoDismissMs`
 * if no CTA action is taken (default 6 sec).
 */
import { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import Animated, {
  FadeOutDown,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STITCH } from "../../constants/theme";

interface Props {
  visible: boolean;
  shark: ImageSource;
  /** Single-line title in Hebrew. Use sentence-case, RTL. */
  title: string;
  /** Body / explanation. RTL. */
  body: string;
  /** Optional accent color for the left-edge stripe (defaults to cyan). */
  accentColor?: string;
  /** Auto-dismiss after this many ms. Default 6000. Set 0 to disable. */
  autoDismissMs?: number;
  onDismiss: () => void;
}

export function SharkInsightToast({
  visible,
  shark,
  title,
  body,
  accentColor = STITCH.primaryCyan,
  autoDismissMs = 6000,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      dismissedRef.current = false;
      return;
    }
    if (autoDismissMs <= 0) return;
    const t = setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss();
      }
    }, autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, autoDismissMs, onDismiss]);

  if (!visible) return null;

  const handleDismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  };

  return (
    <View
      style={[s.container, { bottom: Math.max(insets.bottom, 16) + 16 }]}
      pointerEvents="box-none"
    >
      <Animated.View
        entering={reducedMotion ? undefined : SlideInDown.springify().damping(18).stiffness(140)}
        exiting={FadeOutDown.duration(220)}
        style={s.card}
        pointerEvents="auto"
      >
        <View style={[s.accent, { backgroundColor: accentColor }]} />
        <View style={s.row}>
          <View style={s.avatarWrap}>
            <ExpoImage source={shark} style={s.avatar} contentFit="contain" accessible={false} />
          </View>
          <View style={s.textBlock}>
            <Text style={s.title} accessibilityRole="header" numberOfLines={2}>{title}</Text>
            <Text style={s.body} numberOfLines={3}>{body}</Text>
          </View>
          <Pressable
            onPress={handleDismiss}
            hitSlop={12}
            style={s.dismiss}
            accessibilityRole="button"
            accessibilityLabel="סגור"
          >
            <X size={15} color={STITCH.outlineVariant} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 200,
  },
  card: {
    backgroundColor: STITCH.surface,
    borderRadius: 18,
    paddingStart: 14,
    paddingEnd: 8,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
    overflow: "hidden",
    flexDirection: "row-reverse",
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0 6px 18px rgba(0,0,0,0.16)" },
      default: {},
    }),
  },
  accent: {
    position: "absolute",
    insetInlineEnd: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(14,165,233,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 38,
    height: 38,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: STITCH.onSurface,
    textAlign: "right",
    writingDirection: "rtl",
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 12,
    fontWeight: "500",
    color: STITCH.onSurfaceVariant,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 17,
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
