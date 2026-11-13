import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { EnergyBatteryIcon } from '../../components/ui/EnergyBatteryIcon';
import { DoubleOrNothingModal } from '../../components/ui/DoubleOrNothingModal';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import {
  doubleHeavyHaptic,
  heavyHaptic,
  mediumHaptic,
  successHaptic,
  tapHaptic,
} from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useWisdomStore } from '../wisdom-flashes/useWisdomStore';
import { useTopicProgressStore, nextChestCoinMultiplier } from './useTopicProgressStore';
import { getNextLessonAfter } from '../retention-loops/nextLessonTarget';
import { beginPostLessonSequence, endPostLessonSequence, reportPostLessonModal } from '../retention-loops/postLessonSequence';
import { useDailyQuestsStore } from '../daily-quests/useDailyQuestsStore';
import { ParticleBurst } from '../../components/ui/ParticleBurst';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { captureEvent } from '../../lib/posthog';
import { track } from '../../lib/analytics/events';
import type { ChestRarity } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
/** AdMob rewarded BONUS offered after a chest opens — watch a video → +500
 *  coins. Non-Pro only, one claim per chest. Granted via the same
 *  addCoins(..., 'lesson') pipe the chest reward itself uses, so it persists
 *  to the server identically (no new coin source / DB change). Yoav 2026-06-15. */
const AD_BONUS_COINS = 500;

interface ChestCelebrationModalProps {
  visible: boolean;
  /** XP awarded to surface on chest open. The economy grant already
   *  happened upstream — this is just for display. */
  xp: number;
  coins: number;
  /** Energy (⚡) awarded by the chest. The real grantEnergy already happened
   *  upstream — this drives the display pill + fly-out (Yoav 2026-06-22). */
  energy?: number;
  /** Quiet secondary "חזרה למפה": close the chest and land on the map with the
   *  lesson's accordion open. Also the primary when there is no next lesson. */
  onContinueModule: () => void;
  /** Primary "לשיעור הבא": close the chest and START the next lesson. The
   *  modal resolves that lesson itself (getNextLessonAfter) and only calls
   *  this when one exists, so the caller can navigate without re-checking. */
  onAdvanceToNextModule: () => void;
  /** Called after the user resolves the Double-or-Nothing prompt with
   *  the multiplier (0 = lost, 1 = kept, 2 = doubled). Parent applies
   *  the coin delta on top of the base reward. Optional — when not
   *  provided, DoN is skipped. */
  onDoNResolve?: (multiplier: number) => void;
  /** Whether this chest is the FINAL 100% chest rather than the 70%
   *  threshold one. Drives copy + reward visuals. R6 Epic 5. */
  isFinale?: boolean;
  /** Percent of the lesson completed when the chest opens — the module's
   *  REAL chest threshold (chapter 1+ = 90, chapter 0 = 75, mod-0-1 = 50;
   *  from chestThresholdFor). Drives the non-finale subheading. Defaults to
   *  70 for legacy callers that don't pass it (Yoav 2026-06-28: the copy was
   *  a stale literal "70%" after the thresholds were raised). */
  thresholdPct?: number;
  /** R8 T3.4 — rarity tier rolled by useTopicProgressStore.recordChestOpen.
   *  Drives the rarity badge + particle palette (gold for mythic, cyan for
   *  rare, none for common). The coin bonus is already baked into `coins`
   *  by the caller; this is purely a visual treatment. */
  rarity?: ChestRarity;
  /** Hardware-back / system dismiss. Closes the modal WITHOUT firing the
   *  parent's CTA analytics — wiring onRequestClose to onContinueModule
   *  made every Android back press register as a fake
   *  chest_cta_tapped='finish_module' (code-review 2026-06-12). Falls back
   *  to onContinueModule when not provided (legacy callers). */
  onDismiss?: () => void;
  /** Chest-lifecycle attribution (Yoav 11.7). When set, the modal fires
   *  `chest_presented` the first time it actually RENDERS visible — from
   *  inside the modal, not the caller, so a render-layer regression that
   *  paints over the chest (the 8-10.7 white-screen class) shows up as
   *  earned>0 / presented=0 instead of staying invisible. Optional so
   *  legacy callers render unchanged. */
  analyticsModuleId?: string;
  analyticsSource?: 'inline' | 'accordion';
  /** One-sentence VALUE line ("עכשיו אתה יודע X") under the subheading —
   *  anchors the win to the user's life, not only to the coins (Yoav 11.7:
   *  "התיבה היא חיזוק; ה-aha הוא הסיבה לחזור"). */
  ahaLine?: string;
  /** When set, the next-lesson card is suppressed and the single button shows
   *  this label and fires onContinueModule. For the one caller whose next step
   *  is not a lesson (module-first arm: the chest leads to the profiling
   *  questions). Default: next-lesson card, or "חזרה למפה" when none exists. */
  soloCtaLabel?: string;
}

