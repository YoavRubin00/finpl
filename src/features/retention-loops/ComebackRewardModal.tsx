import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Anchor, Shield } from 'lucide-react-native';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { FINN_HELLO } from './finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/** R8 T3.2 — coin amount awarded with every comeback claim. */
export const COMEBACK_COINS = 200;

interface ComebackRewardModalProps {
  visible: boolean;
  /** How long the user was away — drives the headline copy. */
  lapsedDays: number;
  /** Tap "אסוף את המתנה" — parent grants coins + 1 streak freeze and
   *  clears the pending claim. */
  onClaim: () => void;
  /** Tap "אולי אחר כך" or Android-back — clears the pending claim WITHOUT
   *  granting the reward. Distinct from onClaim so dismissing isn't a free
   *  coin grant (Yoav 2026-06-11 QA: skip used to call onClaim → leak). */
  onDismiss: () => void;
}

/**
 * R8 T3.2 — Welcome-back modal that surfaces on the first interactive
 * paint after the user returns from a ≥7-day lapse. Mirrors Duolingo's
 * comeback nudge ("we missed you — here's a gift") which lifts D30
 * reactivation +15% in their A/B history.
 *
 * Gift: +200 coins + 1 streak freeze (so the user can re-engage today
 * without immediately hemorrhaging their resurrected streak).
 */
export function ComebackRewardModal({
  visible,
  lapsedDays,
  onClaim,
  onDismiss,
}: ComebackRewardModalProps): React.ReactElement | null {
  const reduceMotion = useReducedMotion();
  if (!visible) return null;

  const handleClaim = () => {
    successHaptic();
    onClaim();
  };
  const handleDismiss = () => {
    tapHaptic();
    onDismiss();
  };

  // Copy adapts to lapse duration — short lapse stays warm, long lapse
  // leans on "we missed you" intimacy instead of pretending nothing
  // happened.
  // R8 follow-up (Yoav 2026-06-11): drop the shark emoji from the headline.
  // The FINN_HELLO mascot at the top of the card already carries the
  // shark identity — no need for the emoji crutch.
  const headline = lapsedDays >= 30
    ? 'ברוך השב! ⚓'
    : 'התגעגענו אליך!';
  const subhead = lapsedDays >= 30
    ? `עברו ${lapsedDays} ימים — הקפטן שמר לך משהו`
    : `${lapsedDays} ימים בלעדיך — הנה מתנה חוזרת`;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleDismiss}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(380)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage
                source={FINN_HELLO}
                style={styles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(160).duration(360)}>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                {headline}
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                {subhead}
              </Text>
            </Animated.View>

            {/* Gift bullets — coins + streak freeze */}
            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(240).duration(360)} style={styles.giftWrap}>
              <View style={styles.giftRow}>
                <GoldCoinIcon size={22} />
                <Text style={[styles.giftText, RTL]} allowFontScaling={false}>
                  {`+${COMEBACK_COINS} מטבעות`}
                </Text>
              </View>
              <View style={styles.giftRow}>
                <Shield size={22} color="#0c4a6e" strokeWidth={2.6} />
                <Text style={[styles.giftText, RTL]} allowFontScaling={false}>
                  קפיאת רצף — שומר על היום הראשון שלך
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(320).duration(360)}>
              <Pressable
                onPress={handleClaim}
                style={styles.cta}
                accessibilityRole="button"
                accessibilityLabel="אסוף את המתנה"
              >
                <Anchor size={22} color="#ffffff" strokeWidth={2.6} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  אסוף את המתנה
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDismiss}
                style={styles.skipBtn}
                accessibilityRole="button"
                accessibilityLabel="אולי אחר כך"
              >
                <Text style={[styles.skipText, RTL_CENTER]} allowFontScaling={false}>
                  אולי אחר כך
                </Text>
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
    marginTop: 6,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 22,
  },
  giftWrap: {
    marginTop: 18,
    marginBottom: 6,
    gap: 10,
  },
  giftRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  giftText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0c4a6e',
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0e7490',
    borderBottomWidth: 4,
    borderBottomColor: '#155e75',
    marginTop: 18,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  skipBtn: {
    marginTop: 10,
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
});
