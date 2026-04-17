import { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import type { AnimationObject } from "lottie-react-native";
import { Snowflake } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { STITCH } from "../../constants/theme";
import { useDailyQuestsStore, previewQuestReward } from "./useDailyQuestsStore";
import { type DailyQuest } from "./daily-quest-types";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_HELLO, FINN_HAPPY, FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { heavyHaptic, successHaptic, tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json") as unknown as AnimationObject;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_DIAMOND = require("../../../assets/lottie/Diamond.json") as unknown as AnimationObject;

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface DailyQuestsSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Quest button — mirrors FeedStartButton pattern with pulsing glow halo.
// Blue + glow when pending (invites action), bright green when done.
function QuestButton({
  quest,
  index,
  onPress,
}: {
  quest: DailyQuest;
  index: number;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(0);
  const isDone = quest.isCompleted;

  useEffect(() => {
    if (isDone || reduceMotion) {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 200 });
      return;
    }
    glow.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, [isDone, reduceMotion, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + glow.value * 0.5,
    transform: [{ scale: 1 + glow.value * 0.03 }],
  }));

  const haloColor = isDone ? "#22c55e" : "#38bdf8";
  const depthColor = isDone ? "#166534" : "#0369a1";
  const btnColor = isDone ? "#86efac" : "#0ea5e9";
  const borderColor = isDone ? "#16a34a" : "#0284c7";
  const textColor = isDone ? "#14532d" : "#ffffff";

  return (
    <Animated.View
      entering={FadeIn.delay(100 + index * 80).duration(300)}
      style={{ alignSelf: "stretch" }}
    >
      <View style={{ position: "relative", alignItems: "stretch" }}>
        {!isDone && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: -6,
                left: -6,
                right: -6,
                bottom: -6,
                borderRadius: 26,
                backgroundColor: haloColor,
              },
              glowStyle,
            ]}
          />
        )}

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 5,
            left: 0,
            right: 0,
            bottom: -5,
            borderRadius: 20,
            backgroundColor: depthColor,
          }}
        />

        <Pressable
          onPress={onPress}
          disabled={isDone}
          accessibilityRole="button"
          accessibilityLabel={isDone ? `${quest.titleHe} — הושלם` : `${quest.titleHe} — לחץ לביצוע`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
            paddingHorizontal: 20,
            paddingVertical: 16,
            minHeight: 76,
            borderRadius: 20,
            backgroundColor: btnColor,
            borderWidth: 2,
            borderColor: borderColor,
            shadowColor: haloColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
            transform: pressed && !isDone ? [{ translateY: 2 }] : [],
          })}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: "900",
              color: textColor,
              writingDirection: "rtl",
              textAlign: "right",
              letterSpacing: 0.3,
              textShadowColor: isDone ? "transparent" : "rgba(0,0,0,0.25)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
              lineHeight: 24,
              includeFontPadding: false,
              textDecorationLine: isDone ? "line-through" : "none",
              textDecorationColor: "rgba(20,83,45,0.5)",
            }}
            numberOfLines={2}
            allowFontScaling={false}
            selectable={false}
          >
            {quest.titleHe}
          </Text>

          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "#ffffff",
              borderWidth: 2,
              borderColor: borderColor,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            accessible={false}
          >
            {quest.type === "swipe" ? (
              <Text style={{ fontSize: 30, lineHeight: 34 }} accessible={false}>🎮</Text>
            ) : (
              <LottieIcon source={quest.lottieSource} size={40} autoPlay loop={!isDone} />
            )}
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function DailyQuestsSheet({ visible, onClose }: DailyQuestsSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const quests = useDailyQuestsStore((s) => s.quests);
  const completedCount = useDailyQuestsStore((s) => s.completedCount());
  const allDone = useDailyQuestsStore((s) => s.allCompleted());
  const rewardClaimed = useDailyQuestsStore((s) => s.rewardClaimed);
  const lastRewardSummary = useDailyQuestsStore((s) => s.lastRewardSummary);
  const claimReward = useDailyQuestsStore((s) => s.claimReward);
  const refreshQuests = useDailyQuestsStore((s) => s.refreshQuests);
  const syncQuestCompletions = useDailyQuestsStore((s) => s.syncCompletions);
  const streak = useEconomyStore((s) => s.streak);

  // Ensure quests are populated whenever the sheet becomes visible.
  // Safe on every open: refreshQuests is date-idempotent (no-op if already fresh),
  // and syncCompletions picks up any completions since the sheet last rendered.
  useEffect(() => {
    if (!visible) return;
    if (quests.length === 0) {
      refreshQuests();
    } else {
      syncQuestCompletions();
    }
  }, [visible, quests.length, refreshQuests, syncQuestCompletions]);

  const preview = previewQuestReward(streak);
  const summary = rewardClaimed ? lastRewardSummary : null;

  /** Navigate to the feed item that fulfills this quest. */
  const handleQuestPress = (quest: DailyQuest) => {
    if (quest.isCompleted) return; // completed quests are informational only
    tapHaptic();
    onClose();
    // Both swipe + dilemma live in the FinFeed (learn tab); module → learn map
    if (quest.type === "swipe" || quest.type === "dilemma") {
      router.push("/(tabs)/learn" as never);
    } else if (quest.type === "module") {
      router.push("/(tabs)" as never);
    }
  };

  const [showClaimAnim, setShowClaimAnim] = useState(false);
  const { playSound } = useSoundEffect();
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
    if (claimTimerRef.current) clearTimeout(claimTimerRef.current);
  }, []);

  // Gentle pulse on the chest when ready — feels inviting, not shaky.
  // Mirrors the LessonFlowScreen chest-ready pattern: body pulse + glow halo.
  const reduceMotion = useReducedMotion();
  const chestPulse = useSharedValue(1);
  const chestGlowScale = useSharedValue(1);
  const chestGlowOpacity = useSharedValue(0.4);
  useEffect(() => {
    if (!visible || !allDone || rewardClaimed || reduceMotion) {
      cancelAnimation(chestPulse);
      cancelAnimation(chestGlowScale);
      cancelAnimation(chestGlowOpacity);
      chestPulse.value = withTiming(1, { duration: 200 });
      chestGlowScale.value = withTiming(1, { duration: 200 });
      chestGlowOpacity.value = withTiming(0, { duration: 200 });
      return;
    }
    chestPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.98, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    chestGlowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700 }),
        withTiming(1.0, { duration: 700 }),
      ),
      -1,
      false,
    );
    chestGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 700 }),
        withTiming(0.3, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(chestPulse);
      cancelAnimation(chestGlowScale);
      cancelAnimation(chestGlowOpacity);
    };
  }, [visible, allDone, rewardClaimed, reduceMotion, chestPulse, chestGlowScale, chestGlowOpacity]);

  const chestPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestPulse.value }],
  }));
  const chestGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestGlowScale.value }],
    opacity: chestGlowOpacity.value,
  }));

  const handleClaim = () => {
    if (rewardClaimed || !allDone || showClaimAnim) return;
    heavyHaptic();
    playSound('modal_open_4');
    setShowClaimAnim(true);
    hapticTimerRef.current = setTimeout(() => successHaptic(), 250);
    claimTimerRef.current = setTimeout(() => {
      claimReward();
      setShowClaimAnim(false);
    }, 1600);
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
    ? "תחזרו מחר, אני אכין תיבה חדשה"
    : allDone
      ? "סיימתם הכל! לחצו על התיבה והפרס שלכם"
      : completedCount === 0
        ? "אהוי! יש לכם 3 משימות היום. נצא לציד?"
        : `כל הכבוד! עוד ${quests.length - completedCount} ואני אפתח לכם את התיבה`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="סגור משימות יומיות">
        <Pressable style={styles.sheet} onPress={() => {}} accessible={false}>
          {/* Handle */}
          <View style={styles.handle} accessible={false} />

          {/* Shark hero — presence + coaching */}
          <View style={styles.sharkHero}>
            <Animated.View entering={FadeIn.duration(300)} style={styles.sharkAvatarWrap}>
              <ExpoImage source={sharkImage} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
            </Animated.View>
            <Animated.View entering={FadeInRight.delay(120).duration(300)} style={styles.sharkBubbleWrap}>
              <View style={styles.sharkBubbleTail} accessible={false} pointerEvents="none" />
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

          {/* Quest rows — each quest is a big glowing button */}
          <View style={styles.questList}>
            {quests.map((quest, i) => (
              <QuestButton
                key={quest.id}
                quest={quest}
                index={i}
                onPress={() => handleQuestPress(quest)}
              />
            ))}
          </View>

          {/* Reward card — tappable chest when ready */}
          {!rewardClaimed && (
            <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.rewardCard}>
              <View style={styles.chestContainer}>
                {allDone && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.chestGlowHalo, chestGlowStyle]}
                  />
                )}
                <Animated.View style={chestPulseStyle}>
                  <Pressable
                    onPress={handleClaim}
                    disabled={!allDone || showClaimAnim}
                    accessibilityRole="button"
                    accessibilityLabel={allDone ? "לחצו לפתיחת התיבה ואיסוף הפרס" : "התיבה עדיין נעולה — השלימו את המשימות"}
                    style={({ pressed }) => [
                      styles.chestWrap,
                      allDone && styles.chestWrapReady,
                      pressed && allDone && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <LottieIcon source={LOTTIE_CHEST as unknown as number} size={140} autoPlay={allDone} loop={allDone} />
                  </Pressable>
                </Animated.View>
              </View>

              <Text style={[styles.rewardHeadline, RTL]}>
                {allDone ? "התיבה מוכנה — לחצו לפתיחה!" : "מה מחכה בתיבה?"}
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
                  <LottieIcon source={LOTTIE_DIAMOND as unknown as number} size={18} autoPlay loop />
                  <Text style={styles.rewardPillChanceText}>?</Text>
                </View>
                {preview.freezes > 0 && (
                  <View style={[styles.rewardPill, styles.rewardPillBonus]}>
                    <Snowflake size={14} color="#0284c7" />
                    <Text style={styles.rewardPillValue}>+1</Text>
                  </View>
                )}
              </View>

              {preview.streakBonusPct > 0 && (
                <View style={styles.streakBonusPill}>
                  <Text style={[styles.streakBonusLabel, RTL]}>
                    בונוס רצף: +{preview.streakBonusPct}%
                  </Text>
                </View>
              )}

              {!allDone && (
                <Text style={[styles.hintText, RTL]}>
                  השלימו את כל המשימות כדי לפתוח את התיבה
                </Text>
              )}
            </Animated.View>
          )}

          {rewardClaimed && (
            <Animated.View entering={FadeInUp.duration(420).easing(Easing.out(Easing.cubic))} style={{ alignItems: "center", marginBottom: 20 }}>
              <LottieIcon source={LOTTIE_CHEST as unknown as number} size={180} autoPlay loop={false} />
            </Animated.View>
          )}

          {/* Claim-in-flight celebration overlay — mirrors module-end chest (XP + coins + confetti) */}
          {showClaimAnim && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <ConfettiExplosion />
              <FlyingRewards type="xp" amount={preview.xp} onComplete={() => { /* auto-clear */ }} />
              <FlyingRewards type="coins" amount={preview.coins} onComplete={() => { /* auto-clear */ }} />
            </View>
          )}

          {/* Close */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.85, transform: [{ translateY: 1 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40, // More bottom padding to prevent cutoff
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
    backgroundColor: "rgba(156,206,230,0.08)", // primaryCyan @ 8%
    borderWidth: 1.5,
    borderColor: "rgba(156,206,230,0.25)", // primaryCyan @ 25%
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
    fontSize: 14,
    fontWeight: "700",
    color: STITCH.onSurface,
    lineHeight: 20,
    includeFontPadding: false,
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
    fontSize: 13,
    fontWeight: "800",
    color: STITCH.onSurface,
    marginBottom: 16,
  },

  // Quests — list container only; individual quest styles live inline in QuestButton
  questList: {
    gap: 12,
    marginBottom: 18,
  },

  // Reward
  rewardCard: {
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(250,204,21,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.3)",
    padding: 20,
    marginBottom: 14,
  },
  chestContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
  },
  chestGlowHalo: {
    position: "absolute",
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(245,158,11,0.12)",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.5,
  },
  chestWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  chestWrapReady: {
    shadowColor: STITCH.tertiaryGoldBright,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  rewardHeadline: {
    fontSize: 17,
    fontWeight: "900",
    color: STITCH.onSurface,
    textAlign: "center",
    writingDirection: "rtl",
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: STITCH.tertiaryGold,
    textAlign: "center",
    writingDirection: "rtl",
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
    borderColor: "rgba(156,206,230,0.3)", // primaryCyan
    backgroundColor: "rgba(156,206,230,0.05)",
  },
  rewardPillChanceText: {
    fontSize: 10,
    fontWeight: "700",
    color: STITCH.primary,
    marginLeft: 2,
  },
  rewardPillBonus: {
    borderColor: "rgba(195,192,255,0.4)", // secondaryPurple
    backgroundColor: "rgba(195,192,255,0.1)",
  },
  rewardPillValue: {
    fontSize: 14,
    fontWeight: "800",
    color: STITCH.onSurface,
  },
  rewardPillLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  streakBonusPill: {
    alignSelf: "center",
    backgroundColor: STITCH.tertiaryGoldLight,
    borderWidth: 1,
    borderColor: STITCH.tertiaryGoldBright,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  streakBonusLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: STITCH.tertiaryGold,
    includeFontPadding: false,
  },
  claimedCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "rgba(156,206,230,0.06)", // primaryCyan
    borderWidth: 1,
    borderColor: "rgba(156,206,230,0.18)",
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
    fontSize: 14,
    fontWeight: "800",
    color: STITCH.onSurfaceVariant,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 2,
  },
  closeBtn: {
    alignSelf: "stretch",
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: STITCH.surfaceVariant,
    borderWidth: 1.5,
    borderColor: STITCH.ghostBorder,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginBottom: 8,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "center",
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
});
