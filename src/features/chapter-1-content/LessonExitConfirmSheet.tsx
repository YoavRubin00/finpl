import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from "react-native-reanimated";
import { FINN_EMPATHIC } from "../retention-loops/finnMascotConfig";

/**
 * Duolingo-style "leave the lesson?" bottom sheet (Yoav 18.8.26).
 *
 * Why: PostHog (new users 27.7–9.8) — the single biggest in-app leak is DURING
 * the mod-0-1 intro (65 start → 50 finish; Android 65% vs iOS 90%). Users sat
 * 10–30s on the intro and left via hardware back / backgrounding — and until
 * now Android hardware back popped the lesson INSTANTLY, no confirm, in every
 * phase (LessonFlowScreen had no BackHandler at all; the legacy centered
 * "חכו, יש רק עוד X דקות" modal only guarded the on-screen chevron during
 * cards/recall/quiz/sim in the linear/auto-flow).
 *
 * ONE component for every guarded phase (intro / hero / video / quiz). System
 * voice → plural-free, gender-neutral phrasing per docs/BRAND.md. Backdrop tap,
 * hardware back on the sheet, and the primary all mean "stay".
 */
interface LessonExitConfirmSheetProps {
  visible: boolean;
  onStay: () => void;
  onLeave: () => void;
  /** Module unit color — the primary CTA wears it so the sheet reads as part of the lesson. */
  accentColor: string;
  /** Darker shade of `accentColor` for the 3D bottom edge of the primary CTA. */
  accentBottom: string;
  /** Safe-area bottom inset so the buttons clear the home indicator / nav bar. */
  bottomInset: number;
}

export function LessonExitConfirmSheet({
  visible,
  onStay,
  onLeave,
  accentColor,
  accentBottom,
  bottomInset,
}: LessonExitConfirmSheetProps) {
  const reduceMotion = useReducedMotion();
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={onStay}
    >
      <View style={styles.root}>
        <Animated.View
          entering={FadeIn.duration(reduceMotion ? 120 : 200)}
          exiting={FadeOut.duration(150)}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onStay}
            accessibilityRole="button"
            accessibilityLabel="להישאר בשיעור"
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? FadeIn.duration(150) : SlideInDown.springify().damping(18).stiffness(180).mass(0.9)}
          exiting={reduceMotion ? FadeOut.duration(120) : SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 12) + 12 }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} accessible={false} />

          <View style={styles.headerRow}>
            <ExpoImage
              source={FINN_EMPATHIC}
              accessible={false}
              style={styles.mascot}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <View style={styles.copy}>
              <Text style={styles.title} accessibilityRole="header">
                לצאת עכשיו?
              </Text>
              <Text style={styles.body}>
                ההתקדמות נשמרת — אפשר לחזור מאותה נקודה.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onStay}
            accessibilityRole="button"
            accessibilityLabel="להישאר"
            style={({ pressed }) => [styles.primaryWrap, pressed && styles.pressed]}
          >
            {/* bg lives on an inner View — RN Pressable function-style drops
                backgroundColor on Android (see memory: android_pressable_bg_drop). */}
            <View style={[styles.primary, { backgroundColor: accentColor, borderBottomColor: accentBottom }]}>
              <Text style={styles.primaryText}>להישאר</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={onLeave}
            accessibilityRole="button"
            accessibilityLabel="לצאת"
            hitSlop={8}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>לצאת</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(8, 20, 40, 0.6)" },
  sheet: {
    backgroundColor: "#0f2942",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(56,189,248,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  mascot: { width: 72, height: 72, flexShrink: 0 },
  copy: { flex: 1, alignItems: "flex-end" },
  title: {
    writingDirection: "rtl",
    textAlign: "right",
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 6,
  },
  body: {
    writingDirection: "rtl",
    textAlign: "right",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
  primaryWrap: { width: "100%" },
  primary: {
    minHeight: 52,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
  },
  primaryText: { fontSize: 17, fontWeight: "900", color: "#ffffff" },
  secondary: {
    marginTop: 6,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  secondaryText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  pressed: { opacity: 0.85 },
});
