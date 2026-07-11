// One-shot "first chest" onboarding moment, shown to every new user immediately
// after profiling and before the app walkthrough. The user taps the chest to
// open it (credits a starter coins + XP reward via the same economy pipe the
// real module chests use, so it persists identically), then Captain Shark
// explains the reward loop. A clear "המשך" starts the tour, which then hands
// directly into the first learning module.
// Copy follows BRAND.md: Captain Shark speaking personally → singular,
// gender-neutral. Yoav 2026-06-23.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { usePathname } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  useReducedMotion,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { Sparkles } from 'lucide-react-native';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { heavyHaptic, mediumHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useRouter } from 'expo-router';
import { FINN_HAPPY } from '../retention-loops/finnMascotConfig';
import { useTomorrowChestStore } from '../retention-loops/useTomorrowChestStore';
import { captureEvent } from '../../lib/posthog';
import { isModuleFirstArm, FIRST_RUN_EXPERIMENT_ID, firstRunVariantId } from './firstRunExperiment';
import { useTopicProgressStore } from '../topic-learning/useTopicProgressStore';
import { useBanditStore } from '../bandit/useBanditStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

// Starter reward for the very first chest — coins + XP (Yoav 2026-06-23).
// Tunable. Granted via the same addCoins('lesson') / addXP('lesson_complete')
// pipes the real module chests use, so it persists to the server identically.
const FIRST_CHEST_COINS = 100;
const FIRST_CHEST_XP = 50;

