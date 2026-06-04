import { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
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
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { STITCH } from "../../constants/theme";
import { useDailyQuestsStore, previewQuestReward, previewProQuestReward } from "./useDailyQuestsStore";
import { useIsPro } from "../subscription/useSubscription";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { type DailyQuest, QUEST_TEMPLATES } from "./daily-quest-types";
import { useStreak } from "../economy/useStreak";
import { FINN_HELLO, FINN_STANDARD, FINN_DANCING } from "../retention-loops/finnMascotConfig";
import { useSpontaneousDancing } from "../retention-loops/useSpontaneousDancing";
import { heavyHaptic, successHaptic, tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { captureEvent } from "../../lib/posthog";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json") as unknown as AnimationObject;
// Pro mark animation (same lottie used by ProfileScreen's upgrade banner) —
// rendered inside the wide PRO upsell banner below the chest row.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOTTIE_PRO_ANIM = require("../../../assets/lottie/Pro Animation 3rd.json") as unknown as AnimationObject;
// PRO chest art, bespoke PNG (Yam, 2026-06-03). Replaces the generic
// "3D Treasure Box" Lottie for the PRO card so the visual tells the
// value story: open chest, coins + bills inside, gold trim, built-in
// PRO tag.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PRO_CHEST_PNG = require("../../../assets/chests/pro-chest.png");

/** Finn-opens-the-chest celebration video, plays after flying rewards complete */
const CHEST_VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-chest-open.mp4";
/** Video is ~5s; leave a small tail for "settle" before auto-closing the modal */
const CHEST_VIDEO_DURATION_MS = 5500;

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface DailyQuestsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Opens the Daily News Challenge sheet. Wired by the host screen (DuoLearn)
   *  so the news quest can launch the existing news flow without a route. */
  onOpenNewsChallenge?: () => void;
  /** Opens the BullshitSwipe quest as a modal. Replaces the broken
   *  /quest/swipe-game route after the Feed deletion (2026-05-30). */
  onOpenSwipeQuest?: () => void;
  /** Opens the daily-dilemma quest as a modal. Replaces /quest/daily-dilemma. */
  onOpenDilemmaQuest?: () => void;
  /** Navigates to the user's next-up module (the first non-completed,
   *  non-coming-soon, non-PRO-locked module across all chapters). Wired
   *  by DuoLearnScreen which already has the chapter unlock state to
   *  compute it. Falls back to /(tabs) if no callback is supplied. */
  onOpenModuleQuest?: () => void;
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
  // News allows redo even after completion (re-experience the content;
  // store guards prevent double payout / double analytics).
  const allowRedo = quest.type === "news";

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
          disabled={isDone && !allowRedo}
          accessibilityRole="button"
          accessibilityLabel={
            isDone
              ? allowRedo
                ? `${titleHe}, הושלם — לחץ לבצע שוב`
                : `${titleHe}, הושלם`
              : `${titleHe}, לחץ לביצוע`
          }
          style={({ pressed }) => [
            questStyles.card,
            isDone ? questStyles.cardDone : questStyles.cardPending,
            pressed && (!isDone || allowRedo) && questStyles.cardPressed,
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
                  {isDone && allowRedo ? "סיימת היום — לחץ לבצע שוב 🔄" : descriptionHe}
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

export function DailyQuestsSheet({ visible, onClose, onOpenNewsChallenge, onOpenSwipeQuest, onOpenDilemmaQuest, onOpenModuleQuest }: DailyQuestsSheetProps) {
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
  const { data: streakData } = useStreak();
  const streak = streakData?.currentStreak ?? 0;
  const isPro = useIsPro();
  const showUpgrade = useUpgradeModalStore((s) => s.show);

  // Ensure quests are populated whenever the sheet becomes visible.
  // Safe on every open: refreshQuests is date-idempotent (no-op if already fresh),
  // and syncCompletions picks up any completions since the sheet last rendered.
  useEffect(() => {
    if (!visible) {
      setChestOpen(false);
      setProChestOpen(false);
      return;
    }
    // refreshQuests is idempotent on same-day, and now also tops up the
    // quest list if the order grew (e.g. 'news' was added mid-day). Calling
    // it on every open is safe and guarantees the latest order is in state.
    refreshQuests();
    // Fire after the sync above so completedCount reflects today's state.
    // Lets us measure: open rate, completion-at-open rate, and which quests
    // are still pending when the user enters the sheet.
    try {
      const state = useDailyQuestsStore.getState();
      captureEvent('daily_quests_modal_opened', {
        quest_count: state.quests.length,
        completed_count: state.completedCount(),
        pending_quest_types: state.quests.filter((q) => !q.isCompleted).map((q) => q.type),
        streak,
        is_pro: isPro,
        reward_claimed: state.rewardClaimed,
        pro_reward_claimed: state.proRewardClaimed,
      });
    } catch { /* non-fatal */ }
  }, [visible, refreshQuests, streak, isPro]);

  const preview = previewQuestReward(streak);
  const previewPro = previewProQuestReward(streak);

  /** Navigate to the feed item that fulfills this quest. */
  const handleQuestPress = (quest: DailyQuest) => {
    // News allows redo even after completion; all other completed quests are
    // informational only (re-doing them is a no-op + would feel like a dead end).
    if (quest.isCompleted && quest.type !== "news") return;
    tapHaptic();
    playSound('btn_click_soft_2');
    captureEvent('daily_quest_clicked', {
      quest_type: quest.type,
      quest_id: quest.id,
    });
    onClose();
    // Post-Feed-deletion architecture (2026-05-30): swipe/dilemma/news each
    // open as a Modal hosted by DuoLearnScreen via callbacks, replacing the
    // broken /quest/* routes. Only the "module" quest still uses router.push
    // because it sends the user back to the learn tab, not to a card.
    //
    // The handoff runs after the Modal close animation begins. On iOS,
    // opening a Modal WHILE this one dismisses can abort the dismiss + leave
    // the sheet visible underneath the new modal. Defer by one slide (~280ms).
    // Stored in a ref so the unmount cleanup can cancel it before it fires
    // (prevents a chained sheet from popping after the user closes this one).
    const defer = (fn: () => void) => {
      if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
      handoffTimerRef.current = setTimeout(() => {
        handoffTimerRef.current = null;
        fn();
      }, 280);
    };
    if (quest.type === "swipe") {
      defer(() => onOpenSwipeQuest?.());
    } else if (quest.type === "dilemma") {
      defer(() => onOpenDilemmaQuest?.());
    } else if (quest.type === "module") {
      // Prefer the host-provided callback so DuoLearnScreen can route
      // straight to the user's next unfinished module. Falls back to the
      // learn-tab landing if no callback was supplied (e.g. the sheet was
      // mounted from a non-DuoLearn host).
      defer(() => (onOpenModuleQuest ? onOpenModuleQuest() : router.push("/(tabs)" as never)));
    } else if (quest.type === "news") {
      defer(() => onOpenNewsChallenge?.());
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
  // Holds the 280ms quest-handoff timer so it can be cancelled on unmount —
  // otherwise a user who taps a quest and immediately closes the sheet
  // would see the chained DNC/swipe/dilemma sheet pop "out of nowhere"
  // after the close animation (QA audit 2026-05-31).
  const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
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

  // Pulsing gold border for the PRO upgrade banner — mirrors the
  // ProfileScreen pattern so the banner reads as the same surface across
  // contexts. Only animated when the sheet is visible to avoid a stray
  // background animation while the modal is closed.
  const proBannerBorderOpacity = useSharedValue(0.4);
  useEffect(() => {
    if (!visible || isPro || reduceMotion) {
      cancelAnimation(proBannerBorderOpacity);
      proBannerBorderOpacity.value = withTiming(0.4, { duration: 200 });
      return;
    }
    proBannerBorderOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => { cancelAnimation(proBannerBorderOpacity); };
  }, [visible, isPro, reduceMotion, proBannerBorderOpacity]);
  const proBannerBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(250,204,21,${proBannerBorderOpacity.value})`,
    shadowOpacity: proBannerBorderOpacity.value * 0.5,
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
      // Free user tap on the locked PRO chest. Route straight to the
      // /pricing screen — the previous showUpgrade('breaking-news') modal
      // pattern competed with the onClose() of this sheet and the user
      // observed "it goes to the next module instead of pricing" (2026-06-03).
      // /pricing matches every other Pro CTA across the app (ProfileScreen,
      // AIInsights, MacroEvent, MythFeed) so the upgrade flow stays
      // consistent regardless of entry point.
      tapHaptic();
      // 2026-06-03: capture explicit click on the daily-quests PRO surface
      // so we can measure interest separately from /pricing page visits
      // (which aggregate clicks from every other CTA in the app). Lets us
      // answer "is the daily chest a real conversion driver, or just
      // decoration?". Pair with daily_quests_modal_opened impression event
      // for click-through rate.
      captureEvent('daily_quests_pro_upgrade_clicked', {
        source: 'daily_chest_pro',
        completed_count: completedCount,
        all_done: allDone,
        streak,
        is_pro: false,
      });
      onClose();
      router.push('/pricing?source=daily_chest_pro' as never);
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
        ? `אהוי! יש לכם ${quests.length} משימות היום. נצא לציד?`
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

          {/* ── Pass Royale dual-chest row (2026-06-03 redesign) ── */}
          {/* Yam sent a reference: a CARD-based layout with a headline
              explaining the value, then two cards side-by-side. PRO card
              is highlighted (gold border + sparkles), reward icons sit
              under each chest as small labels (not win-state chips),
              optional orange CTA at the bottom of the PRO card for free
              users. The headline does the heavy lifting on telling the
              story; the cards show the proof. */}
          <Animated.View entering={FadeIn.delay(400).duration(400)} style={chestCardStyles.section}>
            {/* Two Text rows so the Hebrew title breaks cleanly after
                "היומיים" rather than letting RN wrap "תיבה" to its own
                orphaned line (Yam, 2026-06-03 LAN: "אנחנו רוצים להימנע
                ממילאי תאומה בעברית"). */}
            <Text style={chestCardStyles.sectionTitle} allowFontScaling={false}>
              השלימו את כל האתגרים היומיים
            </Text>
            <Text style={chestCardStyles.sectionTitle} allowFontScaling={false}>
              וקבלו תיבה
            </Text>

            <View style={chestCardStyles.row}>
              {/* ── Regular card (visual left in RTL row-reverse) ── */}
              <Pressable
                onPress={handleClaim}
                disabled={rewardClaimed || showClaimAnim || !allDone}
                accessibilityRole="button"
                accessibilityLabel={rewardClaimed ? "תיבה רגילה נפתחה" : allDone ? `לחצו לפתיחת תיבה רגילה. בפנים: ${preview.coins} מטבעות` : "התיבה הרגילה נעולה"}
                style={({ pressed }) => [
                  chestCardStyles.card,
                  chestCardStyles.cardRegular,
                  rewardClaimed && chestCardStyles.cardClaimed,
                  pressed && allDone && !rewardClaimed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={chestCardStyles.chestArt}>
                  {allDone && !rewardClaimed && (
                    <Animated.View pointerEvents="none" style={[styles.chestGlowHalo, chestGlowStyle]} />
                  )}
                  <Animated.View style={allDone && !rewardClaimed ? chestPulseStyle : undefined}>
                    <LottieIcon source={LOTTIE_CHEST as unknown as number} size={220} autoPlay={false} active={chestOpen} loop={false} />
                  </Animated.View>
                  {/* "רגיל" sticker sits on top of the chest art (user request
                      2026-06-04) — was previously a corner pill, now an
                      overlay so the eye reads "this chest = רגיל" without
                      having to scan the corner. */}
                  <View style={chestCardStyles.stickerOnChest} pointerEvents="none">
                    <Text style={chestCardStyles.stickerText} allowFontScaling={false}>רגיל</Text>
                  </View>
                </View>
                <View style={chestCardStyles.rewardsRow}>
                  <GoldCoinIcon size={18} />
                  <Text style={chestCardStyles.rewardValue} allowFontScaling={false}>{preview.coins}</Text>
                  <Text style={chestCardStyles.rewardLabel} allowFontScaling={false}>מטבעות</Text>
                </View>
              </Pressable>

              {/* ── PRO card (visual right in RTL row-reverse) ── */}
              <Pressable
                onPress={handleClaimPro}
                disabled={proRewardClaimed || showProClaimAnim || (isPro && !allDone)}
                accessibilityRole="button"
                accessibilityLabel={!isPro ? `תיבת PRO נעולה. בפנים: ${previewPro.coins} מטבעות ו-${previewPro.gems} יהלומים. לחץ לשדרג` : proRewardClaimed ? "תיבת פרו נפתחה" : allDone ? "לחצו לפתיחת תיבת הפרו" : "תיבת הפרו נעולה"}
                style={({ pressed }) => [
                  chestCardStyles.card,
                  chestCardStyles.cardPro,
                  proRewardClaimed && chestCardStyles.cardClaimed,
                  pressed && (!isPro || (allDone && !proRewardClaimed)) && { transform: [{ scale: 0.98 }] },
                ]}
              >
                {/* PRO users get a static "PRO" pill (top-right). Non-PRO
                    users get no in-card badge — the upgrade prompt now lives
                    as a wide banner BELOW both cards (user request
                    2026-06-04), matching the ProfileScreen pattern. */}
                {isPro && (
                  <View style={[chestCardStyles.tag, chestCardStyles.tagPro]}>
                    <Text style={[chestCardStyles.tagText, chestCardStyles.tagTextPro]} allowFontScaling={false}>PRO</Text>
                  </View>
                )}
                <View style={chestCardStyles.chestArtPro}>
                  {allDone && isPro && !proRewardClaimed && (
                    <Animated.View pointerEvents="none" style={[styles.chestGlowHalo, { backgroundColor: "#1d4ed8" }, chestGlowStyle]} />
                  )}
                  {/* PRO PNG at 180×270 — matches the source asset's 2:3
                      aspect ratio (1024×1536) so contentFit:contain has no
                      letterbox padding to manage, and the box fits cleanly
                      inside the ~150px card width with only ~15px overflow
                      each side (which is the PNG's transparent margin, not
                      chest body — safe to clip via card overflow:hidden).
                      Previously 300×300 with 50px overflow each side was
                      cropping the chest's gold trim (יפיופי 2026-06-05). */}
                  <Animated.View style={isPro && allDone && !proRewardClaimed ? chestPulseStyle : undefined}>
                    <ExpoImage
                      source={PRO_CHEST_PNG}
                      style={{ width: 180, height: 270 }}
                      contentFit="contain"
                      accessible={false}
                    />
                  </Animated.View>
                </View>
                {/* Coins + gems unified to a single row so the PRO card's
                    rewards block matches the regular card's height —
                    יפיופי 2026-06-05 flagged the two-row PRO vs one-row
                    regular as breaking visual rhythm under the chests.
                    Mirror the row pattern: icon → value → label → "+" →
                    icon → value → label. */}
                <View style={chestCardStyles.rewardsRow}>
                  <GoldCoinIcon size={18} />
                  <Text style={chestCardStyles.rewardValue} allowFontScaling={false}>{previewPro.coins}</Text>
                  <Text style={chestCardStyles.rewardPlus} allowFontScaling={false}>+</Text>
                  <Text style={chestCardStyles.rewardIcon} allowFontScaling={false}>💎</Text>
                  <Text style={chestCardStyles.rewardValue} allowFontScaling={false}>{previewPro.gems}</Text>
                </View>
              </Pressable>
            </View>

            {/* Wide PRO upgrade banner — mirrors the gold-bordered, dark
                gradient ProfileScreen banner so the conversion CTA looks
                like a first-class surface, not an in-card afterthought. Only
                shown to non-PRO users (PRO users already see the static PRO
                pill on the chest card). Sits BELOW the chest row at full
                section width per user direction 2026-06-04. */}
            {!isPro && (
              <Pressable
                onPress={() => { tapHaptic(); router.push('/pricing?source=daily_chest_pro' as never); }}
                accessibilityRole="button"
                accessibilityLabel="שדרג ל-PRO"
                // marginHorizontal: -40 negates the sheet's paddingHorizontal: 24
                // and the section's paddingHorizontal: 16 so the banner reaches
                // edge-to-edge of the modal (user request 2026-06-04: "ימלא
                // את המסך מימין לשמאל"). Keeps the rounded corners 16 so it
                // still reads as a discrete card, not a sheet-bottom plate.
                // marginTop now 20 (was 32) — after the PRO rewards row was
                // consolidated from 2 rows → 1 row, the extra clearance is
                // no longer needed (יפיופי 2026-06-05).
                style={({ pressed }) => [{ marginTop: 20, marginHorizontal: -40 }, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}
              >
                <Animated.View style={[chestCardStyles.proBanner, proBannerBorderStyle]}>
                  <LinearGradient
                    colors={["#0a2540", "#164e63", "#0a2540"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 16, overflow: "hidden" }}
                  >
                    {["✦", "✦", "✦", "✦", "✦"].map((s, i) => (
                      <Text
                        key={i}
                        style={{
                          position: "absolute",
                          color: i % 2 === 0 ? "#facc15" : "#67e8f9",
                          fontSize: i === 2 ? 10 : 7,
                          opacity: 0.6,
                          top: [8, 16, 6, 22, 12][i],
                          left: [12, 60, 130, 200, 260][i],
                        }}
                      >{s}</Text>
                    ))}
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 48, height: 48, overflow: "hidden", borderRadius: 14, backgroundColor: "rgba(14,116,144,0.3)", borderWidth: 1, borderColor: "rgba(103,232,249,0.5)", alignItems: "center", justifyContent: "center" }} accessible={false}>
                          <LottieIcon source={LOTTIE_PRO_ANIM as unknown as number} size={40} autoPlay loop active={!reduceMotion} />
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#facc15", textTransform: "uppercase" }}>
                            שדרגו ל-PRO
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff", marginTop: 2 }}>
                            לבבות אינסופיים + בוסט XP
                          </Text>
                          <Text style={{ fontSize: 11, color: "rgba(103,232,249,0.8)", marginTop: 2 }}>
                            ✦ ללא הגבלות ✦ בלעדי לחברים ✦
                          </Text>
                        </View>
                      </View>
                      <View style={{ borderRadius: 20, backgroundColor: "rgba(250,204,21,0.15)", borderWidth: 1.5, borderColor: "rgba(250,204,21,0.5)", paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: "#facc15" }}>PRO</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            )}
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

          {/* Finn-opens-the-chest celebration video — plays after flying
              rewards complete. Wrapped in its own Modal so it covers the
              ENTIRE screen (not just the daily-quests sheet, which is a
              bottom sheet capped at 92% height). Any tap on the overlay
              skips the video and returns to the main screen — the 5.5s
              auto-close still fires as a fallback. */}
          {showVideoOverlay && (
            <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {
              if (videoCloseTimerRef.current) { clearTimeout(videoCloseTimerRef.current); videoCloseTimerRef.current = null; }
              setShowVideoOverlay(false);
              try { chestVideoPlayer.pause(); } catch { /* ignore */ }
              onClose();
            }}>
              <View style={[StyleSheet.absoluteFill, styles.videoOverlay]}>
                <VideoView
                  player={chestVideoPlayer}
                  style={StyleSheet.absoluteFill}
                  nativeControls={false}
                  contentFit="cover"
                />
                {/* Pressable sits AFTER VideoView in the tree so it renders
                    above it and captures taps anywhere on the screen. */}
                <Pressable
                  onPress={() => {
                    if (videoCloseTimerRef.current) { clearTimeout(videoCloseTimerRef.current); videoCloseTimerRef.current = null; }
                    setShowVideoOverlay(false);
                    try { chestVideoPlayer.pause(); } catch { /* ignore */ }
                    onClose();
                  }}
                  style={StyleSheet.absoluteFill}
                  accessibilityRole="button"
                  accessibilityLabel="דלג"
                />
              </View>
            </Modal>
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

  // Quests, list container only; individual quest styles live inline in QuestButton.
  // paddingHorizontal: 8 reserves space for the glow halo on each card, which extends
  // 6px outside the card's bounding box (see QuestButton glow style). Without this
  // padding the ScrollView's implicit overflow clipping cuts off the halo on both
  // edges, making the cards look unfinished (QA 2026-06-02).
  questList: {
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 8,
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

// Dual-chest card layout (2026-06-03). Replaces the bare chest sprites with
// two side-by-side cards: a headline explains the value, each card carries
// a tag + title + chest art + reward icons, and the PRO card adds an orange
// upsell strip for free users. Pattern matches Yam's reference: clear value
// prop at top, side-by-side cards, the PRO one visibly premium.
const chestCardStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "center",
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: "600",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "center",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "stretch",
  },
  card: {
    borderRadius: 18,
    // paddingTop trimmed 32→20 after the "תיבה רגילה" / "תיבת PRO" titles
    // were removed (user request 2026-06-05). Still leaves clearance for
    // the absolute "PRO" tag chip that PRO users see in the top-right.
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    position: "relative",
    overflow: "hidden",
  },
  cardRegular: {
    flex: 1,
    backgroundColor: STITCH.surfaceLow,
    borderColor: STITCH.surfaceHighest,
  },
  cardPro: {
    // Equal width with the regular card (both flex 1) — user request
    // 2026-06-04: "חצי חצי, לא שהפרו הרבה יותר גדול". PRO still reads as
    // premium via the deep-blue palette, crown, border + shadow — not size.
    // Palette: deep blue to match every other "שדרגו לפרו" surface in the
    // app (ProfileScreen, AIInsights, MacroEvent, MythFeed).
    flex: 1,
    backgroundColor: "#eff6ff",
    borderColor: "#1d4ed8",
    borderWidth: 2,
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardClaimed: {
    opacity: 0.6,
  },
  // Wide PRO upgrade banner — full-section-width below the chest row.
  // Mirrors the ProfileScreen banner so the upsell surface is consistent
  // across contexts (user direction 2026-06-04). Gold border pulses via
  // proBannerBorderStyle for the same "premium" feel.
  proBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden",
  },
  // "רגיל" overlay sticker — sits low on the chest body so it reads as a
  // tag attached to the chest, not floating UI chrome. bottom:4 (was 14)
  // after the slot grew taller — at bottom:14 the sticker visually
  // detached from the chest body (יפיופי 2026-06-05).
  stickerOnChest: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#94a3b8",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 5,
  },
  stickerText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.2,
    writingDirection: "rtl",
  },
  // Tag (eyebrow chip): pulled OUT of the title flow into absolute top-right
  // so it doesn't overlap the "תיבה רגילה" / "תיבת PRO" headline (user
  // report 2026-06-03: "הסימן של הפרו לא יהיה על הטקסט"). Card paddingTop
  // is bumped via tag's height + gap so the title still clears it.
  tag: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#94a3b8",
    // White hairline border keeps the chip readable when it sits over the
    // edge of the PRO chest's gold trim (יפיופי 2026-06-05).
    borderWidth: 1.5,
    borderColor: "#ffffff",
    zIndex: 4,
  },
  tagPro: {
    backgroundColor: "#1d4ed8",
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.4,
    writingDirection: "rtl",
  },
  tagTextPro: {
    letterSpacing: 1.6,
  },
  // Both slots share a fixed 240px height and bottom-align their chests so
  // the chest BASES sit on the same horizontal line ("באותו הקו וסימטרית",
  // user request 2026-06-05). After יפיופי's audit: bumped from 300 down
  // to 240 because the regular Lottie (now 220) was previously living
  // alone in the lower third of a 300px slot, leaving 150px of dead
  // vertical space. 240 is just tall enough to hug both chests at the
  // bottom; the PRO box (270 tall) overflows the top by 30px, but that's
  // the PNG's transparent padding, not chest body — the parent card's
  // overflow:hidden clips it cleanly.
  chestArt: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 240,
    position: "relative",
    overflow: "visible",
  },
  chestArtPro: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 240,
    position: "relative",
    overflow: "visible",
  },
  rewardsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    // Rewards hug the chest now (was marginTop 8 — created a visible gap
    // that the user read as "rewards belong to the CTA below, not the
    // chest above", 2026-06-03 user report).
    marginTop: 0,
  },
  rewardIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: "900",
    color: STITCH.onSurface,
    letterSpacing: 0.2,
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    marginLeft: 2,
  },
  rewardPlus: {
    fontSize: 14,
    fontWeight: "900",
    color: STITCH.onSurfaceVariant,
    marginHorizontal: 4,
  },
});
