import { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import Animated, {
  FadeIn,
  FadeInRight,
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
import { useDailyQuestsStore, previewQuestReward, previewProQuestReward } from "./useDailyQuestsStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { type DailyQuest, QUEST_TEMPLATES } from "./daily-quest-types";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_HELLO, FINN_STANDARD, FINN_DANCING } from "../retention-loops/finnMascotConfig";
import { useSpontaneousDancing } from "../retention-loops/useSpontaneousDancing";
import { heavyHaptic, successHaptic, tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json") as unknown as AnimationObject;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CROWN = require("../../../assets/lottie/Crown.json") as unknown as AnimationObject;

/** Finn-opens-the-chest celebration video, plays after flying rewards complete */
const CHEST_VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-chest-open.mp4";
/** Video is ~5s; leave a small tail for "settle" before auto-closing the modal */
const CHEST_VIDEO_DURATION_MS = 5500;

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
          accessibilityLabel={isDone ? `${titleHe}, הושלם` : `${titleHe}, לחץ לביצוע`}
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
  const proRewardClaimed = useDailyQuestsStore((s) => s.proRewardClaimed);
  const claimReward = useDailyQuestsStore((s) => s.claimReward);
  const claimProReward = useDailyQuestsStore((s) => s.claimProReward);
  const refreshQuests = useDailyQuestsStore((s) => s.refreshQuests);
  const syncQuestCompletions = useDailyQuestsStore((s) => s.syncCompletions);
  const streak = useEconomyStore((s) => s.streak);
  const isPro = useSubscriptionStore((s) => s.isPro());

  // Ensure quests are populated whenever the sheet becomes visible.
  // Safe on every open: refreshQuests is date-idempotent (no-op if already fresh),
  // and syncCompletions picks up any completions since the sheet last rendered.
  useEffect(() => {
    if (!visible) {
      setChestOpen(false);
      setProChestOpen(false);
      return;
    }
    if (quests.length === 0) {
      refreshQuests();
    } else {
      syncQuestCompletions();
    }
  }, [visible, quests.length, refreshQuests, syncQuestCompletions]);

  const preview = previewQuestReward(streak);
  const previewPro = previewProQuestReward(streak);

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
  const [showProClaimAnim, setShowProClaimAnim] = useState(false);
  const [proChestOpen, setProChestOpen] = useState(false);
  /** Finn-opens-the-chest celebration video — plays after flying rewards complete */
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const { playSound } = useSoundEffect();
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proHapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proClaimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chestVideoPlayer = useVideoPlayer(CHEST_VIDEO_URL, (p) => {
    p.loop = false;
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
    };
  });

  useEffect(() => () => {
    if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
    if (claimTimerRef.current) clearTimeout(claimTimerRef.current);
    if (proHapticTimerRef.current) clearTimeout(proHapticTimerRef.current);
    if (proClaimTimerRef.current) clearTimeout(proClaimTimerRef.current);
    if (videoCloseTimerRef.current) clearTimeout(videoCloseTimerRef.current);
  }, []);

  // Reset video overlay if user closes the modal manually (e.g. tap outside)
  // before the auto-close timer fires.
  useEffect(() => {
    if (!visible && showVideoOverlay) {
      setShowVideoOverlay(false);
      if (videoCloseTimerRef.current) {
        clearTimeout(videoCloseTimerRef.current);
        videoCloseTimerRef.current = null;
      }
      try { chestVideoPlayer.pause(); } catch { /* ignore */ }
    }
  }, [visible, showVideoOverlay, chestVideoPlayer]);

  // Gentle pulse on the chest when ready, feels inviting, not shaky.
  // Mirrors the LessonFlowScreen chest-ready pattern: body pulse + glow halo.
  const reduceMotion = useReducedMotion();
  const chestPulse = useSharedValue(1);
  const chestGlowScale = useSharedValue(1);
  const chestGlowOpacity = useSharedValue(0.4);
  useEffect(() => {
    if (!visible || !allDone || (rewardClaimed && proRewardClaimed) || reduceMotion) {
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
      // Chain Finn-opens-chest celebration video, then auto-close back to feed
      setShowVideoOverlay(true);
      try { chestVideoPlayer.play(); } catch { /* ignore */ }
      videoCloseTimerRef.current = setTimeout(() => {
        setShowVideoOverlay(false);
        try { chestVideoPlayer.pause(); } catch { /* ignore */ }
        onClose();
      }, CHEST_VIDEO_DURATION_MS);
    }, 1600);
  };

  const handleClaimPro = () => {
    if (!isPro) {
      tapHaptic();
      onClose();
      router.push('/subscription' as never);
      return;
    }
    if (proRewardClaimed || !allDone || showProClaimAnim) return;
    heavyHaptic();
    playSound('modal_open_4');
    setProChestOpen(true);
    setShowProClaimAnim(true);
    proHapticTimerRef.current = setTimeout(() => successHaptic(), 250);
    proClaimTimerRef.current = setTimeout(() => {
      claimProReward();
      setShowProClaimAnim(false);
    }, 1600);
  };

  // Shark persona + copy, מגיב למצב
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

          {/* Shark hero, presence + coaching */}
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

          {/* Quest rows, each quest is a big glowing button */}
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

          {/* ── Pass Royale dual-chest row ── */}
          <Animated.View entering={FadeIn.delay(400).duration(400)} style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>

              {/* ── PRO chest (left, larger) ── */}
              <View style={{ flex: 13, alignItems: "center" }}>
                <LottieIcon source={LOTTIE_CROWN as unknown as number} size={36} autoPlay={!reduceMotion} loop active={!reduceMotion} />
                <View style={{ backgroundColor: "#b45309", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginTop: 2, marginBottom: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }}>PRO</Text>
                </View>
                <View style={{ position: "relative" }}>
                  {allDone && isPro && !proRewardClaimed && (
                    <Animated.View pointerEvents="none" style={[styles.chestGlowHalo, { backgroundColor: "#d97706" }, chestGlowStyle]} />
                  )}
                  <Animated.View style={isPro && allDone && !proRewardClaimed ? chestPulseStyle : undefined}>
                    <Pressable
                      onPress={handleClaimPro}
                      disabled={proRewardClaimed || showProClaimAnim}
                      accessibilityRole="button"
                      accessibilityLabel={!isPro ? "שדרגו לפרו לפתיחת התיבה" : proRewardClaimed ? "תיבת פרו נפתחה" : allDone ? "לחצו לפתיחת תיבת הפרו" : "תיבת הפרו נעולה"}
                      style={({ pressed }) => [
                        styles.chestWrap,
                        allDone && isPro && !proRewardClaimed && styles.chestWrapReady,
                        { borderColor: "#d97706", opacity: proRewardClaimed ? 0.65 : 1 },
                        pressed && allDone && isPro && !proRewardClaimed && { transform: [{ scale: 0.96 }] },
                      ]}
                    >
                      <LottieIcon source={LOTTIE_CHEST as unknown as number} size={130} autoPlay={false} active={proChestOpen} loop={false} />
                      {!isPro && (
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16 }} accessible={false}>
                          <Text style={{ fontSize: 28 }}>🔒</Text>
                          {allDone && <Text style={{ color: "#fbbf24", fontSize: 10, fontWeight: "800", marginTop: 4 }}>שדרגו לפרו</Text>}
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                </View>
              </View>

              {/* ── Regular chest (right, smaller) ── */}
              <View style={{ flex: 10, alignItems: "center" }}>
                <View style={{ height: 36 }} accessible={false} />
                <View style={{ backgroundColor: "#475569", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginTop: 2, marginBottom: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }}>רגיל</Text>
                </View>
                <View style={{ position: "relative" }}>
                  {allDone && !rewardClaimed && (
                    <Animated.View pointerEvents="none" style={[styles.chestGlowHalo, chestGlowStyle]} />
                  )}
                  <Animated.View style={allDone && !rewardClaimed ? chestPulseStyle : undefined}>
                    <Pressable
                      onPress={handleClaim}
                      disabled={rewardClaimed || showClaimAnim}
                      accessibilityRole="button"
                      accessibilityLabel={rewardClaimed ? "תיבה נפתחה" : allDone ? "לחצו לפתיחת התיבה" : "התיבה נעולה, השלימו את המשימות"}
                      style={({ pressed }) => [
                        styles.chestWrap,
                        allDone && !rewardClaimed && styles.chestWrapReady,
                        { opacity: rewardClaimed ? 0.65 : 1 },
                        pressed && allDone && !rewardClaimed && { transform: [{ scale: 0.96 }] },
                      ]}
                    >
                      <LottieIcon source={LOTTIE_CHEST as unknown as number} size={110} autoPlay={false} active={chestOpen} loop={false} />
                    </Pressable>
                  </Animated.View>
                </View>
              </View>

            </View>
          </Animated.View>

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

          {/* Claim-in-flight celebration overlay, mirrors module-end chest (XP + coins + confetti) */}
          {showClaimAnim && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <ConfettiExplosion />
              <FlyingRewards type="xp" amount={preview.xp} onComplete={() => { /* auto-clear */ }} />
              <FlyingRewards type="coins" amount={preview.coins} onComplete={() => { /* auto-clear */ }} />
            </View>
          )}
          {/* PRO claim overlay */}
          {showProClaimAnim && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <ConfettiExplosion />
              <FlyingRewards type="xp" amount={previewPro.xp} onComplete={() => { /* auto-clear */ }} />
              <FlyingRewards type="coins" amount={previewPro.coins} onComplete={() => { /* auto-clear */ }} />
            </View>
          )}

          {/* Finn-opens-the-chest celebration video — plays after flying rewards complete */}
          {showVideoOverlay && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.videoOverlay]}>
              <VideoView
                player={chestVideoPlayer}
                style={StyleSheet.absoluteFill}
                nativeControls={false}
                contentFit="cover"
              />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Quest card styles, separated so QuestButton stays readable ──────────────
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

  // Quests, list container only; individual quest styles live inline in QuestButton
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
  videoOverlay: {
    backgroundColor: "#0c1426",
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