function PostWalkthroughFirstChest(): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const { playSound } = useSoundEffect();
  const addCoins = useEconomyUIStore((s) => s.addCoins);
  const addXP = useEconomyUIStore((s) => s.addXP);
  const clearFlag = useTutorialStore((s) => s.setPendingPostWalkthroughFirstChest);
  const triggerWalkthrough = useTutorialStore((s) => s.triggerWalkthrough);
  const firstChestOpened = useTutorialStore((s) => s.firstChestOpened);
  const router = useRouter();

  // A process kill can happen after the reward is persisted but before the
  // learner taps continue. Resume in the claimed state so reopening the gate
  // cannot grant a duplicate reward or make the flow feel like it reset.
  const [opened, setOpened] = useState(firstChestOpened);
  const grantedRef = useRef(firstChestOpened);
  const lottieRef = useRef<LottieView>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Chest tap animation
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.55);
  const bodyScale = useSharedValue(1);
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glowScale.value }], opacity: glowOpacity.value }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scale: bodyScale.value }] }));

  // Gentle idle pulse on the closed chest (skipped in reduced-motion). The tap
  // handler overrides these shared values, so no explicit cancel is needed.
  useEffect(() => {
    if (reducedMotion || opened) return;
    bodyScale.value = withRepeat(withSequence(withTiming(1.05, { duration: 720 }), withTiming(1, { duration: 720 })), -1, true);
    glowOpacity.value = withRepeat(withSequence(withTiming(0.85, { duration: 720 }), withTiming(0.45, { duration: 720 })), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, opened]);

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; }, []);

  const handleOpen = useCallback(() => {
    if (opened) return;
    // Escalating haptic burst over the ~540ms reveal (mirrors ChestCelebrationModal).
    tapHaptic();
    timersRef.current.push(setTimeout(() => mediumHaptic(), 150));
    timersRef.current.push(setTimeout(() => heavyHaptic(), 320));
    timersRef.current.push(setTimeout(() => successHaptic(), 540));
    try { playSound('modal_open_3'); } catch { /* non-fatal */ }
    glowScale.value = withSpring(1.45, { damping: 12, stiffness: 220 });
    glowOpacity.value = withTiming(0, { duration: 380 });
    bodyScale.value = withSpring(1.18, { damping: 10, stiffness: 200 });
    lottieRef.current?.play();
    // Credit the starter reward exactly once.
    if (!grantedRef.current) {
      grantedRef.current = true;
      try { addCoins(FIRST_CHEST_COINS, 'lesson'); } catch { /* non-fatal */ }
      try { addXP(FIRST_CHEST_XP, 'lesson_complete'); } catch { /* non-fatal */ }
      try { captureEvent('first_chest_opened', { coins: FIRST_CHEST_COINS, xp: FIRST_CHEST_XP }); } catch { /* non-fatal */ }
      // Module-first v1 journey END (Yoav 5.7.26: "הסיום של הוריאנט החדש היא
      // בהגעה לתיבה שבסוף ההדרכה"): reaching THIS chest means the full
      // reordered first-run completed — module + its chest + profiling + tour.
      // Convert HERE, guarded on the activation stamp (a v1 user who bailed
      // the module pre-threshold must not convert; they convert later at the
      // accordion chest like control) and one-shot via the PERSISTED
      // firstChestOpened flag — grantedRef alone resets if a kill between
      // open and continue re-shows this modal.
      try {
        const tut = useTutorialStore.getState();
        if (
          !tut.firstChestOpened &&
          isModuleFirstArm() &&
          Boolean(useTopicProgressStore.getState().modulesPastThreshold['mod-0-1'])
        ) {
          useBanditStore.getState().recordConversion(FIRST_RUN_EXPERIMENT_ID, firstRunVariantId('module_first'));
        }
      } catch { /* non-fatal */ }
      // Unlock the notification-permission ask at this earliest guaranteed win —
      // every new user opens the welcome chest, so even those who later drop DURING
      // mod-0-1 still get asked for push (→ the streak comeback reminder fires).
      // The banner OR's this with the mod-0-1-completion gate. Yoav 2026-06-26 (D1).
      try { useTutorialStore.getState().markFirstChestOpened(); } catch { /* non-fatal */ }
      // Tomorrow-chest (RETENTION-SPRINT 2026-07-06): the welcome chest arms
      // the day-2 sealed chest too — this is the ONLY arm that reaches users
      // who finish the tour but never start mod-0-1 (the leakiest segment);
      // their day-2 ceremony CTA leads straight into the first lesson.
      try { useTomorrowChestStore.getState().armForTomorrow('welcome_chest'); } catch { /* non-fatal */ }
    }
    setOpened(true);
  }, [opened, playSound, addCoins, addXP, glowScale, glowOpacity, bodyScale]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    try { captureEvent('first_chest_continue', {}); } catch { /* non-fatal */ }
    clearFlag(false);
    // The reward is the first thing a new learner sees. Only after it is
    // claimed do we introduce the wider app; completing or skipping that tour
    // then enters mod-0-1 from AppWalkthroughOverlay.
    try { triggerWalkthrough(); } catch { /* non-fatal */ }
    // Module-first first-run (onboarding_module_first v1, Yoav 5.7.26): the v1
    // user already played mod-0-1 BEFORE profiling — their earned threshold
    // chest is waiting on the learn map (the accordion fires it on mount).
    // Re-pushing the lesson would replay the half-done intro; land on the map.
    if (isModuleFirstArm()) {
      try { router.push('/(tabs)/index' as never); } catch { /* non-fatal */ }
      return;
    }
    // The walkthrough spans tabs, so remain on the map while its overlay starts.
    try { router.replace('/(tabs)' as never); } catch { /* non-fatal */ }
  }, [clearFlag, router, triggerWalkthrough]);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { /* block back — must open + continue */ }}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* Heading */}
          <Animated.View entering={FadeInUp.duration(360)} style={styles.headingWrap}>
            <Text style={[styles.heading, RTL_CENTER]} allowFontScaling={false}>
              {/* Module-first v1 already opened their earned lesson chest at the
                  handoff — for them this is a bonus, not "the first". */}
              {opened ? 'יש! 🎁' : isModuleFirstArm() ? 'תיבת בונוס בשבילך!' : 'התיבה הראשונה שלך!'}
            </Text>
            {!opened && (
              <Text style={[styles.subheading, RTL_CENTER]} allowFontScaling={false}>
                לחיצה לפתיחה ✨
              </Text>
            )}
          </Animated.View>

          {/* Chest stage */}
          <View style={styles.stage}>
            {opened && <ConfettiExplosion onComplete={() => { /* one-shot */ }} />}
            {!opened ? (
              <Pressable onPress={handleOpen} accessibilityRole="button" accessibilityLabel="פתחו את התיבה" style={styles.chestPressable}>
                <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
                <Animated.View style={[styles.chestBody, bodyStyle]}>
                  <LottieView
                    ref={lottieRef}
                    source={require('../../../assets/lottie/3D Treasure Box.json')}
                    style={styles.chestLottie}
                    autoPlay={false}
                    loop={false}
                  />
                </Animated.View>
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
                    <Text style={styles.rewardValue} allowFontScaling={false}>{`+${FIRST_CHEST_XP} XP`}</Text>
                  </View>
                  <View style={styles.rewardPill}>
                    <GoldCoinIcon size={22} />
                    <Text style={styles.rewardValue} allowFontScaling={false}>{`+${FIRST_CHEST_COINS}`}</Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Shark speech bubble + continue (after the chest opens) */}
          {opened ? (
            <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.bottomWrap}>
              <View style={styles.sharkRow}>
                <View style={styles.bubble}>
                  <Text style={[styles.bubbleText, RTL]} allowFontScaling={false}>
                    זאת התיבה הראשונה שלך! עוד תיבות מחכות לך בסוף כל שיעור ובסיום אתגר יומי.
                  </Text>
                  <View style={styles.bubbleTail} pointerEvents="none" />
                </View>
                <ExpoImage source={FINN_HAPPY} accessible={false} style={styles.shark} contentFit="contain" />
              </View>
              <Pressable onPress={handleContinue} accessibilityRole="button" accessibilityLabel="המשך" style={styles.continueBtn}>
                <Text style={styles.continueText} allowFontScaling={false}>המשך</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.bottomSpacer} />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// Public gate. Mounted globally in app/_layout.tsx BEFORE the register CTA gate.
// Renders only when the one-shot flag is set AND the user has landed back on the
// learn map (never over /pricing, /lesson, auth, bridge). No guest/Pro
// condition — the first chest is shown to every new user.
export function PostWalkthroughFirstChestGate(): React.JSX.Element | null {
  const pending = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  const pathname = usePathname();

  if (!pending) return null;
  const onLearnMap =
    pathname === '/' ||
    pathname === '' ||
    (pathname?.startsWith('/') &&
      !pathname.startsWith('/pricing') &&
      !pathname.startsWith('/(auth)') &&
      !pathname.startsWith('/lesson') &&
      !pathname.startsWith('/bridge'));
  if (!onLearnMap) return null;

  return <PostWalkthroughFirstChest />;
}

export { PostWalkthroughFirstChest };

const styles = StyleSheet.create({
  // Aligned 1:1 with ChestCelebrationModal so the first chest feels like the
  // real end-of-lesson chest (Yoav 2026-06-23) — only the CTAs differ (single
  // המשך) plus the shark speech bubble.
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.86)' },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  headingWrap: { alignItems: 'center', gap: 8, marginTop: 8 },
  heading: { fontSize: 30, fontWeight: '900', color: '#fcd34d' },
  subheading: { fontSize: 15, fontWeight: '600', color: '#e0f2fe', maxWidth: 320, lineHeight: 22 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  chestPressable: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(251, 191, 36, 0.55)', shadowColor: '#fbbf24', shadowOpacity: 0.9, shadowRadius: 40, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  chestBody: { alignItems: 'center', justifyContent: 'center' },
  chestLottie: { width: 220, height: 220 },
  rewardWrap: { alignItems: 'center', gap: 18 },
  chestLottieOpen: { width: 200, height: 200 },
  rewardRow: { flexDirection: 'row-reverse', gap: 14 },
  rewardPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#fbbf24',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  rewardValue: { fontSize: 17, fontWeight: '900', color: '#0c4a6e' },
  bottomWrap: { width: '100%', alignItems: 'center' },
  sharkRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 16, width: '100%' },
  shark: { width: 84, height: 84 },
  bubble: { flexShrink: 1, maxWidth: 250, backgroundColor: '#ffffff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleText: { fontSize: 15, fontWeight: '700', color: '#0f172a', lineHeight: 22 },
  bubbleTail: { position: 'absolute', bottom: 16, right: -6, width: 14, height: 14, backgroundColor: '#ffffff', transform: [{ rotate: '45deg' }] },
  continueBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  continueText: { fontSize: 17, fontWeight: '900', color: '#ffffff' },
  bottomSpacer: { height: 80 },
});
