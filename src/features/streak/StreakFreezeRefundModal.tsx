/**
 * One-time freeze-refund acknowledgement (client migration, OTA 2026-08).
 *
 * The false-consumption bug burned streak freezes on days the user was
 * actually active (open-only days never reached the local calendar, so the
 * gap math saw a fake 2-day hole) and double-burned on cold starts. The
 * migration in useEconomyUIStore.runFreezeRefundMigration refunds one freeze
 * per forensic signature and sets `pendingFreezeRefund`; this modal is the
 * short Captain-Shark acknowledgement. Visual template mirrors
 * StreakFreezeSaveModal (the existing simple modal pattern).
 *
 * The gate goes through the global popup slot (useNudgeQueueStore) so it
 * never stacks on top of the streak celebration / other launch popups.
 */
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useEconomyUIStore } from "../economy/useEconomyUIStore";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { successHaptic } from "../../utils/haptics";

interface StreakFreezeRefundModalProps {
  visible: boolean;
  count: number;
  onDismiss: () => void;
}

export function StreakFreezeRefundModal({ visible, count, onDismiss }: StreakFreezeRefundModalProps) {
  const handleContinue = () => {
    successHaptic();
    onDismiss();
  };

  // Captain Shark speaks — singular, gender-free per BRAND.md ("לך" is safe).
  const body = count === 1
    ? "מגן רצף אחד נלקח לך בטעות. החזרנו אותו למקום."
    : `${count} מגיני רצף נלקחו לך בטעות. החזרנו את כולם למקום.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
            <ExpoImage
              source={FINN_HAPPY}
              style={styles.finn}
              contentFit="contain"
              accessible={false}
            />

            <Animated.Text
              entering={FadeInDown.delay(100).duration(300)}
              style={styles.title}
            >
              המגינים שלך חזרו ❄️
            </Animated.Text>

            <Text style={styles.subtitle}>{body}</Text>

            <Pressable
              onPress={handleContinue}
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel="סגירה והמשך"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.primaryBtnInner}>
                <Text style={styles.primaryBtnText}>מעולה, ממשיכים</Text>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Global gate — mounted once in app/_layout.tsx next to FreezeSaveModalGate.
 * Waits for the popup slot (POPUP_GAP_MS sequencer) before showing, retrying
 * quietly so the refund ack never piles on the streak celebration.
 */
export function FreezeRefundModalGate() {
  const pending = useEconomyUIStore((s) => s.pendingFreezeRefund);
  const dismiss = useEconomyUIStore((s) => s.dismissFreezeRefund);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pending == null) {
      setVisible(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const tryShow = () => {
      if (cancelled) return;
      const queue = useNudgeQueueStore.getState();
      if (queue.canTakePopupSlot()) {
        queue.takePopupSlot();
        setVisible(true);
      } else {
        timer = setTimeout(tryShow, 2500);
      }
    };
    tryShow();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pending]);

  if (pending == null) return null;
  return (
    <StreakFreezeRefundModal
      visible={visible}
      count={pending}
      onDismiss={() => {
        setVisible(false);
        dismiss();
      }}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "85%",
    maxWidth: 340,
  },
  content: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#38bdf8",
    padding: 28,
    alignItems: "center",
  },
  finn: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#e0f2fe",
    textAlign: "center",
    writingDirection: "rtl" as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
    writingDirection: "rtl" as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  // Android Pressable bg drop: keep the background on an inner View, never on
  // the Pressable itself (see android_pressable_bg_drop).
  primaryBtn: {
    width: "100%",
  },
  primaryBtnInner: {
    width: "100%",
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl" as const,
  },
});
