import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";
import { tapHaptic } from "../../utils/haptics";

interface SharkTipModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  /** Optional override for the confirm button label (default: "הבנתי"). */
  ctaLabel?: string;
}

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

/**
 * Soft, light-themed tip bubble from Captain Shark — replaces native
 * `Alert.alert(...)` calls that looked harsh on dark-mode Android.
 * Bottom-sheet style with Finn avatar + short message + single CTA.
 */
export function SharkTipModal({ visible, message, onClose, ctaLabel = "הבנתי" }: SharkTipModalProps) {
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    tapHaptic();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="סגור">
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
        >
          {/* Inner Pressable blocks backdrop-dismiss on sheet taps. */}
          <Pressable onPress={() => {}} accessible={false}>
            <View style={styles.header}>
              <ExpoImage source={FINN_STANDARD} style={styles.finn} contentFit="contain" accessible={false} />
              <Text style={[styles.title, RTL]} allowFontScaling={false}>
                קפטן שארק
              </Text>
            </View>

            <Animated.Text entering={FadeIn.delay(80).duration(280)} style={[styles.message, RTL]} allowFontScaling={false}>
              {message}
            </Animated.Text>

            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ translateY: 2 }], opacity: 0.92 }]}
            >
              <Text style={[styles.ctaText, RTL_CENTER]} allowFontScaling={false}>
                {ctaLabel}
              </Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#f0f9ff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    borderTopWidth: 1.5,
    borderColor: "rgba(14,165,233,0.45)",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  finn: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0369a1",
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0c4a6e",
    lineHeight: 23,
    marginBottom: 16,
  },
  cta: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1e3a8a",
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
  },
});