import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInUp, useReducedMotion } from "react-native-reanimated";

interface PopModalProps {
  visible: boolean;
  /** Android hardware-back / iOS accessibility escape. */
  onRequestClose: () => void;
  /** Tap on the dimmed backdrop. Omit to make the backdrop inert. */
  onBackdropPress?: () => void;
  /** Override the default deep-navy scrim (e.g. 'rgba(0,0,0,0.6)'). */
  backdropColor?: string;
  /** Forwarded verbatim so migrated modals stay pixel-identical on Android. */
  statusBarTranslucent?: boolean;
  testID?: string;
  children: ReactNode;
}

/**
 * The house centered-card modal: native fade Modal + a spring FadeInUp on the
 * card — the exact entrance recipe of ChestCelebrationModal (the gold
 * standard), extracted so every popup in the core loop lands with the same
 * premium beat instead of the stock animationType="slide"/"fade" pop-in.
 *
 * Spring values mirror SPRING_BOUNCY (src/utils/animations.ts) — entering
 * builders can't take a WithSpringConfig object, so they're inlined here.
 * Reduced motion → plain 150ms fade.
 *
 * Deliberately NO open-haptic: haptics belong to user actions, not to
 * passive popups (restraint per docs/BRAND.md).
 *
 * The children stay byte-identical to the migrated modal's card — PopModal
 * only owns the Modal shell, the backdrop, and the centering container.
 */
export function PopModal({
  visible,
  onRequestClose,
  onBackdropPress,
  backdropColor = "rgba(8,20,40,0.75)",
  statusBarTranslucent,
  testID,
  children,
}: PopModalProps) {
  const reduceMotion = useReducedMotion();

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent={statusBarTranslucent}
      accessibilityViewIsModal
      testID={testID}
    >
      <View style={[styles.backdrop, { backgroundColor: backdropColor }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onBackdropPress}
          disabled={!onBackdropPress}
          accessible={Boolean(onBackdropPress)}
          accessibilityLabel={onBackdropPress ? "סגירה" : undefined}
        />
        <Animated.View
          entering={
            reduceMotion
              ? FadeIn.duration(150)
              : FadeInUp.springify().damping(16).stiffness(150)
          }
          style={styles.card}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    alignItems: "center",
  },
});
