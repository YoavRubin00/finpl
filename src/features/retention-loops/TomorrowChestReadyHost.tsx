import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { EnergyBatteryIcon } from '../../components/ui/EnergyBatteryIcon';
import { useTomorrowChestStore, tomorrowChestStatus, TOMORROW_CHEST_ENABLED } from './useTomorrowChestStore';
import type { TomorrowChestRewards } from './useTomorrowChestStore';
import { useSharkWagerStore } from './useSharkWagerStore';
import { getNextLessonTarget } from './nextLessonTarget';
import { useAuthStore } from '../auth/useAuthStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { getIsraelDateISO, msUntilNextIsraelMidnight } from '../../utils/israelTime';
import { DAILY_STREAK_NUDGE_KEY } from '../../hooks/useStreakCelebration';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { heavyHaptic, mediumHaptic, successHaptic, tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

/**
 * Day-2 landing ceremony for the tomorrow-chest (RETENTION-SPRINT 2026-07-06).
 *
 * When a sealed tomorrow-chest is READY (the next Israel day arrived) and the
 * user lands back in the app, this host runs the return ritual: chest →
 * tap-to-open → rewards fly → "ממשיכים מאיפה שעצרנו" deep-links STRAIGHT into
 * the next lesson (no map hunting — the day-2 friction gap the code map
 * flagged). Mounted globally in app/_layout; self-gates + self-dismisses.
 *
 * Collision rules (day-2 open is a contested moment):
 *  - Never over the shark-wager resolution modal (Day0ExitRitualHost shows it
 *    on the same return) — waits for lastResolution to clear, then fires.
 *  - Never during a lesson (nudge-store inLesson) or off the (tabs) routes.
 *  - Never over the post-walkthrough chest→Pro→register chain.
 *  - Firing suppresses today's ~5s streak daily nudge (one landing ritual,
 *    not two popups) — the EARNED streak celebration after completing a
 *    lesson still fires normally.
 */
export function TomorrowChestReadyHost(): React.ReactElement | null {
  const router = useRouter();
  const segments = useSegments();

  const opensOnDate = useTomorrowChestStore((s) => s.opensOnDate);
  const armedOnDate = useTomorrowChestStore((s) => s.armedOnDate);
  const openRequestNonce = useTomorrowChestStore((s) => s.openRequestNonce);

  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const pendingFirstChest = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  const pendingProTeaser = useTutorialStore((s) => s.pendingPostWalkthroughProTeaser);
  const pendingRegisterCTA = useTutorialStore((s) => s.pendingPostWalkthroughCTA);
  const inLesson = useNudgeQueueStore((s) => s.inLesson);
  const wagerResolution = useSharkWagerStore((s) => s.lastResolution);

  // Israel-day tick: status flips sealed→ready at 00:00 IL even mid-session.
  const [ilToday, setIlToday] = useState<string>(() => getIsraelDateISO());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIlToday(getIsraelDateISO());
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const armMidnight = () => {
      timer = setTimeout(() => {
        setIlToday(getIsraelDateISO());
        armMidnight();
      }, msUntilNextIsraelMidnight() + 1_000);
    };
    armMidnight();
    return () => { sub.remove(); if (timer) clearTimeout(timer); };
  }, []);

  const status = tomorrowChestStatus(opensOnDate, ilToday);
  const onTabs = segments[0] === '(tabs)';

  const [visible, setVisible] = useState(false);
  const [opened, setOpened] = useState(false);
  const [rewards, setRewards] = useState<TomorrowChestRewards | null>(null);
  const [flyingCoins, setFlyingCoins] = useState(false);
  const [flyingXp, setFlyingXp] = useState(false);
  const autoFiredRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  }, []);

  const { playSound } = useSoundEffect();
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const bodyScale = useSharedValue(1);
  const lottieRef = useRef<LottieView>(null);
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glowScale.value }], opacity: glowOpacity.value }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scale: bodyScale.value }] }));

  const dayGapNow = (() => {
    if (!armedOnDate) return 0;
    const from = new Date(`${armedOnDate}T12:00:00Z`).getTime();
    const to = new Date(`${ilToday}T12:00:00Z`).getTime();
    return Math.max(0, Math.round((to - from) / 86_400_000));
  })();

  const fireCeremony = useCallback((trigger: 'auto' | 'card_tap') => {
    if (!mountedRef.current) return;
    setOpened(false);
    setRewards(null);
    setVisible(true);
    // One landing ritual: suppress today's 5s streak daily-nudge (same
    // UTC-date key format useStreakCelebration writes). The earned streak
    // celebration (post-activity) is untouched.
    try { AsyncStorage.setItem(DAILY_STREAK_NUDGE_KEY, new Date().toISOString().slice(0, 10)).catch(() => {}); } catch { /* non-fatal */ }
    try { track({ name: 'tomorrow_chest_ready_shown', props: { trigger, day_gap: dayGapNow } }); } catch { /* non-fatal */ }
  }, [dayGapNow]);

  // Auto-fire on a day-2 landing — once per session.
  useEffect(() => {
    if (autoFiredRef.current || visible) return;
    if (!TOMORROW_CHEST_ENABLED || status !== 'ready') return;
    if (!hasCompletedOnboarding || !hasSeenWalkthrough) return;
    if (pendingFirstChest || pendingProTeaser || pendingRegisterCTA) return;
    if (wagerResolution !== null) return; // wager win/loss modal first
    if (inLesson || !onTabs) return;
    autoFiredRef.current = true;
    const t = setTimeout(() => fireCeremony('auto'), 1400);
    timersRef.current.push(t);
    return () => clearTimeout(t);
  }, [status, hasCompletedOnboarding, hasSeenWalkthrough, pendingFirstChest, pendingProTeaser, pendingRegisterCTA, wagerResolution, inLesson, onTabs, visible, fireCeremony]);

  // Manual fire from the map card.
  const lastNonceRef = useRef(openRequestNonce);
  useEffect(() => {
    if (openRequestNonce === lastNonceRef.current) return;
    lastNonceRef.current = openRequestNonce;
    if (status !== 'ready' || visible) return;
    fireCeremony('card_tap');
  }, [openRequestNonce, status, visible, fireCeremony]);

  const handleChestTap = useCallback(() => {
    if (opened) return;
    const granted = useTomorrowChestStore.getState().openReadyChest();
    if (!granted) { setVisible(false); return; }
    setOpened(true);
    setRewards(granted);
    // Escalating haptic burst over the reveal (mirrors the chest family).
    tapHaptic();
    timersRef.current.push(setTimeout(() => mediumHaptic(), 150));
    timersRef.current.push(setTimeout(() => heavyHaptic(), 320));
    timersRef.current.push(setTimeout(() => successHaptic(), 540));
    try { playSound('modal_open_3'); } catch { /* non-fatal */ }
    glowScale.value = withSpring(1.45, { damping: 12, stiffness: 220 });
    glowOpacity.value = withTiming(0, { duration: 380 });
    bodyScale.value = withSpring(1.15, { damping: 10, stiffness: 200 });
    lottieRef.current?.play();
    setFlyingCoins(true);
    setFlyingXp(true);
  }, [opened, playSound, glowScale, glowOpacity, bodyScale]);

  const nextTarget = opened ? getNextLessonTarget() : null;

  const handleContinue = useCallback(() => {
    successHaptic();
    const target = getNextLessonTarget();
    try { track({ name: 'tomorrow_chest_cta_tapped', props: { cta: 'continue_lesson', next_module_id: target?.moduleId } }); } catch { /* non-fatal */ }
    setVisible(false);
    if (target) {
      // Straight into the lesson — the whole point of the day-2 landing.
      router.push(target.route as never);
    }
  }, [router]);

  const handleLater = useCallback(() => {
    tapHaptic();
    try { track({ name: 'tomorrow_chest_cta_tapped', props: { cta: 'later' } }); } catch { /* non-fatal */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={opened ? handleLater : undefined}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            {opened && <ConfettiExplosion onComplete={() => { /* one-shot */ }} />}

            <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
              {opened ? 'שווה היה לחזור' : 'התיבה של היום מוכנה'}
            </Text>
            {!opened && (
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                חזרתם — בדיוק כמו שקבענו. פתחו אותה.
              </Text>
            )}

            {!opened ? (
              <Pressable onPress={handleChestTap} accessibilityRole="button" accessibilityLabel="פתחו את התיבה" style={styles.chestPressable}>
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
                <Text style={[styles.tapHint, RTL_CENTER]} allowFontScaling={false}>לחץ</Text>
              </Pressable>
            ) : (
              <Animated.View entering={FadeIn.duration(400)} style={styles.rewardWrap}>
                <LottieView
                  source={require('../../../assets/lottie/3D Treasure Box.json')}
                  style={styles.chestLottieOpen}
                  autoPlay
                  loop={false}
                />
                {rewards && (
                  <View style={styles.rewardRow}>
                    <View style={styles.rewardPill}>
                      <Sparkles size={18} color="#0c4a6e" strokeWidth={2.6} />
                      <Text style={styles.rewardValue} allowFontScaling={false}>{`+${rewards.xp} XP`}</Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <GoldCoinIcon size={20} />
                      <Text style={styles.rewardValue} allowFontScaling={false}>{`+${rewards.coins}`}</Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <EnergyBatteryIcon size={20} />
                      <Text style={styles.rewardValue} allowFontScaling={false}>{`+${rewards.energy}`}</Text>
                    </View>
                  </View>
                )}
              </Animated.View>
            )}

            {opened && (
              <Animated.View entering={FadeIn.delay(350).duration(360)} style={styles.ctaWrap}>
                {/* Honest re-arm rule, stated up front: today's lesson earns
                    tomorrow's chest. */}
                <Text style={[styles.rearmHint, RTL_CENTER]} allowFontScaling={false}>
                  שיעור אחד היום = תיבה חדשה מחר.
                </Text>
                <Pressable
                  onPress={handleContinue}
                  accessibilityRole="button"
                  accessibilityLabel="ממשיכים מאיפה שעצרנו"
                  style={[styles.cta, styles.ctaPrimary]}
                >
                  <ChevronLeft size={20} color="#ffffff" strokeWidth={2.6} />
                  <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                    ממשיכים מאיפה שעצרנו
                  </Text>
                </Pressable>
                {nextTarget && (
                  <Text style={[styles.nextHint, RTL_CENTER]} allowFontScaling={false} numberOfLines={2}>
                    {`הבא בתור: ${nextTarget.title}`}
                  </Text>
                )}
                <Pressable
                  onPress={handleLater}
                  accessibilityRole="button"
                  accessibilityLabel="אחר כך"
                  style={[styles.cta, styles.ctaSecondary]}
                >
                  <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>אחר כך</Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        </SafeAreaView>

        {flyingCoins && rewards && (
          <FlyingRewards
            type="coins"
            amount={rewards.coins}
            direction="up"
            onComplete={() => { if (mountedRef.current) setFlyingCoins(false); }}
          />
        )}
        {flyingXp && rewards && (
          <FlyingRewards
            type="xp"
            amount={rewards.xp}
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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
  },
  safe: {
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 22,
  },
  chestPressable: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: 190,
    height: 190,
  },
  glow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: '#fbbf24',
    opacity: 0.5,
  },
  chestBody: {
    width: 160,
    height: 160,
  },
  chestLottie: {
    width: 160,
    height: 160,
  },
  chestLottieOpen: {
    width: 150,
    height: 150,
  },
  tapHint: {
    position: 'absolute',
    bottom: -2,
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  rewardWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  rewardRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rewardPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#bae6fd',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  ctaWrap: {
    marginTop: 16,
    gap: 10,
    alignSelf: 'stretch',
  },
  rearmHint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaPrimary: {
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
  },
  ctaSecondary: {
    backgroundColor: '#e0f2fe',
    borderBottomWidth: 2,
    borderBottomColor: '#bae6fd',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0c4a6e',
  },
  nextHint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0e7490',
    marginTop: -2,
  },
});
