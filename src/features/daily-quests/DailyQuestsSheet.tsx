import { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { STITCH } from "../../constants/theme";
import { useDailyQuestsStore, previewQuestReward } from "./useDailyQuestsStore";
import { type DailyQuest, QUEST_TEMPLATES } from "./daily-quest-types";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_HELLO, FINN_STANDARD, FINN_DANCING } from "../retention-loops/finnMascotConfig";
import { useSpontaneousDancing } from "../retention-loops/useSpontaneousDancing";
import { heavyHaptic, successHaptic, tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json") as unknown as AnimationObject;

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface DailyQuestsSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Safety fallback for users with old AsyncStorage quests that lack the string fields
function getQuestCopy(quest: DailyQuest) {
  if (quest.titleHe) return { titleHe: quest.titleHe, descriptionHe: quest.descriptionHe };
  const template = QUEST_TEMPLATES.find(t => t.type === quest.type);
  return {
    titleHe: template?.titleHe || "משימה יומית",
    descriptionHe: template?.descriptionHe || "",
  };
}

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

  const { titleHe, descriptionHe } = getQuestCopy(quest);

  return (
    <Animated.View
      entering={FadeIn.delay(100 + index * 80).duration(300)}
      style={{ alignSelf: "stretch", marginBottom: 12 }}
    >
      <View style={{ position: "relative", alignItems: "stretch" }}>
        {/* Glow Halo - Placed precisely behind */}
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
                backgroundColor: STITCH.primaryCyan,
                zIndex: -1,
              },
              glowStyle,
            ]}
          />
        )}

        {/* Card uses native Flexbox row-reverse so elements flow natively RTL */}
        <Pressable
          onPress={onPress}
          disabled={isDone}
          accessibilityRole="button"
          accessibilityLabel={isDone ? `${titleHe} — הושלם` : `${titleHe} — לחץ לביצוע`}
          style={({ pressed }) => [
            questStyles.card,
            isDone ? questStyles.cardDone : questStyles.cardPending,
            pressed && !isDone && questStyles.cardPressed,
          ]}
        >
          {/* Rigid side-by-side flex layout to ban Android wrap stacking entirely */}
          <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
            
            {/* Child 1: TEXT CONTENT (Visually RIGHT due to row-reverse) */}
            <View
              style={[
                questStyles.textCol,
                isDone && questStyles.textColDone,
                { flex: 1, paddingRight: 4 } // Force standard RTL bounding and flex explicitly
              ]}
            >
              <Text 
                numberOfLines={2} 
                adjustsFontSizeToFit 
                style={[questStyles.titleText, isDone && questStyles.titleTextDone]}
              >
                {titleHe}
              </Text>
              {!!descriptionHe && (
                <Text 
                  numberOfLines={2} 
                  adjustsFontSizeToFit 
                  style={[questStyles.descText, isDone && questStyles.descTextDone, { marginTop: 2 }]}
                >
                  {descriptionHe}
                </Text>
              )}
            </View>

            {/* Child 2: LOTTIE (Visually LEFT due to row-reverse) */}
            <View style={[questStyles.iconWrap, isDone && questStyles.iconWrapDone, { marginLeft: 12, marginRight: 0 }]} accessible={false}>
              <LottieIcon source={quest.lottieSource} size={36} autoPlay loop={!isDone} />
            </View>

          </View>

          {/* Child 3: CHECKMARK (Absolutely positioned left to prevent any flex interference) */}
          {isDone && (
            <View style={{ position: "absolute", left: 16 }}>
              <Text style={questStyles.checkmark}>✓</Text>
            </View>
          )}
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
  const claimReward = useDailyQuestsStore((s) => s.claimReward);
  const refreshQuests = useDailyQuestsStore((s) => s.refreshQuests);
  const syncQuestCompletions = useDailyQuestsStore((s) => s.syncCompletions);
  const streak = useEconomyStore((s) => s.streak);

  // Ensure quests are populated whenever the sheet becomes visible.
  // Safe on every open: refreshQuests is date-idempotent (no-op if already fresh),
  // and syncCompletions picks up any completions since the sheet last rendered.
  useEffect(() => {
    if (!visible) {
      setChestOpen(false);
      return;
    }
    if (quests.length === 0) {
      refreshQuests();
    } else {
      syncQuestCompletions();
    }
  }, [visible, quests.length, refreshQuests, syncQuestCompletions]);

  const preview = previewQuestReward(streak);

  /** Navigate to the feed item that fulfills this quest. */
  const handleQuestPress = (quest: DailyQuest) => {
    if (quest.isCompleted) return; // completed quests are informational only
    tapHaptic();
    onClose();
    // Both swipe + dilemma live in the FinFeed (learn tab); module → learn map
    if (quest.type === "swipe" || quest.type === "dilemma") {
      import('../finfeed/FinFeedScreen').then(({ setPendingFeedScrollById }) => {
        setPendingFeedScrollById(quest.type === "swipe" ? "swipe-game" : "daily-dilemma");
        router.push("/(tabs)/learn" as never);
      });
    } else if (quest.type === "module") {
      router.push("/(tabs)" as never);
    }
  };

  const [showClaimAnim, setShowClaimAnim] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
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
    setChestOpen(true);
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
  const spiceWithDancing = useSpontaneousDancing(0.15, 'quests-standard');
  const sharkImage =
    sharkState === "happy"
      ? FINN_DANCING
      : sharkState === "hello"
        ? FINN_HELLO
        : spiceWithDancing
          ? FINN_DANCING
          : FINN_STANDARD;
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
        <Pressable style={[styles.sheet]} onPress={() => {}} accessible={false}>
          {/* Handle fixed at top */}
          <View style={styles.handle} accessible={false} />

          {/* Scrollable content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >

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
                    <LottieIcon source={LOTTIE_CHEST as unknown as number} size={140} autoPlay={false} active={chestOpen} loop={false} />
                  </Pressable>
                </Animated.View>
              </View>

              {!allDone ? (
                <Text style={[styles.hintText, { marginTop: -10 }]}>
                  השלימו את כל המשימות כדי לפתוח את התיבה
                </Text>
              ) : (
                <Text style={styles.rewardHeadline}>
                  התיבה מוכנה — לחצו לפתיחה!
                </Text>
              )}
            </Animated.View>
          )}

          {rewardClaimed && (
            <Animated.View entering={FadeInUp.duration(420).easing(Easing.out(Easing.cubic))} style={{ alignItems: "center", marginBottom: 20 }}>
              <LottieIcon source={LOTTIE_CHEST as unknown as number} size={180} autoPlay loop={false} />
            </Animated.View>
          )}

          </ScrollView>

          {/* Close button pinned at bottom outside scroll */}
          <View style={{ paddingTop: 10, paddingBottom: Math.max(8, insets.bottom) }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.85, transform: [{ translateY: 1 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="סגור"
              hitSlop={12}
            >
              <Text style={styles.closeBtnText}>סגור</Text>
            </Pressable>
          </View>

          {/* Claim-in-flight celebration overlay — mirrors module-end chest (XP + coins + confetti) */}
          {showClaimAnim && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <ConfettiExplosion />
              <FlyingRewards type="xp" amount={preview.xp} onComplete={() => { /* auto-clear */ }} />
              <FlyingRewards type="coins" amount={preview.coins} onComplete={() => { /* auto-clear */ }} />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Quest card styles — separated so QuestButton stays readable ──────────────
const questStyles = StyleSheet.create({
  card: {
    flexDirection: "row-reverse", // RTL logic directly on Pressable
    alignItems: "stretch", // Stretch children vertically so the Green Pill matches the button height internally
    justifyContent: "flex-start",
    width: "100%",
    minHeight: 84, // Uniform identical base vertical bounds!
    borderRadius: 20,
    backgroundColor: STITCH.surfaceLowest,
    borderWidth: 2,
    borderColor: STITCH.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardPending: {
    borderBottomWidth: 6,
    borderBottomColor: STITCH.surfaceVariant,
    shadowColor: STITCH.primaryCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDone: {
    borderColor: "#86efac",
    borderBottomWidth: 6, // Keep physical dimensions identical to pending!
    borderBottomColor: "#4ade80",
    shadowColor: "transparent",
    elevation: 0,
  },
  cardPressed: {
    transform: [{ translateY: 4 }],
    opacity: 0.9,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: STITCH.surfaceLow,
    borderWidth: 2,
    borderColor: STITCH.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14, // Exact fixed margin
    alignSelf: "center", // Override stretch context from parent
    flexShrink: 0,
  },
  iconWrapDone: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  iconEmoji: {
    fontSize: 24,
    includeFontPadding: false,
  },
  textCol: {
    flexShrink: 1, // Shrinks to fit text, allowing Lottie to hug it tightly
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  textColDone: {
    backgroundColor: "#dcfce7",
    borderWidth: 2,
    borderColor: "#4ade80",
    paddingVertical: 6, // slight offset for border
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: 14, // reduced from 15
    fontWeight: "700",
    color: STITCH.onSurface,
    textAlign: "right",
    writingDirection: "rtl",
  },
  titleTextDone: {
    color: "#15803d",
  },
  descText: {
    fontSize: 11, // reduced from 12
    fontWeight: "500",
    color: STITCH.onSurfaceVariant,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 16,
  },
  descTextDone: {
    color: "#16a34a",
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16a34a",
    flexShrink: 0,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    flex: 1,
    backgroundColor: STITCH.surfaceLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: "92%",
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
    alignItems: "flex-end", // Right-to-left fill
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
    color: "#16a34a",
    textAlign: "center",
    writingDirection: "rtl",
  },
  hintText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 20,
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
