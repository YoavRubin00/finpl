import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { useSharkWagerStore, WAGER_STAKE, WAGER_PAYOUT } from './useSharkWagerStore';
import { FINN_STANDARD, FINN_HAPPY } from './finnMascotConfig';
import { useAuthStore } from '../auth/useAuthStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useNotificationStore } from '../notifications/useNotificationStore';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey } from '../economy/useEconomy';
import type { Economy } from '../../lib/api/economy';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';
import { useBanditStore } from '../bandit/useBanditStore';
import { getVariantPayload } from '../bandit/banditConfig';
import { setPersonProperties } from '../../lib/posthog';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

/** Amount + the app's gold-coin glyph (the one in the top wallet) inline. */
function CoinAmount({ amount }: { amount: number }): React.ReactElement {
  return (
    <View style={styles.coinAmt}>
      <Text style={styles.wagerHeadline} allowFontScaling={false}>{amount}</Text>
      <GoldCoinIcon size={16} />
    </View>
  );
}

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

/**
 * Day-0 exit ritual — "נתראה מחר" (RETENTION-PLAN 2026-07-02, week-3 item
 * pulled forward by Yoav 2.7). Fires ONCE, at the end of the first session
 * (mod-0-1 chest done, first IL-day), after every existing CTA chain cleared.
 *
 * Trimmed to אודרי's spec — three elements only:
 *   1. Tomorrow's promise, named and numbered (day-2 streak + a new chest).
 *   2. The shark's wager as the single interactive element: user escrows 50,
 *      the shark puts 100; come back tomorrow → 150 back. Both buttons carry
 *      equal visual weight; loss terms are stated up front in one line.
 *   3. "קבענו ל-H:00" — the appointment hour, when push permission exists.
 *
 * The same host renders the one-time win/loss resolution modal on the next
 * open. Win: the shark pays with respect. Loss: one quiet line, no guilt
 * spiral, never a re-offer.
 */
