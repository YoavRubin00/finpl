import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import type { AnimationObject } from "lottie-react-native";
import { Gem, Snowflake } from "lucide-react-native";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { STITCH } from "../../constants/theme";
import { useDailyQuestsStore, previewQuestReward } from "./useDailyQuestsStore";
import { QUEST_GEM_CHANCE } from "./daily-quest-types";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_HELLO, FINN_HAPPY, FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { successHaptic } from "../../utils/haptics";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";

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
  const lastRewardSummary = useDailyQuestsStore((s) => s.lastRewardSummary);
  const claimReward = useDailyQuestsStore((s) => s.claimReward);
  const streak = useEconomyStore((s) => s.streak);

  const preview = previewQuestReward(streak);
  const summary = rewardClaimed ? lastRewardSummary : null;

  const handleClaim = () => {
    successHaptic();
    claimReward();
  };

  // Shark persona + copy — מגיב למצב
  const sharkState: "hello" | "happy" | "standard" = rewardClaimed
    ? "happy"
    : allDone
      ? "happy"
      : completedCount === 0
        ? "hello"
        : "standard";
  const sharkImage = sharkState === "happy" ? FINN_HAPPY : sharkState === "hello" ? FINN_HELLO : FINN_STANDARD;
  const sharkLine = rewardClaimed
    ? "תחזור מחר, אני אכין תיבה חדשה 🦈"
    : allDone
      ? "סיימת הכל! לחץ על התיבה והפרס שלך"
      : completedCount === 0
        ? "אהוי! יש לך 3 משימות היום. נצא לציד?"
        : `כל הכבוד! עוד ${quests.length - completedCount} ואני אפתח לך את התיבה`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Shark hero — presence + coaching */}
          <View style={styles.sharkHero}>
            <Animated.View entering={FadeIn.duration(300)} style={styles.sharkAvatarWrap}>
              <ExpoImage source={sharkImage} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
            </Animated.View>
            <Animated.View entering={FadeInRight.delay(120).duration(300)} style={styles.sharkBubbleWrap}>
              <View style={styles.sharkBubbleTail} />
              <Text style={[styles.title, RTL, { marginBottom: 4 }]}>משימות יומיות</Text>
              <Text style={[styles.sharkBubbleText, RTL]}>{sharkLine}</Text>
            </Animated.View>
          </View>

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

          {/* Reward preview / claim */}
          {!rewardClaimed && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.rewardCard}>
              <LottieIcon source={LOTTIE_CHEST as unknown as number} size={56} autoPlay loop />
              <Text style={[styles.rewardHeadline, RTL]}>
                {allDone ? "התיבה מוכנה!" : "מה מחכה בתיבה?"}
              </Text>

              <View style={styles.rewardPills}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillValue}>{preview.xp}</Text>
                  <Text style={styles.rewardPillLabel}>XP</Text>
                </View>
                <View style={styles.rewardPill}>
                  <GoldCoinIcon size={16} />
                  <Text style={styles.rewardPillValue}>{preview.coins}</Text>
                </View>
                <View style={[styles.rewardPill, styles.rewardPillChance]}>
                  <Gem size={14} color={STITCH.primary} />
                  <Text style={styles.rewardPillValue}>×{preview.gems}</Text>
                  <Text style={styles.rewardPillChanceText}>
                    {Math.round(QUEST_GEM_CHANCE * 100)}%
                  </Text>
                </View>
                {preview.freezes > 0 && (
                  <View style={[styles.rewardPill, styles.rewardPillBonus]}>
                    <Snowflake size={14} color="#0284c7" />
                    <Text style={styles.rewardPillValue}>+1</Text>
                  </View>
                )}
              </View>

              {preview.streakBonusPct > 0 && (
                <Text style={[styles.streakBonusLabel, RTL]}>
                  🔥 בונוס רצף: +{preview.streakBonusPct}%
                </Text>
              )}

              {allDone ? (
                <AnimatedPressable
                  onPress={handleClaim}
                  style={styles.claimBtn}
                  accessibilityRole="button"
                  accessibilityLabel="אסוף פרס"
                >
                  <Text style={styles.claimBtnText}>אסוף פרס</Text>
                </AnimatedPressable>
              ) : (
                <Text style={[styles.hintText, RTL]}>
                  השלם את כל המשימות כדי לפתוח את התיבה
                </Text>
              )}
            </Animated.View>
          )}

          {rewardClaimed && summary && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.claimedCard}>
              <View style={styles.claimedRow}>
                <LottieIcon source={LOTTIE_CHECK} size={20} autoPlay loop={false} />
                <Text style={[styles.claimedText, RTL]}>הפרס נאסף!</Text>
              </View>
              <View style={styles.rewardPills}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillValue}>{summary.xp}</Text>
                  <Text style={styles.rewardPillLabel}>XP</Text>
                </View>
                <View style={styles.rewardPill}>
                  <GoldCoinIcon size={16} />
                  <Text style={styles.rewardPillValue}>{summary.coins}</Text>
                </View>
                {summary.gems > 0 && (
                  <View style={styles.rewardPill}>
                    <Gem size={14} color={STITCH.primary} />
                    <Text style={styles.rewardPillValue}>×{summary.gems}</Text>
                  </View>
                )}
                {summary.freezes > 0 && (
                  <View style={[styles.rewardPill, styles.rewardPillBonus]}>
                    <Snowflake size={14} color="#0284c7" />
                    <Text style={styles.rewardPillValue}>+{summary.freezes}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
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

  // Shark hero
  sharkHero: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sharkAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(14,165,233,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  sharkAvatar: {
    width: 60,
    height: 60,
  },
  sharkBubbleWrap: {
    flex: 1,
    position: "relative",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: STITCH.outlineVariant,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sharkBubbleTail: {
    position: "absolute",
    right: -7,
    top: 22,
    width: 12,
    height: 12,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: STITCH.outlineVariant,
    transform: [{ rotate: "45deg" }],
  },
  sharkBubbleText: {
    fontSize: 13,
    fontWeight: "600",
    color: STITCH.onSurfaceVariant,
    lineHeight: 18,
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
    gap: 10,
    backgroundColor: "rgba(115,92,0,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(115,92,0,0.15)",
    padding: 18,
    marginBottom: 14,
  },
  rewardHeadline: {
    fontSize: 16,
    fontWeight: "800",
    color: STITCH.onSurface,
  },
  rewardPills: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginVertical: 4,
  },
  rewardPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: STITCH.outlineVariant,
  },
  rewardPillChance: {
    borderColor: "rgba(0,91,177,0.3)",
    backgroundColor: "rgba(0,91,177,0.05)",
  },
  rewardPillChanceText: {
    fontSize: 10,
    fontWeight: "700",
    color: STITCH.primary,
    marginLeft: 2,
  },
  rewardPillBonus: {
    borderColor: "rgba(2,132,199,0.35)",
    backgroundColor: "rgba(2,132,199,0.08)",
  },
  rewardPillValue: {
    fontSize: 14,
    fontWeight: "800",
    color: STITCH.onSurface,
  },
  rewardPillLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: STITCH.onSurfaceVariant,
  },
  streakBonusLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f97316",
  },
  claimedCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "rgba(0,91,177,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,91,177,0.18)",
    marginBottom: 14,
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
