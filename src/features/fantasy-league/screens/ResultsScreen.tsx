import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';
import { FANTASY } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { useEconomy } from '../../economy/useEconomy';
import {
  F2Header,
  F2Ambient,
  F2PrizesGrid,
} from '../v2/components';
import {
  F2Button,
  F2WalletCluster,
} from '../v2/atoms';
import { F2Trophy } from '../v2/icons';
import type { FantasyTier } from '../fantasyTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ─── Confetti — fires on claiming (finishing the season), a real personal
// milestone. NOT gated on a fabricated rank (there are no real opponents yet). ─
const CONFETTI_COLORS = ['#fbbf24', '#fcd34d', '#7dd3fc', '#38bdf8', '#a78bfa', '#16a34a'];

function ConfettiBurst(): React.ReactElement {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  const animations = useRef(
    pieces.map(() => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    const anims = pieces.map((_, i) => {
      const { y, x, opacity, rotate } = animations[i];
      const dx = (Math.random() - 0.5) * 300;
      const dy = Math.random() * 360 + 80;
      return Animated.parallel([
        Animated.timing(y, { toValue: dy, duration: 1300, delay: i * 35, useNativeDriver: true }),
        Animated.timing(x, { toValue: dx, duration: 1300, delay: i * 35, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(700 + i * 25),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 6, duration: 1300, delay: i * 35, useNativeDriver: true }),
      ]);
    });
    Animated.stagger(20, anims).start();
  }, [animations, pieces]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((_, i) => {
        const { y, x, opacity, rotate } = animations[i];
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = Math.random() * 7 + 5;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 80,
              left: '50%',
              width: size,
              height: size,
              borderRadius: size / 4,
              backgroundColor: color,
              transform: [
                { translateX: x },
                { translateY: y },
                { rotate: rotate.interpolate({ inputRange: [0, 6], outputRange: ['0deg', '360deg'] }) },
              ],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_LABEL: Record<FantasyTier, string> = {
  silver: 'ליגת הכסף',
  gold: 'ליגת הזהב',
  diamond: 'ליגת היהלומים',
};

// ─── Main screen ─────────────────────────────────────────────────────────────
export function ResultsScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const claimResults = useFantasyStore((s) => s.claimResults);
  const simulateFinalPrices = useFantasyStore((s) => s.simulateFinalPrices);
  const resetForNewWeek = useFantasyStore((s) => s.resetForNewWeek);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);
  const getEffectiveAverageReturn = useFantasyStore((s) => s.getEffectiveAverageReturn);
  const { data: economyData } = useEconomy();
  const coins = economyData?.coins ?? 0;
  const xp = economyData?.xp ?? 0;

  useEffect(() => {
    if (currentEntry && currentEntry.picks.some((p) => p.finalPrice === null)) {
      simulateFinalPrices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No fabricated competitors. Until a server-side settle against real
  // registered players exists, this is an honest SOLO-vs-market result: the
  // user's own portfolio performance — no fake rank / podium / opponents /
  // "of 100 players" (Yoav 2026-07, zero-fabrication rule).
  const avgReturn = getAverageReturn();
  const effReturn = getEffectiveAverageReturn();
  const hasClaimed = currentEntry?.claimed ?? false;
  const hasUnclaimed = !!currentEntry && !hasClaimed;
  const returnPositive = effReturn >= 0;

  // Real, self-based rewards only: coins-back = the user's own entry adjusted by
  // their own market return; XP = the flat participation amount the store grants.
  // No rank multipliers, no gems (those were prizes vs fabricated opponents).
  const coinsBack = currentEntry ? Math.round(currentEntry.coinsPaid * (1 + effReturn / 100)) : 0;
  const xpEarned = currentEntry?.xpEarned ?? 25;

  const handleClaim = (): void => {
    claimResults();
  };

  const handleNextSeason = (): void => {
    resetForNewWeek();
    router.replace('/(tabs)/fantasy');
  };

  return (
    <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
      <F2Ambient tone="gold" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {hasClaimed && <ConfettiBurst />}

        <F2Header
          eyebrow={`סוף שבוע · ${currentEntry ? TIER_LABEL[currentEntry.tier] : ''}`}
          title="תוצאות סופיות"
          back
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/fantasy');
            }
          }}
          right={<F2WalletCluster xp={xp} coins={coins} />}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, gap: 14 }}
        >
          {/* Title — honest personal result (your own return, no fake rank) */}
          <AnimatedReanimated.View entering={FadeInDown.duration(360)} style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: FANTASY.ink, letterSpacing: -0.3 }} maxFontSizeMultiplier={1.3}>
              העונה הסתיימה!
            </Text>
            {currentEntry && (
              <Text
                style={{ fontSize: 14, color: returnPositive ? FANTASY.positiveDark : FANTASY.negativeDark, marginTop: 4, fontWeight: '900', fontVariant: ['tabular-nums'] }}
                maxFontSizeMultiplier={1.3}
              >
                {returnPositive ? 'התיק שלכם עלה' : 'התיק שלכם ירד'} {effReturn >= 0 ? '+' : ''}{effReturn.toFixed(2)}% השבוע
              </Text>
            )}
          </AnimatedReanimated.View>

          {/* Prizes grid — real self-based rewards (no gems vs fake opponents) */}
          {currentEntry && (
            <AnimatedReanimated.View entering={FadeInDown.delay(200).duration(340)}>
              <F2PrizesGrid xp={xpEarned} gems={0} coins={coinsBack} />
            </AnimatedReanimated.View>
          )}

          {/* Summary card — all real self-data */}
          {currentEntry && (
            <AnimatedReanimated.View entering={FadeInDown.delay(280).duration(320)}>
              <View style={{
                backgroundColor: FANTASY.surfaceCard,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: FANTASY.borderStrong,
                padding: 14,
                gap: 10,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.ink, ...RTL }} maxFontSizeMultiplier={1.3}>
                  הסיכום שלכם
                </Text>
                {[
                  {
                    label: 'תשואה ממוצעת',
                    value: `${effReturn >= 0 ? '+' : ''}${effReturn.toFixed(2)}%`,
                    color: returnPositive ? FANTASY.positiveDark : FANTASY.negativeDark,
                  },
                  {
                    label: 'מטבעות שהוחזרו',
                    value: `${coinsBack.toLocaleString('he-IL')}`,
                    color: FANTASY.warningDark,
                  },
                  {
                    label: 'בונוס קפטן',
                    value: currentEntry.captainTicker
                      ? `+${Math.round((effReturn - avgReturn) * 5)} pts`
                      : 'לא הוגדר',
                    color: currentEntry.captainTicker ? FANTASY.warningDark : FANTASY.inkFaint,
                  },
                ].map((row) => (
                  <View
                    key={row.label}
                    style={{
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: FANTASY.inkMuted, fontWeight: '700' }}>
                      {row.label}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '900',
                      color: row.color,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </AnimatedReanimated.View>
          )}

          {/* Competitive ranking — honest: it opens with real players */}
          <AnimatedReanimated.View entering={FadeInDown.delay(360).duration(320)}>
            <View style={{
              backgroundColor: FANTASY.surfaceCard,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: FANTASY.borderStrong,
              padding: 14,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.ink, ...RTL }} maxFontSizeMultiplier={1.3}>
                דירוג מול שחקנים אמיתיים
              </Text>
              <Text style={{ fontSize: 12, color: FANTASY.inkMuted, fontWeight: '700', ...RTL, marginTop: 4, lineHeight: 18 }} maxFontSizeMultiplier={1.3}>
                השבוע שיחקתם מול השוק. הדירוג מול חברים ומשתתפים אחרים ייפתח כשעוד שחקנים אמיתיים יצטרפו לליגה.
              </Text>
            </View>
          </AnimatedReanimated.View>

          {/* CTA */}
          <AnimatedReanimated.View entering={FadeInDown.delay(440).duration(320)}>
            {hasUnclaimed ? (
              <F2Button
                tone="gold"
                size="lg"
                onPress={handleClaim}
                icon={<F2Trophy size={16} color="#451a03" />}
              >
                אספו את הפרסים
              </F2Button>
            ) : (
              <F2Button
                tone="primary"
                size="lg"
                onPress={handleNextSeason}
              >
                לעונה הבאה →
              </F2Button>
            )}
          </AnimatedReanimated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
