import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useSegments } from 'expo-router';
import { useSharkWagerStore } from './useSharkWagerStore';
import { useTomorrowChestStore, tomorrowChestStatus } from './useTomorrowChestStore';
import { FINN_HAPPY } from './finnMascotConfig';
import { useAuthStore } from '../auth/useAuthStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { useEconomyUIStore, deriveStreakFromDates } from '../economy/useEconomyUIStore';
import { getIsraelDateISO } from '../../utils/israelTime';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

/** Mirrors grantStarterCapital's amount (useEconomyUIStore) — display only. */
const STARTER_CAPITAL_COINS = 2500;

/**
 * Starter-capital grant — "הכריש פותח לך תיק" (MONETIZATION-PLAN §2.1,
 * ים+מוני 2026-07-02, approved by Yoav).
 *
 * The one-time 2,500-coin grant fires on the user's SECOND distinct active
 * day — never on day-0, never announced in advance (surprise > promise: a
 * promised 2,500 would dwarf the 50-coin shark wager and turn a gift into an
 * entitlement). Ruled session order on day-2:
 *
 *   wager resolution  →  day-2 ritual + milestone  →  THE GRANT  →  bridge CTA
 *
 * Enforced here by gating on:
 *  - `wager === null && lastResolution === null` — the shark-wager is fully
 *    settled AND its win/loss modal was dismissed (Day0ExitRitualHost).
 *    Untouched wager logic — we only wait for it (guardrail §2.1).
 *  - tomorrow-chest status !== 'ready' — the day-2 landing ceremony
 *    (TomorrowChestReadyHost) runs first; opening re-arms it to 'sealed'.
 *  - the global popup slot — the streak celebration (the isHabitDay
 *    milestone) reserves the stage when it shows, so we land after it.
 *
 * Day-4+ comeback edge (ruled in §2.1): a user who missed the isHabitDay
 * window still gets the grant on their second DISTINCT active day — same
 * minimal shark moment, `source: 'second_active_day'`. The store grant is
 * idempotent (starterCapitalGranted flag) so no path can double-pay.
 *
 * Analytics: `starter_capital_granted {day, source}` + the single CTA fires
 * `starter_capital_bridge_cta_tapped`. NEVER `chest_opened`.
 */