/**
 * Treasure chest celebration shown after the user crosses the 70%
 * topic-tree threshold. UI re-implements (NOT extracts) the chest
 * visual from LessonFlowScreen (~lines 4340-4416) so the topic-tree
 * pilot doesn't pull in 2.5k lines of host state.
 *
 * This modal IS the end-of-lesson screen (13.11.26): result (what was learned
 * + XP/coins/energy) → one reward moment (the chest tap, with an optional
 * double-or-nothing) → ONE primary action:
 *  - "לשיעור הבא" — a card naming the next lesson, its length and what its
 *    chest pays right now; tapping starts that lesson directly.
 *  - "חזרה למפה" — quiet secondary; lands on the map with the accordion open.
 * The wisdom quote, the live-call upsell and the "I'm off to Netflix" exit
 * used to sit here too. Five competing buttons after the win, and the
 * primary one only scrolled the map. They are gone from this screen.
 */
export function ChestCelebrationModal({
  visible,
  xp,
  coins,
  energy = 0,
  onContinueModule,
  onAdvanceToNextModule,
  onDoNResolve,
  isFinale = false,
  thresholdPct = 70,
  rarity = 'common',
  onDismiss,
  analyticsModuleId,
  analyticsSource,
  ahaLine,
  soloCtaLabel,
}: ChestCelebrationModalProps): React.ReactElement | null {
  // Native SafeAreaView inside a RN Modal drops the top inset on iOS (new
  // arch) — the "כל הכבוד" heading rendered under the Dynamic Island.
  // Insets via the JS hook + manual padding instead (Yoav 9.9).
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(false);
  const [showDoN, setShowDoN] = useState(false);

  // chest_presented — once per modal lifetime, on the first VISIBLE render.
  // Fired here (not by the caller) so it certifies actual presentation.
  const presentedFiredRef = useRef(false);
  useEffect(() => {
    if (!visible || presentedFiredRef.current || !analyticsModuleId) return;
    presentedFiredRef.current = true;
    // UX-51 (18.9.26): the chest is the session's earned popup moment — take
    // the stage so the notification primer / promos can't stack on top of it.
    try { useNudgeQueueStore.getState().takePopupSlot('earned'); } catch { /* non-fatal */ }
    try {
      track({
        name: 'chest_presented',
        props: { module_id: analyticsModuleId, source: analyticsSource ?? 'accordion' },
      });
    } catch { /* non-fatal */ }
    // The chest is the screen that shows the lesson's result, so the summary
    // view is counted HERE. It used to fire only from LessonFlowScreen's hidden
    // `summary` phase, which the topic-tree flow rarely reaches - fewer than
    // half of completions ever had one.
    try {
      const chapterMatch = /^mod-(\d+)-/.exec(analyticsModuleId);
      track({
        name: 'lesson_summary_viewed',
        props: {
          lesson_id: analyticsModuleId,
          chapter_id: chapterMatch ? `chapter-${chapterMatch[1]}` : null,
          surface: 'chest',
          source: analyticsSource ?? 'accordion',
        },
      });
    } catch { /* non-fatal */ }
    // Opens the post-lesson modal sequence and reports this chest as index 1.
    beginPostLessonSequence(analyticsModuleId);
  }, [visible, analyticsModuleId, analyticsSource]);
  const [donResolved, setDonResolved] = useState(false);
  const [donMultiplier, setDonMultiplier] = useState(1);
  // R8 J3 — flying coins + XP burst, fires once when chest opens.
  // Separate flags for coins / xp so each can unmount independently.
  const [flyingCoins, setFlyingCoins] = useState(false);
  const [flyingXp, setFlyingXp] = useState(false);
  const [flyingEnergy, setFlyingEnergy] = useState(false);
  // R8 T3.4 — rarity particle burst (gold for mythic, cyan for rare).
  // Fires alongside the chest reveal lottie. Common chests skip this.
  const [rarityBurstActive, setRarityBurstActive] = useState(false);
  // Post-chest rewarded-ad bonus (+500 coins) — one claim per chest open.
  const [adClaimed, setAdClaimed] = useState(false);
  const { showAd, isLoaded: adReady, isPro } = useRewardedAd();
  const addCoins = useEconomyUIStore((s) => s.addCoins);
  const lottieRef = useRef<LottieView>(null);
  const { playSound } = useSoundEffect();

  // Wisdom flash hook — when chest opens we trigger a random quote from
  // the global wisdom store. The popup component (WisdomPopupCard) is
  // mounted at app root so showing it is a single setter call; we then
  // listen for activeItem to flip back to null (user dismissed) and use
  // that as the cue to launch the DoN modal.
  const wisdomActive = useWisdomStore((s) => s.activeItem);
  const wisdomFiredRef = useRef(false);
  const prevWisdomActiveRef = useRef(false);
  // Guards async callbacks (FlyingRewards.onComplete) from calling setState
  // after the modal has unmounted during a fast navigation away.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // R6 Epic 7-C1: surface the user's current chest streak on the
  // pre-open chest body so the multiplier is legible BEFORE they tap.
  // Read-only here — the bump happens upstream in TopicTreeAccordion.
  const chestStreak = useTopicProgressStore((s) => s.chestStreak);
  const reducedMotion = useReducedMotion();

  // The "one more" hook. Resolved when the chest shows (the completion record
  // is already written by then), so the card names a lesson that really opens.
  const nextLesson = useMemo(
    () => (visible && analyticsModuleId && !soloCtaLabel ? getNextLessonAfter(analyticsModuleId) : null),
    [visible, analyticsModuleId, soloCtaLabel],
  );
  // What that lesson's chest pays if it is opened now - the existing chest
  // streak multiplier (×1.5 / ×2 / ×2.5), read from the store, never invented.
  const nextMultiplier = useMemo(
    () => (visible ? nextChestCoinMultiplier() : 1),
    // chestStreak is the input the multiplier is derived from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, chestStreak],
  );
  // Today's goal, in place of a modal 18 people open: the daily quests'
  // progress. The "lesson" quest is credited when the map regains focus, which
  // is after this screen, so a lesson finished just now is counted in here.
  const quests = useDailyQuestsStore((s) => s.quests);
  const questsTotal = quests.length;
  const questsDone = Math.min(
    questsTotal,
    quests.filter((q) => q.isCompleted).length + (quests.some((q) => q.type === 'module' && !q.isCompleted) ? 1 : 0),
  );

  // Chest animation shared values — mirrors LessonFlowScreen's
  // chestGlowScale / chestGlowOpacity / chestBodyScale rhythm.
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);
  const bodyScale = useSharedValue(1);

  useEffect(() => {
    if (!visible || opened) return;
    // Yoav 2026-06-11: "תוריד את הבהוב על התיבה שלפני הפתיחה" — the chest
    // is now STATIC before it's tapped (no infinite glow/body pulse). The
    // only animation left is the burst on tap (handleChestTap). A steady,
    // calm glow remains so the chest still reads as interactive, paired with
    // the plain "לחץ" hint below.
    glowScale.value = 1;
    glowOpacity.value = 0.5;
    bodyScale.value = 1;
  }, [visible, opened, glowScale, glowOpacity, bodyScale]);

  // Reset to "closed" state when modal toggles off.
  useEffect(() => {
    if (!visible) {
      setOpened(false);
      setShowDoN(false);
      setDonResolved(false);
      setDonMultiplier(1);
      setFlyingCoins(false);
      setFlyingXp(false);
      setFlyingEnergy(false);
      setRarityBurstActive(false);
      setAdClaimed(false);
      wisdomFiredRef.current = false;
      prevWisdomActiveRef.current = false;
    }
  }, [visible]);

  // Yoav 2026-06-11 (round 2): flying XP fires IMMEDIATELY when the chest
  // opens — was 350ms, which felt sluggish against the tap. Rarity burst
  // stays gated on opened so common drops don't fire it.
  // Code-review 2026-06-12: COINS now wait for the DoN gamble when one is
  // offered — previously the full +N flew to the wallet at open, then a
  // lost DoN flipped the pill to ×0 while the coins had already visually
  // "landed". When no DoN is wired, coins still fly at open as before;
  // otherwise handleDoNResolve launches them with the resolved amount
  // (and skips the flight entirely on a loss).
  useEffect(() => {
    if (!opened) return;
    if (!onDoNResolve) setFlyingCoins(true);
    setFlyingXp(true);
    if (energy > 0) setFlyingEnergy(true);
    if (rarity !== 'common') setRarityBurstActive(true);
  }, [opened, rarity, onDoNResolve, energy]);

  // R8 J5 — Wisdom + DoN now run as PARALLEL layers, not sequential.
  // DoN opens 700ms after chest reveal (reward pills mid-fade-in); the
  // wisdom popup fires 1.8s after (slightly delayed so the DoN modal is
  // already on-screen and the quote arrives as a top-layer ornament,
  // not as a gating bottleneck). CTAs unlock as soon as DoN resolves —
  // the user no longer waits 5-7s through wisdom→dismiss before the
  // chest CTAs become tappable. Compulsion loop now matches Brawl
  // Stars / Hay Day chest UX: open → reward → decision in < 2s.
  useEffect(() => {
    // Gate on `visible` too: when the modal is dismissed mid-sequence this
    // effect re-runs, returns early, and its previous-run cleanup clears the
    // pending timers immediately — no orphaned DoN/wisdom firing over a
    // chest that's already gone.
    if (!visible || !opened || wisdomFiredRef.current) return;
    wisdomFiredRef.current = true;
    // T1: DoN modal opens — independent of wisdom.
    // אודרי (RETENTION-PLAN 2026-07-02, one-gamble-per-session): the chest's
    // double-or-nothing is MUTED on the user's first IL-day — the day-0 exit
    // ritual's shark wager is the single bet of the first session. Muting =
    // auto-resolve as ×1 kept, so the parent multiplier state and the coin
    // flight behave exactly like a "keep" choice.
    const tDoN = setTimeout(() => {
      const firstDay = useEconomyUIStore.getState().activeDates.length <= 1;
      if (onDoNResolve && !firstDay) {
        setShowDoN((prev) => prev || true);
        reportPostLessonModal('double_or_nothing');
      } else {
        setDonResolved(true);
        if (onDoNResolve) {
          setFlyingCoins(true);
          onDoNResolve(1);
        }
      }
    }, 700);
    // The wisdom quote that used to pop 1.8s in is gone (13.11.26): it landed
    // ON the reward, sometimes over the double-or-nothing prompt, and had to be
    // dismissed before the next action. One reward moment, then the CTA.
    return () => {
      clearTimeout(tDoN);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, visible]);

  // R8 J5 — Legacy wisdom-dismiss-bridge kept ONLY as a safety net for
  // edge cases where DoN didn't open (e.g. parent didn't wire onDoNResolve
  // before chest displayed). Most chest opens won't trigger this anymore
  // because DoN already opened at T+700ms regardless of wisdom state.
  useEffect(() => {
    const isActive = wisdomActive !== null;
    const justDismissed = prevWisdomActiveRef.current && !isActive;
    prevWisdomActiveRef.current = isActive;
    if (!justDismissed) return;
    if (!wisdomFiredRef.current || donResolved) return;
    // Same first-day mute as the primary DoN trigger above.
    if (onDoNResolve && useEconomyUIStore.getState().activeDates.length > 1) {
      setShowDoN(true);
      reportPostLessonModal('double_or_nothing');
    } else {
      setDonResolved(true);
      if (onDoNResolve) {
        setFlyingCoins(true);
        onDoNResolve(1);
      }
    }
  }, [wisdomActive, donResolved, onDoNResolve]);

  const handleDoNResolve = useCallback((multiplier: number) => {
    setShowDoN(false);
    setDonResolved(true);
    setDonMultiplier(multiplier);
    // Launch the deferred coin flight with the RESOLVED outcome: ×1 kept /
    // ×2 doubled fly their final amount; ×0 lost flies nothing.
    if (multiplier > 0) setFlyingCoins(true);
    onDoNResolve?.(multiplier);
  }, [onDoNResolve]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bodyScale.value }],
  }));

  // R8 pre-release audit (Yoav + הסורק 2026-06-11): track the 4 timers
  // that fire over the 600ms reveal window so we can cancel them if
  // the user dismisses the modal mid-reveal. Without this, setOpened()
  // / the haptics fired against a component that had already unmounted
  // (no observable crash thanks to expo-haptics swallowing, but a real
  // setState-on-unmounted dev warning + wasted haptic on iOS).
  const chestTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => {
    if (!visible) {
      chestTimersRef.current.forEach(clearTimeout);
      chestTimersRef.current = [];
    }
  }, [visible]);
  useEffect(() => () => {
    chestTimersRef.current.forEach(clearTimeout);
    chestTimersRef.current = [];
  }, []);

  const handleChestTap = useCallback(() => {
    if (opened) return;
    // R8 J2 — Supercell-style escalating haptic curve over the 600ms
    // lottie reveal window. Flat double-heavy felt anticlimactic.
    tapHaptic();
    chestTimersRef.current.push(setTimeout(() => mediumHaptic(), 150));
    chestTimersRef.current.push(setTimeout(() => heavyHaptic(), 320));
    chestTimersRef.current.push(setTimeout(() => { doubleHeavyHaptic(); successHaptic(); }, 540));
    // R8 T1.4 — master chest plays `modal_open_4` (loudest); regular
    // 70% chest plays softer `modal_open_3`. Differentiates audibly.
    try { playSound(isFinale ? 'modal_open_4' : 'modal_open_3'); } catch { /* non-fatal */ }
    // Snap the glow + body to a "burst" frame before unmounting the
    // pulse animation by flipping `opened`.
    glowScale.value = withSpring(1.4, { damping: 12, stiffness: 220 });
    glowOpacity.value = withTiming(0, { duration: 350 });
    bodyScale.value = withSpring(1.18, { damping: 10, stiffness: 200 });
    lottieRef.current?.play();
    // Open on the FIRST tap, synchronously — NOT via a clearable timer
    // (Yoav 2026-06-19: "התיבה נפתחת אחרי לחיצה אחת עליה, ולא 2"). The old
    // 200ms setTimeout was pushed onto chestTimersRef, which the
    // visible-change effect cancels — so a re-render that briefly flipped
    // `visible` swallowed the open and forced a second tap. Flipping
    // `opened` inline guarantees one tap = open; the escalating burst
    // haptics above still play over the next ~540ms as the reward fades in.
    setOpened(true);
  }, [opened, glowScale, glowOpacity, bodyScale, playSound, isFinale]);

  // Yoav 2026-06-11 (round 2): reverted the auto-open — the user wants
  // to TAP the chest. What was changed instead: handleChestTap now
  // fires the flying-coins + flying-XP animation IMMEDIATELY (see the
  // useEffect below — 0ms delay instead of 350ms) and setOpened
  // accelerates from 600ms → 200ms, so the perceived reward arrival
  // matches the tap itself ("שמיד יתעופפו הדברים שמקבלים למעלה
  // באנימציה מספקת").

  const handleContinue = useCallback(() => {
    tapHaptic();
    onContinueModule();
  }, [onContinueModule]);

  // Watch a rewarded video → +500 coins on top of the chest reward. Pro users
  // never see the button (they're ad-free). Granted via addCoins('lesson') —
  // the identical pipe the chest coins use — so it persists server-side.
  const handleWatchAdBonus = useCallback(() => {
    if (adClaimed) return;
    tapHaptic();
    showAd(() => {
      addCoins(AD_BONUS_COINS, 'lesson');
      successHaptic();
      setAdClaimed(true);
      try { captureEvent('rewarded_ad_completed', { source: 'chest_bonus', coins: AD_BONUS_COINS }); } catch { /* non-fatal */ }
    });
  }, [adClaimed, showAd, addCoins]);

  const handleAdvance = useCallback(() => {
    successHaptic();
    if (analyticsModuleId && nextLesson) {
      try { track({ name: 'next_lesson_cta_tapped', props: { from_lesson: analyticsModuleId, to_lesson: nextLesson.moduleId } }); } catch { /* non-fatal */ }
    }
    // The user is leaving the end-of-lesson moment for the next lesson - any
    // modal from here on belongs to that lesson, not to this sequence.
    endPostLessonSequence();
    onAdvanceToNextModule();
  }, [onAdvanceToNextModule, analyticsModuleId, nextLesson]);

  // next_lesson_cta_shown - once per chest, when the CTA is really on screen
  // (chest opened and the double-or-nothing, if any, resolved).
  const ctaShownFiredRef = useRef(false);
  useEffect(() => {
    if (!visible) { ctaShownFiredRef.current = false; return; }
    if (!opened || !donResolved || ctaShownFiredRef.current || !analyticsModuleId) return;
    ctaShownFiredRef.current = true;
    try {
      track({
        name: 'next_lesson_cta_shown',
        props: {
          from_lesson: analyticsModuleId,
          to_lesson: nextLesson?.moduleId ?? null,
          minutes: nextLesson?.minutes,
          next_chest_multiplier: nextMultiplier,
          quests_done: questsDone,
          quests_total: questsTotal,
        },
      });
    } catch { /* non-fatal */ }
  }, [visible, opened, donResolved, analyticsModuleId, nextLesson, nextMultiplier, questsDone, questsTotal]);

  const goalLabel = questsTotal > 0 && questsDone >= questsTotal
    ? 'כל משימות היום הושלמו'
    : `משימות היום: ${questsDone} מתוך ${questsTotal}`;
  const nextRewardLabel = nextMultiplier > 1
    ? `התיבה הבאה: ×${nextMultiplier} מטבעות`
    : 'תיבה חדשה בסוף';

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss ?? onContinueModule}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.safe, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Heading */}
          <Animated.View entering={FadeInUp.duration(360)} style={styles.headingWrap}>
            <Text style={[styles.heading, RTL_CENTER]} allowFontScaling={false}>
              {isFinale ? 'מסטר! 🏆' : 'כל הכבוד! 🎉'}
            </Text>
            <Text style={[styles.subheading, RTL_CENTER]} allowFontScaling={false}>
              {isFinale
                ? 'סיימת את כל הרכיבים. תיבת המאסטר נפתחת.'
                : `סיימת ${thresholdPct}% מהשיעור. הגיע הזמן לפרס.`}
            </Text>
            {/* The aha line — the VALUE the user just earned, above the loot.
                (Yoav 11.7: the reason to come back is the progress, not the coins.) */}
            {ahaLine ? (
              <Text style={[styles.ahaLine, RTL_CENTER]} allowFontScaling={false}>
                {ahaLine}
              </Text>
            ) : null}
            {/* Mystery reveal (Yoav 17/06): the rarity badge is now gated on
                `opened` so rare/mythic is HIDDEN until the user taps — the chest
                no longer spoils its own outcome before the pull. Common stays
                invisible to avoid noise; the post-open particle burst + this
                badge land together as the surprise. */}
            {opened && rarity !== 'common' && (
              <View
                style={[
                  styles.rarityBadge,
                  rarity === 'mythic' && styles.rarityBadgeMythic,
                ]}
              >
                <Text style={styles.rarityBadgeText} allowFontScaling={false}>
                  {rarity === 'mythic' ? '✨ תיבת מיתי — נדיר במיוחד' : '⭐ תיבה נדירה'}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Chest stage */}
          <View style={styles.stage}>
            <ConfettiExplosion onComplete={() => { /* one-shot */ }} />
            {!opened ? (
              <Pressable
                onPress={handleChestTap}
                accessibilityRole="button"
                accessibilityLabel="פתח את התיבה"
                style={styles.chestPressable}
              >
                {/* Glow halo */}
                <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
                {/* Chest body */}
                <Animated.View style={[styles.chestBody, bodyStyle]}>
                  <LottieView
                    ref={lottieRef}
                    source={require('../../../assets/lottie/3D Treasure Box.json')}
                    style={styles.chestLottie}
                    autoPlay={false}
                    loop={false}
                  />
                </Animated.View>
                {chestStreak >= 2 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakBadgeText} allowFontScaling={false}>
                      {`🔥 תיבה ${chestStreak} ברצף`}
                    </Text>
                  </View>
                )}
                <Text style={[styles.tapHint, RTL_CENTER]} allowFontScaling={false}>
                  לחץ
                </Text>
              </Pressable>
            ) : (
              <Animated.View entering={FadeIn.duration(400)} style={styles.rewardWrap}>
                <LottieView
                  source={require('../../../assets/lottie/3D Treasure Box.json')}
                  style={styles.chestLottieOpen}
                  autoPlay
                  loop={false}
                />
                {/* R8 T3.4 — rarity particle burst on reveal. Gold for
                    mythic, cyan for rare. Skipped for common drops to
                    keep them feeling everyday-baseline. */}
                {rarityBurstActive && (
                  <View style={styles.rarityBurstAbs} pointerEvents="none">
                    <ParticleBurst
                      color={rarity === 'mythic' ? 'gold' : 'cyan'}
                      particleCount={rarity === 'mythic' ? 18 : 12}
                      onComplete={() => setRarityBurstActive(false)}
                    />
                  </View>
                )}
                <View style={styles.rewardRow}>
                  <View style={styles.rewardPill}>
                    <Sparkles size={20} color="#0c4a6e" strokeWidth={2.6} />
                    <Text style={styles.rewardValue} allowFontScaling={false}>
                      {`+${xp} XP`}
                    </Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <GoldCoinIcon size={22} />
                    <Text style={styles.rewardValue} allowFontScaling={false}>
                      {donResolved && donMultiplier !== 1
                        ? `+${coins * donMultiplier}`
                        : `+${coins}`}
                    </Text>
                    {donResolved && donMultiplier === 2 && (
                      <Text style={styles.multiplierBadge} allowFontScaling={false}>×2</Text>
                    )}
                    {donResolved && donMultiplier === 0 && (
                      <Text style={styles.multiplierBadgeLost} allowFontScaling={false}>×0</Text>
                    )}
                  </View>
                  {energy > 0 && (
                    <View style={styles.rewardPill}>
                      <EnergyBatteryIcon size={22} />
                      <Text style={styles.rewardValue} allowFontScaling={false}>
                        {`+${energy}`}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}
          </View>

          {/* Captain's Forecast ("מחר התיבה") removed per Yoav 2026-06-11 —
              the tomorrow-chest teaser was cluttering the reward moment. */}

          {/* End-of-lesson actions, shown once the chest is opened and the
              double-or-nothing (if offered) is resolved. ONE primary: the next
              lesson, made concrete (title, length, what its chest pays now).
              Under it a quiet row: back to the map, and the rewarded-ad bonus
              as a small extra, not a button that outshouts the primary. */}
          {opened && donResolved && (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.delay(300).duration(400)} style={styles.ctaWrap}>
              {questsTotal > 0 && (
                <View style={styles.goalRow} accessible accessibilityLabel={goalLabel}>
                  <Text style={[styles.goalText, RTL]} allowFontScaling={false}>
                    {goalLabel}
                  </Text>
                  <View style={styles.goalDots}>
                    {quests.map((q, i) => (
                      <View key={q.id} style={[styles.goalDot, i < questsDone && styles.goalDotDone]} />
                    ))}
                  </View>
                </View>
              )}
              {nextLesson ? (
                <Pressable
                  onPress={handleAdvance}
                  accessibilityRole="button"
                  accessibilityLabel={`לשיעור הבא: ${nextLesson.title}. כ-${nextLesson.minutes} דקות. ${nextRewardLabel}`}
                  style={styles.nextCard}
                >
                  <Text style={[styles.nextEyebrow, RTL]} allowFontScaling={false}>
                    השיעור הבא
                  </Text>
                  <Text style={[styles.nextTitle, RTL]} numberOfLines={2} allowFontScaling={false}>
                    {nextLesson.title}
                  </Text>
                  <Text style={[styles.nextMeta, RTL]} allowFontScaling={false}>
                    {`כ-${nextLesson.minutes} דק׳ · ${nextRewardLabel}`}
                  </Text>
                  <View style={[styles.cta, styles.ctaPrimary, styles.nextCardButton]}>
                    <ChevronLeft size={20} color="#ffffff" strokeWidth={2.6} />
                    <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                      לשיעור הבא
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleContinue}
                  accessibilityRole="button"
                  accessibilityLabel={soloCtaLabel ?? 'חזרה למפה'}
                  style={[styles.cta, styles.ctaPrimary]}
                >
                  <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                    {soloCtaLabel ?? 'חזרה למפה'}
                  </Text>
                </Pressable>
              )}
              <View style={styles.quietRow}>
                {nextLesson && (
                  <Pressable
                    onPress={handleContinue}
                    accessibilityRole="button"
                    accessibilityLabel="חזרה למפה"
                    hitSlop={8}
                    style={styles.quietBtn}
                  >
                    <Text style={[styles.quietText, RTL]} allowFontScaling={false}>
                      חזרה למפה
                    </Text>
                  </Pressable>
                )}
                {/* Rewarded-ad bonus (+500 coins, non-Pro, one claim per chest).
                    Hidden until an ad is actually loaded - it used to show a
                    disabled "טוען פרסומת..." button above the primary. */}
                {!isPro && (adClaimed ? (
                  <Text style={[styles.quietClaimed, RTL]} allowFontScaling={false}>
                    {`✓ קיבלתם +${AD_BONUS_COINS} מטבעות`}
                  </Text>
                ) : adReady ? (
                  <Pressable
                    onPress={handleWatchAdBonus}
                    accessibilityRole="button"
                    accessibilityLabel={`צפו בפרסומת וקבלו ${AD_BONUS_COINS} מטבעות`}
                    hitSlop={8}
                    style={styles.quietBtn}
                  >
                    <Text style={[styles.quietAdText, RTL]} allowFontScaling={false}>
                      {`🎬 פרסומת = +${AD_BONUS_COINS} מטבעות`}
                    </Text>
                  </Pressable>
                ) : null)}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Double-or-Nothing sub-modal. Fires after the wisdom popup is
            dismissed (see effect above). On resolve we apply the
            multiplier to the displayed reward, then the CTAs unlock. */}
        <DoubleOrNothingModal
          visible={showDoN}
          rewards={{ coins, xp, gems: 0 }}
          onResolve={handleDoNResolve}
        />

        {/* R8 J3 — Hay Day-style flying coins + XP. Originate from the
            chest area (~55% of screen height) and arc up toward the
            wallet/XP pills at the top. Each is independently unmounted
            on its onComplete callback. */}
        {flyingCoins && (
          <FlyingRewards
            type="coins"
            amount={coins * donMultiplier}
            direction="up"
            onComplete={() => { if (mountedRef.current) setFlyingCoins(false); }}
          />
        )}
        {flyingXp && (
          <FlyingRewards
            type="xp"
            amount={xp}
            direction="up"
            onComplete={() => { if (mountedRef.current) setFlyingXp(false); }}
          />
        )}
        {flyingEnergy && energy > 0 && (
          <FlyingRewards
            type="energy"
            amount={energy}
            direction="up"
            onComplete={() => { if (mountedRef.current) setFlyingEnergy(false); }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    // Vertical padding applied inline (insets-based) — see render.
  },
  headingWrap: {
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fcd34d',
  },
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e0f2fe',
    maxWidth: 320,
    lineHeight: 22,
  },
  ahaLine: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#7dd3fc',
    maxWidth: 320,
    lineHeight: 20,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  chestPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(251, 191, 36, 0.55)',
    shadowColor: '#fbbf24',
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  chestBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestLottie: {
    width: 220,
    height: 220,
  },
  chestLottieOpen: {
    width: 200,
    height: 200,
  },
  tapHint: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fcd34d',
    marginTop: 8,
  },
  streakBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(251, 146, 60, 0.18)',
    borderColor: '#fb923c',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  streakBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fb923c',
    writingDirection: 'rtl',
  },
  // R8 T3.4 — chest rarity badge (rare = cyan, mythic = gold). Sits
  // above the chest body, only visible for non-common drops.
  rarityBadge: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.18)',
    borderColor: '#22d3ee',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rarityBadgeMythic: {
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
    borderColor: '#facc15',
  },
  rarityBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  rarityBurstAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  rewardWrap: {
    alignItems: 'center',
    gap: 18,
  },
  rewardRow: {
    flexDirection: 'row-reverse',
    gap: 14,
  },
  rewardPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    shadowColor: '#fbbf24',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  rewardValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  multiplierBadge: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
    backgroundColor: '#bbf7d0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  multiplierBadgeLost: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991b1b',
    backgroundColor: '#fecaca',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  forecastWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.55)',
  },
  forecastLabel: {
    color: '#bae6fd',
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  forecastBody: {
    color: '#e0f2fe',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  ctaWrap: {
    gap: 10,
    paddingBottom: 8,
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  ctaPrimary: {
    backgroundColor: '#3b82f6',
    borderBottomWidth: 4,
    borderBottomColor: '#1e40af',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  // "Today's goal" line above the next-lesson card: daily-quest progress.
  goalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#bae6fd',
  },
  goalDots: {
    flexDirection: 'row-reverse',
    gap: 5,
  },
  goalDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(186, 230, 253, 0.25)',
  },
  goalDotDone: {
    backgroundColor: '#fcd34d',
  },
  // Next-lesson card: the whole card is the primary tap target.
  nextCard: {
    borderRadius: 20,
    padding: 14,
    gap: 4,
    backgroundColor: 'rgba(14, 116, 144, 0.32)',
    borderWidth: 1.5,
    borderColor: 'rgba(125, 211, 252, 0.55)',
  },
  nextEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7dd3fc',
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 24,
  },
  nextMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fcd34d',
  },
  nextCardButton: {
    marginTop: 10,
    paddingVertical: 14,
  },
  quietRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 44,
  },
  quietBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(224, 242, 254, 0.8)',
  },
  quietAdText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fcd34d',
  },
  quietClaimed: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fcd34d',
  },
});
