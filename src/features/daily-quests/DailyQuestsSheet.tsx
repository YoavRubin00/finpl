import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { AnimationObject } from "lottie-react-native";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { STITCH } from "../../constants/theme";
import { useDailyQuestsStore } from "./useDailyQuestsStore";
import { successHaptic } from "../../utils/haptics";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CHECK = require("../../../assets/lottie/wired-flat-37-approve-hover-pinch.json") as unknown as AnimationObject;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json") as unknown as AnimationObject;

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface DailyQuestsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function DailyQuestsSheet({ visible, onClose }: DailyQuestsSheetProps) {
  const quests = useDailyQuestsStore((s) => s.quests);
  const completedCount = useDailyQuestsStore((s) => s.completedCount());
  const allDone = useDailyQuestsStore((s) => s.allCompleted());
  const rewardClaimed = useDailyQuestsStore((s) => s.rewardClaimed);
  const claimReward = useDailyQuestsStore((s) => s.claimReward);

  const handleClaim = () => {
    successHaptic();
    claimReward();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={[styles.title, RTL]}>משימות יומיות</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              entering={FadeIn.duration(400)}
              style={[styles.progressFill, { width: `${(completedCount / Math.max(quests.length, 1)) * 100}%` as `${number}%` }]}
            />
          </View>
          <Text style={[styles.progressLabel, RTL]}>{completedCount} מתוך {quests.length} הושלמו</Text>

          {/* Quest rows */}
          <View style={styles.questList}>
            {quests.map((quest, i) => (
              <Animated.View
                key={quest.id}
                entering={FadeInDown.delay(100 + i * 80).duration(300)}
                style={[styles.questRow, quest.isCompleted && styles.questRowDone]}
              >
                {/* Checkmark circle */}
                <View style={[styles.checkCircle, quest.isCompleted && styles.checkCircleDone]}>
                  {quest.isCompleted && <LottieIcon source={LOTTIE_CHECK} size={16} autoPlay loop={false} />}
                </View>

                {/* Quest text */}
                <Text style={[styles.questText, RTL, quest.isCompleted && styles.questTextDone]}>
                  {quest.titleHe}
                </Text>

                {/* Lottie icon */}
                <LottieIcon source={quest.lottieSource} size={32} autoPlay loop />
              </Animated.View>
            ))}
          </View>

          {/* Reward section */}
          {allDone && !rewardClaimed && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.rewardCard}>
              <LottieIcon source={LOTTIE_CHEST as unknown as number} size={56} autoPlay loop />
              <Text style={[styles.rewardText, RTL]}>100 XP + 50 מטבעות</Text>
              <AnimatedPressable
                onPress={handleClaim}
                style={styles.claimBtn}
                accessibilityRole="button"
                accessibilityLabel="אסוף פרס"
              >
                <Text style={styles.claimBtnText}>אסוף פרס</Text>
              </AnimatedPressable>
            </Animated.View>
          )}

          {rewardClaimed && (
            <View style={styles.claimedRow}>
              <LottieIcon source={LOTTIE_CHECK} size={20} autoPlay loop={false} />
              <Text style={[styles.claimedText, RTL]}>הפרס נאסף!</Text>
            </View>
          )}

          {!allDone && (
            <Text style={[styles.hintText, RTL]}>
              השלם את כל המשימות כדי לפתוח את הפרס
            </Text>
          )}

          {/* Close */}
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="סגור">
            <Text style={styles.closeBtnText}>סגור</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: STITCH.surfaceLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: STITCH.outlineVariant,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: STITCH.onSurface,
    marginBottom: 14,
  },

  // Progress
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: STITCH.surfaceVariant,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: STITCH.primary,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: STITCH.onSurfaceVariant,
    marginBottom: 16,
  },

  // Quests
  questList: {
    gap: 10,
    marginBottom: 18,
  },
  questRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: STITCH.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: STITCH.outlineVariant,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  questRowDone: {
    backgroundColor: STITCH.surfaceLow,
    borderColor: "rgba(0,91,177,0.2)",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: STITCH.outlineVariant,
    backgroundColor: STITCH.surfaceLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleDone: {
    borderColor: STITCH.primary,
    backgroundColor: "rgba(0,91,177,0.1)",
  },
  questText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: STITCH.onSurface,
  },
  questTextDone: {
    color: STITCH.onSurfaceVariant,
    textDecorationLine: "line-through",
  },

  // Reward
  rewardCard: {
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(115,92,0,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(115,92,0,0.15)",
    padding: 18,
    marginBottom: 14,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: "800",
    color: STITCH.tertiaryGold,
  },
  claimBtn: {
    backgroundColor: STITCH.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    shadowColor: STITCH.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  claimedRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  claimedText: {
    fontSize: 15,
    fontWeight: "700",
    color: STITCH.primary,
  },
  hintText: {
    fontSize: 13,
    color: STITCH.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 14,
  },
  closeBtn: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: STITCH.onSurfaceVariant,
  },
});
