import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  cancelAnimation,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { Gift } from 'lucide-react-native';

import { useReferralStore } from '../../social/useReferralStore';
import {
  REFERRAL_SIGNUP_BONUS_COINS,
  REFERRAL_DAILY_DIVIDEND_RATE,
} from '../../social/referralConstants';
import { STITCH } from '../../../constants/theme';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { tapHaptic } from '../../../utils/haptics';
import { FinnCue } from './FinnCue';

const DIVIDEND_PERCENT = Math.round(REFERRAL_DAILY_DIVIDEND_RATE * 100);

/** A8: real invite ladder — milestones at 1 → 3 → 5 referred friends. */
const REFERRAL_MILESTONES = [1, 3, 5] as const;

/**
 * Premium CTA button — fantasy-league button language: gradient + border +
 * glow shadow + bold label + shimmer that respects reduced-motion.
 */
function PremiumCta({
  label,
  colors,
  glow,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  colors: readonly [string, string, ...string[]];
  glow: string;
  onPress: () => void;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}): React.ReactElement {
  const reduced = useReducedMotion();
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [reduced, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-70, 70]) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      style={({ pressed }) => ({
        borderRadius: 14,
        shadowColor: glow,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 14,
          paddingVertical: 13,
          paddingHorizontal: 16,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.55)',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, bottom: 0, width: 70 }, shimmerStyle]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {icon}
        <Text
          maxFontSizeMultiplier={1.15}
          style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Friends-feed invite card — the SAME invite-friends action used in the
 * profile (deep-links to the real /referral screen). Rewards shown are the
 * real referral mechanic (single source of truth in referralConstants).
 */
export function ReferralCard(): React.ReactElement {
  const router = useRouter();
  const referredCount = useReferralStore((s) => s.referredFriends.length);

  // A8: every number below is derived ONLY from the real referredFriends count
  // and the real signup-bonus constant — no fabricated milestone jackpots.
  const earnedCoins = referredCount * REFERRAL_SIGNUP_BONUS_COINS;
  const nextMilestone = REFERRAL_MILESTONES.find((m) => referredCount < m) ?? null;
  const toNext = nextMilestone ? nextMilestone - referredCount : 0;
  const nextReward = nextMilestone ? nextMilestone * REFERRAL_SIGNUP_BONUS_COINS : 0;

  /** Fill fraction (0..1) of the connector between two adjacent milestones. */
  const segFill = (from: number, to: number): number => {
    if (referredCount <= from) return 0;
    if (referredCount >= to) return 1;
    return (referredCount - from) / (to - from);
  };

  const openReferral = (): void => {
    tapHaptic();
    router.push('/referral' as never);
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: STITCH.surfaceHighest,
        overflow: 'hidden',
        shadowColor: '#3e3c8f',
        shadowOpacity: 0.09,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* ── Green accent strip (RTL: right edge) ── */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#16a34a', opacity: 0.85, zIndex: 1 }} />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          gap: 10,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#dcfce7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>💎</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
            הזמינו חברים
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1, flexShrink: 1 }}
          >
            {referredCount > 0 ? `${referredCount} כבר הצטרפו דרככם` : 'פרסים אמיתיים לכם ולחברים'}
          </Text>
        </View>
        {referredCount > 0 && (
          <View
            style={{
              backgroundColor: '#dcfce7',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: '#86efac',
            }}
          >
            <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 13, fontWeight: '900', color: '#15803d' }}>
              {referredCount}
            </Text>
          </View>
        )}
      </View>

      {/* ── Reward summary + CTA ── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest, paddingTop: 14, gap: 12 }}>
        {/* ── A8: real milestone ladder (1 → 3 → 5) — progress + earned coins ── */}
        <View>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl' }}>
              {referredCount === 0 ? 'סולם ההזמנות' : `${referredCount} חברים הצטרפו`}
            </Text>
            <View
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}
              accessible
              accessibilityLabel={`הרווחתם ${earnedCoins.toLocaleString('he-IL')} מטבעות מהזמנות`}
            >
              <Text
                maxFontSizeMultiplier={1.15}
                style={{ fontSize: 12.5, fontWeight: '900', color: '#15803d', fontVariant: ['tabular-nums'] }}
              >
                {earnedCoins.toLocaleString('he-IL')}
              </Text>
              <GoldCoinIcon size={13} />
            </View>
          </View>

          {/* Stepper: nodes 1 · 3 · 5 with fill connectors (RTL: 1 on the right) */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            {REFERRAL_MILESTONES.map((m, i) => {
              const reached = referredCount >= m;
              const stepCoins = m * REFERRAL_SIGNUP_BONUS_COINS;
              return (
                <React.Fragment key={m}>
                  {i > 0 && (
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#dcfce7', marginHorizontal: 2, overflow: 'hidden' }}>
                      <View
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: `${segFill(REFERRAL_MILESTONES[i - 1], m) * 100}%`,
                          backgroundColor: '#16a34a',
                        }}
                      />
                    </View>
                  )}
                  <View
                    accessible
                    accessibilityLabel={`מדרגה ${m} חברים — ${stepCoins.toLocaleString('he-IL')} מטבעות${reached ? ', הושלם' : ''}`}
                    style={{ alignItems: 'center', width: 42 }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: reached ? '#15803d' : '#ffffff',
                        borderWidth: 2,
                        borderColor: reached ? '#15803d' : '#86efac',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '900', color: reached ? '#ffffff' : '#15803d' }}>
                        {m}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 2, marginTop: 4 }}>
                      <Text
                        maxFontSizeMultiplier={1.1}
                        style={{ fontSize: 9.5, fontWeight: reached ? '900' : '700', color: reached ? '#15803d' : STITCH.onSurfaceVariant, fontVariant: ['tabular-nums'] }}
                      >
                        {stepCoins.toLocaleString('he-IL')}
                      </Text>
                      <GoldCoinIcon size={10} />
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          {/* Next-step nudge — real remaining count + real cumulative reward */}
          {nextMilestone ? (
            <Text
              maxFontSizeMultiplier={1.15}
              style={{ fontSize: 11.5, fontWeight: '700', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 10 }}
            >
              עוד {toNext} {toNext === 1 ? 'חבר' : 'חברים'} עד מדרגה {nextMilestone} — סה"כ {nextReward.toLocaleString('he-IL')} מטבעות
            </Text>
          ) : (
            <Text
              maxFontSizeMultiplier={1.15}
              style={{ fontSize: 11.5, fontWeight: '800', color: '#15803d', writingDirection: 'rtl', textAlign: 'right', marginTop: 10 }}
            >
              השלמתם את הסולם! כל חבר נוסף = עוד {REFERRAL_SIGNUP_BONUS_COINS.toLocaleString('he-IL')} מטבעות.
            </Text>
          )}
        </View>

        {/* Real reward line — signup bonus for both sides */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <GoldCoinIcon size={14} />
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ fontSize: 13, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl', flexShrink: 1 }}
          >
            {REFERRAL_SIGNUP_BONUS_COINS} מטבעות לכם + {REFERRAL_SIGNUP_BONUS_COINS} לחבר
          </Text>
        </View>
        {/* Daily dividend — real 5% mechanic */}
        <Text
          numberOfLines={2}
          style={{ fontSize: 12, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', flexShrink: 1 }}
        >
          וגם {DIVIDEND_PERCENT}% מהמטבעות שהחברים מרוויחים בלמידה — כל יום.
        </Text>

        <PremiumCta
          label="הזמינו חברים וקבלו פרסים"
          colors={['#22c55e', '#16a34a']}
          glow="#16a34a"
          icon={<Gift size={17} color="#ffffff" strokeWidth={2.6} />}
          accessibilityLabel="הזמינו חברים וקבלו פרסים — פתחו את מסך ההזמנות"
          onPress={openReferral}
        />

        {/* ── Finn coach line ── */}
        <FinnCue
          variant={referredCount > 0 ? 'happy' : 'hello'}
          text={
            referredCount > 0
              ? `${referredCount} חברים כבר איתכם — ממשיכים לבנות`
              : 'כל חבר חדש = פרסים לשניכם. שווה, אה?'
          }
          tone="green"
        />
      </View>
    </View>
  );
}