export function StarterCapitalGrantHost(): React.ReactElement | null {
  const router = useRouter();
  const segments = useSegments();

  const starterCapitalGranted = useEconomyUIStore((s) => s.starterCapitalGranted);
  const activeDates = useEconomyUIStore((s) => s.activeDates);
  const wager = useSharkWagerStore((s) => s.wager);
  const lastResolution = useSharkWagerStore((s) => s.lastResolution);
  // Subscribed so a chest open/re-arm re-evaluates eligibility; the fresh
  // status is re-derived inside attempt() too (retry loop below).
  const chestOpensOnDate = useTomorrowChestStore((s) => s.opensOnDate);

  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const pendingFirstChest = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  const pendingProTeaser = useTutorialStore((s) => s.pendingPostWalkthroughProTeaser);
  const pendingRegisterCTA = useTutorialStore((s) => s.pendingPostWalkthroughCTA);
  const inLesson = useNudgeQueueStore((s) => s.inLesson);

  const onTabs = segments[0] === '(tabs)';
  // Second distinct active day — covers BOTH the consecutive day-2 ritual and
  // the day-4+ comeback (streak reset to 1, but it's still the second day the
  // user ever showed up). activeDates may hold a same-day duplicate, so count
  // uniques.
  const distinctActiveDays = new Set(activeDates).size;

  const eligible =
    !starterCapitalGranted &&
    distinctActiveDays >= 2 &&
    hasCompletedOnboarding &&
    hasSeenWalkthrough &&
    !pendingFirstChest &&
    !pendingProTeaser &&
    !pendingRegisterCTA &&
    wager === null &&
    lastResolution === null &&
    !inLesson &&
    onTabs;

  const [visible, setVisible] = useState(false);
  const [grantDay, setGrantDay] = useState(2);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !eligible) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const attempt = (waited: number) => {
      if (cancelled || firedRef.current) return;
      const scheduleRetry = () => {
        // The day-2 stage is contested (resolution → chest ceremony →
        // streak milestone). Wait our turn for up to ~45s, then let the
        // next session catch it — the grant is idempotent and not
        // session-critical, only order-critical.
        if (waited < 45000) retry = setTimeout(() => attempt(waited + 3000), 3000);
      };
      // Ruled order: the tomorrow-chest landing ceremony (the day-2 ritual)
      // goes first. A ready chest that was opened re-arms to 'sealed'; an
      // ignored one keeps us quiet this session — fine.
      const chestStatus = tomorrowChestStatus(useTomorrowChestStore.getState().opensOnDate);
      if (chestStatus === 'ready') { scheduleRetry(); return; }
      // Global popup stage — the streak celebration (milestone) reserves it
      // when it fires, so this also sequences us behind the isHabitDay ritual.
      const nudges = useNudgeQueueStore.getState();
      if (!nudges.canTakePopupSlot()) { scheduleRetry(); return; }
      // Wager must STILL be settled at fire time (a resolution can appear
      // between effect eval and now).
      const wagerState = useSharkWagerStore.getState();
      if (wagerState.wager !== null || wagerState.lastResolution !== null) { scheduleRetry(); return; }

      firedRef.current = true;
      const granted = useEconomyUIStore.getState().grantStarterCapital();
      if (!granted) return; // already granted elsewhere/before — stay silent
      const eco = useEconomyUIStore.getState();
      const uniqueDates = [...new Set(eco.activeDates)].sort();
      const today = getIsraelDateISO();
      const first = uniqueDates[0] ?? today;
      // Calendar day-of-life (first active day = 1): 2 for the consecutive
      // ritual, 4+ for the comeback edge.
      const day = Math.max(
        2,
        Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${first}T12:00:00Z`).getTime()) / 86_400_000) + 1,
      );
      const source =
        deriveStreakFromDates(eco.activeDates, eco.frozenDates) >= 2
          ? ('habit_day_2' as const)
          : ('second_active_day' as const);
      try { track({ name: 'starter_capital_granted', props: { day, source } }); } catch { /* non-fatal */ }
      nudges.takePopupSlot();
      setGrantDay(day);
      setVisible(true);
      successHaptic();
    };
    // Let the streak celebration / chest ceremony land first.
    const t = setTimeout(() => attempt(0), 2600);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (retry) clearTimeout(retry);
    };
  }, [eligible]);

  const handleBridgeCTA = () => {
    successHaptic();
    try { track({ name: 'starter_capital_bridge_cta_tapped', props: {} }); } catch { /* non-fatal */ }
    setVisible(false);
    router.push('/bridge' as never);
  };

  const handleLater = () => {
    tapHaptic();
    setVisible(false);
  };

  if (!visible) return null;

  // Captain Shark speaks — singular, gender-free (BRAND.md): "חזרת" reads the
  // same for everyone; "שלך"; no shark emoji.
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleLater}>
      <View style={styles.backdrop}>
        <ConfettiExplosion onComplete={() => { /* one-shot */ }} />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage source={FINN_HAPPY} style={styles.hero} contentFit="contain" accessible={false} />
            </View>

            <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
              הכריש פותח לך תיק
            </Text>
            <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
              {grantDay <= 2
                ? 'יומיים בפנים. מבחינתי — עסק רציני.\nהון פתיחה ממני:'
                : 'חזרת — וזה מה שחשוב.\nהון פתיחה ממני:'}
            </Text>

            <Animated.View entering={FadeIn.delay(240).duration(320)} style={styles.rewardPill}>
              <Text style={styles.rewardValue} allowFontScaling={false}>
                +{STARTER_CAPITAL_COINS.toLocaleString()}
              </Text>
              <GoldCoinIcon size={22} />
            </Animated.View>

            <Text style={[styles.bridgeHint, RTL_CENTER]} allowFontScaling={false}>
              בגשר זה כבר שווה הטבות אמיתיות.
            </Text>

            <Animated.View entering={FadeIn.delay(360).duration(320)} style={styles.ctaWrap}>
              <Pressable
                onPress={handleBridgeCTA}
                accessibilityRole="button"
                accessibilityLabel="לפתוח את הגשר"
                style={styles.cta}
              >
                {/* Android Pressable: bg lives on the inner View */}
                <View style={styles.ctaInner}>
                  <Text style={styles.ctaText} allowFontScaling={false}>לפתוח את הגשר</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={handleLater}
                accessibilityRole="button"
                accessibilityLabel="אחר כך"
                hitSlop={8}
                style={styles.laterBtn}
              >
                <Text style={styles.laterText} allowFontScaling={false}>אחר כך</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
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
  heroWrap: {
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    padding: 8,
  },
  hero: {
    width: 96,
    height: 96,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 22,
  },
  rewardPill: {
    marginTop: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef9c3',
    borderWidth: 2,
    borderColor: '#facc15',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  rewardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#a16207',
  },
  bridgeHint: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0e7490',
  },
  ctaWrap: {
    marginTop: 16,
    gap: 8,
    alignSelf: 'stretch',
  },
  cta: {
    alignSelf: 'stretch',
  },
  ctaInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  laterBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
});
