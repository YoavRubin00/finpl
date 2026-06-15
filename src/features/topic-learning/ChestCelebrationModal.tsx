import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { DoubleOrNothingModal } from '../../components/ui/DoubleOrNothingModal';
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
import { useTopicProgressStore } from './useTopicProgressStore';
import { ParticleBurst } from '../../components/ui/ParticleBurst';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { captureEvent } from '../../lib/posthog';
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
  onContinueModule: () => void;
  onAdvanceToNextModule: () => void;
  /** Called after the user resolves the Double-or-Nothing prompt with
   *  the multiplier (0 = lost, 1 = kept, 2 = doubled). Parent applies
   *  the coin delta on top of the base reward. Optional — when not
   *  provided, DoN is skipped. */
  onDoNResolve?: (multiplier: number) => void;
  /** Whether this chest is the FINAL 100% chest rather than the 70%
   *  threshold one. Drives copy + reward visuals. R6 Epic 5. */
  isFinale?: boolean;
  /** R8 T3.4 — rarity tier rolled by useTopicProgressStore.recordChestOpen.
   *  Drives the rarity badge + particle palette (gold for mythic, cyan for
   *  rare, none for common). The coin bonus is already baked into `coins`
   *  by the caller; this is purely a visual treatment. */
  rarity?: ChestRarity;
  /** Yoav 2026-06-12: optional playful "I'm bailing" CTA below the main two.
   *  When `quitLabel` is set (the parent rolled the 30%-of-opens gate and
   *  the module is past mod-0-1b), the modal surfaces a small tertiary
   *  button — e.g. "עפתי לנטפליקס 📺" — that fires `onQuit` on tap. */
  quitLabel?: string | null;
  onQuit?: () => void;
  /** Hardware-back / system dismiss. Closes the modal WITHOUT firing the
   *  parent's CTA analytics — wiring onRequestClose to onContinueModule
   *  made every Android back press register as a fake
   *  chest_cta_tapped='finish_module' (code-review 2026-06-12). Falls back
   *  to onContinueModule when not provided (legacy callers). */
  onDismiss?: () => void;
}

/**
 * Treasure chest celebration shown after the user crosses the 70%
 * topic-tree threshold. UI re-implements (NOT extracts) the chest
 * visual from LessonFlowScreen (~lines 4340-4416) so the topic-tree
 * pilot doesn't pull in 2.5k lines of host state.
 *
 * Two CTAs after the user taps the chest:
 *  - "המשך עם המודולה" — close modal, return to accordion to finish
 *    the remaining 30% of topics.
 *  - "לשיעור הבא בפרק" — close modal AND collapse accordion AND
 *    navigate to the next module in chapter (mod-1-2 for the pilot).
 */
