import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { DoubleOrNothingModal } from '../../components/ui/DoubleOrNothingModal';
import { doubleHeavyHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useWisdomStore } from '../wisdom-flashes/useWisdomStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

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
}: ChestCelebrationModalProps): React.ReactElement | null {
  const [opened, setOpened] = useState(false);
  const [showDoN, setShowDoN] = useState(false);
  const [donResolved, setDonResolved] = useState(false);
  const [donMultiplier, setDonMultiplier] = useState(1);
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

  // Chest animation shared values — mirrors LessonFlowScreen's
  // chestGlowScale / chestGlowOpacity / chestBodyScale rhythm.
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);
  const bodyScale = useSharedValue(1);

  useEffect(() => {
    if (!visible || opened) return;
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 700 }),
        withTiming(0.3, { duration: 700 }),
      ),
      -1,
      false,
    );
    bodyScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800 }),
        withTiming(0.98, { duration: 800 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(glowScale);
      cancelAnimation(glowOpacity);
      cancelAnimation(bodyScale);
    };
  }, [visible, opened, glowScale, glowOpacity, bodyScale]);

  // Reset to "closed" state when modal toggles off.
  useEffect(() => {
    if (!visible) {
      setOpened(false);
      setShowDoN(false);
      setDonResolved(false);
      setDonMultiplier(1);
      wisdomFiredRef.current = false;
      prevWisdomActiveRef.current = false;
    }
  }, [visible]);

  // Trigger the wisdom popup ~1.5s after the chest opens so the reward
  // pills land first, then the quote takes the spotlight. The popup is
  // a global overlay (mounted in _layout.tsx) so we just call into the
  // store — it appears over the chest modal.
  useEffect(() => {
    if (!opened || wisdomFiredRef.current) return;
    wisdomFiredRef.current = true;
    const t1 = setTimeout(() => {
      useWisdomStore.getState().showRandomWisdom();
    }, 1500);
    // Safety fallback: if the wisdom popup never appears (or the user
    // mutes it via the store), force DoN to surface after 6s so the
    // CTAs aren't blocked forever.
    const t2 = setTimeout(() => {
      if (!useWisdomStore.getState().activeItem && !donResolved) {
        setShowDoN((prev) => prev || (onDoNResolve ? true : false));
        if (!onDoNResolve) setDonResolved(true);
      }
    }, 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Bridge: wisdom dismiss → DoN open. We watch activeItem; the moment
  // it flips from non-null → null AFTER the user saw the quote, we
  // launch the Double-or-Nothing modal (skip if parent didn't wire it).
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
    onDoNResolve?.(multiplier);
  }, [onDoNResolve]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bodyScale.value }],
  }));

  const handleChestTap = useCallback(() => {
    if (opened) return;
    doubleHeavyHaptic();
    try { playSound('modal_open_4'); } catch { /* non-fatal */ }
    // Snap the glow + body to a "burst" frame before unmounting the
    // pulse animation by flipping `opened`.
    glowScale.value = withSpring(1.4, { damping: 12, stiffness: 220 });
    glowOpacity.value = withTiming(0, { duration: 350 });
    bodyScale.value = withSpring(1.18, { damping: 10, stiffness: 200 });
    lottieRef.current?.play();
    setTimeout(() => setOpened(true), 600);
  }, [opened, glowScale, glowOpacity, bodyScale, playSound]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    onContinueModule();
  }, [onContinueModule]);

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
      onRequestClose={onContinueModule}
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
                <Text style={[styles.tapHint, RTL_CENTER]} allowFontScaling={false}>
                  הקש על התיבה לפתיחה
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

          {/* CTAs — only after the chest is opened AND wisdom+DoN finished */}
          {opened && donResolved && (
            <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.ctaWrap}>
              <Pressable
                onPress={handleAdvance}
                accessibilityRole="button"
                accessibilityLabel="לשיעור הבא בפרק"
                style={[styles.cta, styles.ctaPrimary]}
              >
                <ChevronLeft size={20} color="#ffffff" strokeWidth={2.6} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  לשיעור הבא בפרק
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                accessibilityRole="button"
                accessibilityLabel="המשך עם המודולה"
                style={[styles.cta, styles.ctaSecondary]}
              >
                <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>
                  המשך עם המודולה
                </Text>
              </Pressable>
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
});