export function Day0ExitRitualHost(): React.ReactElement | null {
  const offerConsumedAt = useSharkWagerStore((s) => s.offerConsumedAt);
  const wager = useSharkWagerStore((s) => s.wager);
  const lastResolution = useSharkWagerStore((s) => s.lastResolution);

  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const isGuest = useAuthStore((s) => s.isGuest);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const isMod01Complete = useCompletedModulesStore((s) => s.completedIds.includes('mod-0-1'));
  // The mod-0-1 signup gate (guests) stamps this when it OPENS — which happens
  // on the chest's onClose. Gating on it guarantees the ritual shows AFTER the
  // chest is opened AND after the signup gate, never before (Yoav 2026-07-03).
  const mod01GateShown = useTutorialStore((s) => s.moduleEndGateShown['mod-0-1'] ?? false);
  const pendingFirstChest = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  const pendingProTeaser = useTutorialStore((s) => s.pendingPostWalkthroughProTeaser);
  const pendingRegisterCTA = useTutorialStore((s) => s.pendingPostWalkthroughCTA);
  const lastDailyTaskDate = useEconomyUIStore((s) => s.lastDailyTaskDate);

  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const preferredReminderHour = useNotificationStore((s) => s.preferredReminderHour);

  // ── Wager resolution — on mount, on foreground, and the moment today's
  //    activity is logged (so a day-1 return resolves to a WIN instantly). ──
  useEffect(() => {
    useSharkWagerStore.getState().resolveWagerIfDue();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useSharkWagerStore.getState().resolveWagerIfDue();
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    useSharkWagerStore.getState().resolveWagerIfDue();
  }, [lastDailyTaskDate]);

  // ── Offer eligibility ──
  const offerEligible =
    !offerConsumedAt &&
    !wager &&
    !lastResolution &&
    hasCompletedOnboarding &&
    hasSeenWalkthrough &&
    isMod01Complete &&
    // Guests: wait for the signup gate (which fires on chest-open). Registered
    // users get no gate, so they pass once the chest sequence has completed.
    (mod01GateShown || !isGuest) &&
    !pendingFirstChest &&
    !pendingProTeaser &&
    // isFirstDay gate removed 2026-07-03 (Yoav): the wager now reaches ALL
    // mod-0-1-chest completers, split ~50/50 by the day0_wager bandit at fire
    // time below — not just the day-0 first-session slice (which was ~1/day).
    !pendingRegisterCTA;

  const [offerVisible, setOfferVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || !offerEligible) return;
    // Let the chest celebration finish breathing before the ritual enters.
    const t = setTimeout(() => {
      if (firedRef.current) return;
      // מוני: balance < stake → the offer is never shown (and never
      // discounted). Checked at fire time, against the server-truth cache.
      const coins = queryClient.getQueryData<Economy | null>(economyQueryKey)?.coins ?? 0;
      if (coins < WAGER_STAKE) return;
      firedRef.current = true;
      // day0_wager A/B (Yoav 2026-07-03): among eligible mod-0-1-chest completers,
      // ~50% are SHOWN the wager (treatment) and ~50% held out (control), so its
      // return lift is measured by arm in the bandit dashboard. Assigned HERE (at
      // the eligibility moment) so the experiment population is exactly the
      // wager-eligible cohort; the person-property tags BOTH arms for the breakdown.
      const wagerArm = useBanditStore.getState().selectVariant('day0_wager');
      const showWager = getVariantPayload('day0_wager', wagerArm).show;
      setPersonProperties({ bandit_variant__day0_wager: wagerArm });
      try { track({ name: 'bandit_variant_assigned', props: { experiment_id: 'day0_wager', variant_id: wagerArm, variant_label: showWager ? 'show' : 'hide' } }); } catch { /* non-fatal */ }
      useSharkWagerStore.getState().markOfferConsumed();
      if (!showWager) return; // control holdout — assigned + measured, but not shown
      setOfferVisible(true);
      const streak = useEconomyUIStore.getState().activeDates.length;
      try { track({ name: 'day0_exit_ritual_shown', props: { streak } }); } catch { /* non-fatal */ }
      try { track({ name: 'streak_wager_offered', props: { stake: WAGER_STAKE, payout: WAGER_PAYOUT } }); } catch { /* non-fatal */ }
    }, 1800);
    return () => clearTimeout(t);
  }, [offerEligible]);

  const handleAccept = () => {
    successHaptic();
    const ok = useSharkWagerStore.getState().placeWager();
    if (!ok) { setOfferVisible(false); return; }
    setAccepted(true);
    setTimeout(() => setOfferVisible(false), 2200);
  };

  const handleDecline = () => {
    tapHaptic();
    useSharkWagerStore.getState().declineWager();
    setOfferVisible(false);
  };

  const dismissResolution = () => {
    tapHaptic();
    useSharkWagerStore.getState().clearResolution();
  };

  const appointmentHour = permissionGranted ? (preferredReminderHour ?? 20) : null;

  // ── Resolution modal (won / lost) — shown once, then cleared. ──
  if (lastResolution) {
    const won = lastResolution.outcome === 'won';
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismissResolution}>
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
              <View style={styles.heroWrap}>
                <ExpoImage source={won ? FINN_HAPPY : FINN_STANDARD} style={styles.hero} contentFit="contain" accessible={false} />
              </View>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                {won ? 'חזרת. הפסדתי.' : 'לא נפגשנו אתמול'}
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                {won
                  ? `${lastResolution.payout} מטבעות — עסק זה עסק.`
                  : `ה-${lastResolution.stake} אצלי. עסק זה עסק.\nהרצף עוד פתוח — היום נחשב.`}
              </Text>
              <Pressable
                onPress={dismissResolution}
                style={[styles.cta, styles.ctaPrimary]}
                accessibilityRole="button"
                accessibilityLabel={won ? 'לקחת את המטבעות' : 'סגרנו'}
              >
                <Text style={styles.ctaText} allowFontScaling={false}>
                  {won ? 'לוקח הכל' : 'סגרנו'}
                </Text>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  if (!offerVisible) return null;

  // ── Offer modal ──
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleDecline}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage source={FINN_STANDARD} style={styles.hero} contentFit="contain" accessible={false} />
            </View>

            {accepted ? (
              <Animated.View entering={FadeIn.duration(280)}>
                <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                  סגרנו. נתראה מחר
                </Text>
                <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                  ה-{WAGER_STAKE} שלך וה-100 שלי מחכים בכספת.
                  {appointmentHour !== null ? `\nקבענו ל-${appointmentHour}:00.` : ''}
                </Text>
              </Animated.View>
            ) : (
              <>
                <Animated.View entering={FadeIn.delay(160).duration(320)}>
                  <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                    מחר: יומיים ברצף ותיבה חדשה
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(240).duration(320)} style={styles.wagerCard}>
                  <View style={styles.wagerHeadlineRow}>
                    <Text style={styles.wagerHeadline} allowFontScaling={false}>מתערבים?</Text>
                    <CoinAmount amount={WAGER_STAKE} />
                    <Text style={styles.wagerHeadline} allowFontScaling={false}>ממך,</Text>
                    <CoinAmount amount={100} />
                    <Text style={styles.wagerHeadline} allowFontScaling={false}>ממני.</Text>
                  </View>
                  <Text style={[styles.wagerTerms, RTL_CENTER]} allowFontScaling={false}>
                    חזרה מחר = {WAGER_PAYOUT} בחזרה. בלי חזרה — ה-{WAGER_STAKE} שלי.
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(320).duration(320)} style={styles.ctaWrap}>
                  <Pressable
                    onPress={handleAccept}
                    style={[styles.cta, styles.ctaPrimary]}
                    accessibilityRole="button"
                    accessibilityLabel="סגור, מתערבים"
                  >
                    <Text style={styles.ctaText} allowFontScaling={false}>
                      סגור, מתערבים
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDecline}
                    style={[styles.cta, styles.ctaEqual]}
                    accessibilityRole="button"
                    accessibilityLabel="לא הפעם"
                  >
                    <Text style={styles.ctaEqualText} allowFontScaling={false}>
                      לא הפעם
                    </Text>
                  </Pressable>
                </Animated.View>

                {appointmentHour !== null && (
                  <Animated.View entering={FadeIn.delay(400).duration(320)}>
                    <Text style={[styles.appointment, RTL_CENTER]} allowFontScaling={false}>
                      קבענו ל-{appointmentHour}:00 מחר
                    </Text>
                  </Animated.View>
                )}
              </>
            )}
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
    fontSize: 21,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 6,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 22,
  },
  wagerCard: {
    marginTop: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bae6fd',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  wagerHeadline: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  wagerHeadlineRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  coinAmt: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  wagerTerms: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#0e7490',
    lineHeight: 20,
  },
  ctaWrap: {
    marginTop: 18,
    gap: 10,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaPrimary: {
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
  },
  // אודרי #5: the decline carries the same visual weight as the accept —
  // same size, same solid treatment, no shame-button.
  ctaEqual: {
    backgroundColor: '#e0f2fe',
    borderBottomWidth: 4,
    borderBottomColor: '#bae6fd',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  ctaEqualText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0c4a6e',
    writingDirection: 'rtl',
  },
  appointment: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
});