export function ChestCelebrationModal({
  visible,
  xp,
  coins,
  onContinueModule,
  onAdvanceToNextModule,
  onDoNResolve,
  isFinale = false,
  rarity = 'common',
  quitLabel = null,
  onQuit,
  onDismiss,
}: ChestCelebrationModalProps): React.ReactElement | null {
  const [opened, setOpened] = useState(false);
  const [showDoN, setShowDoN] = useState(false);
  const [donResolved, setDonResolved] = useState(false);
  const [donMultiplier, setDonMultiplier] = useState(1);
  // R8 J3 — flying coins + XP burst, fires once when chest opens.
  // Separate flags for coins / xp so each can unmount independently.
  const [flyingCoins, setFlyingCoins] = useState(false);
  const [flyingXp, setFlyingXp] = useState(false);
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
    if (rarity !== 'common') setRarityBurstActive(true);
  }, [opened, rarity, onDoNResolve]);

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
    const tDoN = setTimeout(() => {
      if (onDoNResolve) {
        setShowDoN((prev) => prev || true);
      } else {
        setDonResolved(true);
      }
    }, 700);
    // T2: Wisdom popup appears as a parallel ornament. If DoN is still
    // open, the global wisdom popup z-orders above and the user can tap
    // through it; once dismissed, DoN remains underneath.
    const tWisdom = setTimeout(() => {
      if (mountedRef.current) useWisdomStore.getState().showRandomWisdom();
    }, 1800);
    return () => {
      clearTimeout(tDoN);
      clearTimeout(tWisdom);
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
    if (onDoNResolve) {
      setShowDoN(true);
    } else {
      setDonResolved(true);
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
    // Was 600ms — reduced to 200ms so the reward pills + flying coins
    // surface immediately on tap ("שמיד יתעופפו" — Yoav 2026-06-11).
    chestTimersRef.current.push(setTimeout(() => setOpened(true), 200));
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
    onAdvanceToNextModule();
  }, [onAdvanceToNextModule]);

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
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Heading */}
          <Animated.View entering={FadeInUp.duration(360)} style={styles.headingWrap}>
            <Text style={[styles.heading, RTL_CENTER]} allowFontScaling={false}>
              {isFinale ? 'מסטר! 🏆' : 'כל הכבוד! 🎉'}
            </Text>
            <Text style={[styles.subheading, RTL_CENTER]} allowFontScaling={false}>
              {isFinale
                ? 'סיימת את כל הרכיבים. תיבת המאסטר נפתחת.'
                : 'סיימת 70% מהמודולה. הגיע הזמן לפרס.'}
            </Text>
            {/* R8 T3.4 — rarity badge above the chest. Common stays
                invisible to avoid noise; rare/mythic surface so the
                user immediately feels "this drop is special." */}
            {rarity !== 'common' && (
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
                      {`🔥 ${chestStreak} ימים ברצף`}
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
                </View>
              </Animated.View>
            )}
          </View>

          {/* Captain's Forecast ("מחר התיבה") removed per Yoav 2026-06-11 —
              the tomorrow-chest teaser was cluttering the reward moment. */}

          {/* CTAs — only after the chest is opened AND wisdom+DoN finished.
              Yoav 2026-06-11: relabeled to "המשך" (move on to the next
              lesson in the chapter) and "סיים את כל המודולה" (stay in the
               module's expanded map to finish the remaining chips). The
               secondary CTA is hidden for the 100% master chest since
               there's nothing left to complete inside the module. */}
          {opened && donResolved && (
            <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.ctaWrap}>
              {/* Yoav 2026-06-15: rewarded-ad bonus — watch a video for +500
                  coins. Non-Pro only; gold to read as a "treasure" bonus,
                  distinct from the blue continue CTA. Shows a loading state
                  rather than hiding while the ad preloads, and flips to a
                  confirmation once claimed (one claim per chest). */}
              {!isPro && (
                adClaimed ? (
                  <View style={styles.adBonusClaimed}>
                    <Text style={styles.adBonusClaimedText} allowFontScaling={false}>
                      {`✓ קיבלתם +${AD_BONUS_COINS} מטבעות!`}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={adReady ? handleWatchAdBonus : undefined}
                    disabled={!adReady}
                    accessibilityRole="button"
                    accessibilityLabel={adReady ? `צפו בפרסומת וקבלו ${AD_BONUS_COINS} מטבעות` : 'המודעה נטענת'}
                    accessibilityState={{ disabled: !adReady }}
                    style={[styles.cta, styles.ctaAdBonus, !adReady && { opacity: 0.6 }]}
                  >
                    <Text style={[styles.ctaAdBonusText, RTL_CENTER]} allowFontScaling={false}>
                      {adReady ? `🎬 צפו בפרסומת — קבלו +${AD_BONUS_COINS} מטבעות` : 'טוען פרסומת...'}
                    </Text>
                  </Pressable>
                )
              )}
              <Pressable
                onPress={handleAdvance}
                accessibilityRole="button"
                accessibilityLabel="המשך"
                style={[styles.cta, styles.ctaPrimary]}
              >
                <ChevronLeft size={20} color="#ffffff" strokeWidth={2.6} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  המשך
                </Text>
              </Pressable>
              {!isFinale && (
                <Pressable
                  onPress={handleContinue}
                  accessibilityRole="button"
                  accessibilityLabel="סיים את כל המודולה"
                  style={[styles.cta, styles.ctaSecondary]}
                >
                  <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>
                    סיים את כל המודולה
                  </Text>
                </Pressable>
              )}
              {/* Yoav 2026-06-12: playful "I'm bailing" CTA. Surfaced on
                  ~30% of post-mod-0-1b chests via parent's chestState
                  roll. Tertiary visual weight (light bg, small text). */}
              {quitLabel && onQuit && (
                <Pressable
                  onPress={() => { tapHaptic(); onQuit(); }}
                  accessibilityRole="button"
                  accessibilityLabel={quitLabel}
                  style={styles.ctaQuit}
                >
                  <Text style={[styles.ctaQuitText, RTL]} allowFontScaling={false}>
                    {quitLabel}
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </SafeAreaView>

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
    paddingTop: 20,
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
  ctaSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(224, 242, 254, 0.55)',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e0f2fe',
  },
  // Gold rewarded-ad bonus button — dark amber text on the gold fill (white
  // on #f59e0b is ~2:1 contrast / WCAG fail). Reads as "coins/treasure".
  ctaAdBonus: {
    backgroundColor: '#f59e0b',
    borderBottomWidth: 4,
    borderBottomColor: '#b45309',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaAdBonusText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#78350f',
  },
  adBonusClaimed: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  adBonusClaimedText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fcd34d',
    writingDirection: 'rtl',
  },
  ctaQuit: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaQuitText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(224,242,254,0.65)',
  },
});
