import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AnimatedReanimated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { FANTASY } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { getMockLeaderboard, getCurrentWeekId, TIER_CONFIGS } from '../fantasyData';
import {
  F2Header,
  F2Ambient,
  F2Podium,
  F2PrizesGrid,
  F2LeaderRow,
} from '../v2/components';
import {
  F2Button,
  F2Tag,
  F2WalletCluster,
} from '../v2/atoms';
import { F2TierShield, F2Trophy } from '../v2/icons';
import type { FantasyTier } from '../fantasyTypes';
import type { TierKey } from '../v2/icons';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ─── Confetti (top-3 only) ───────────────────────────────────────────────────
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
const TIER_TO_SHIELD: Record<FantasyTier, TierKey> = {
  silver: 'silver',
  gold: 'gold',
  diamond: 'gold',
};

const NEXT_TIER: Record<FantasyTier, FantasyTier> = {
  silver: 'gold',
  gold: 'diamond',
  diamond: 'diamond',
};

const TIER_LABEL: Record<FantasyTier, string> = {
  silver: 'ליגת הכסף',
  gold: 'ליגת הזהב',
  diamond: 'ליגת היהלומים',
};

function zoneForRank(rank: number, total: number): 'promote' | 'safe' | 'relegate' {
  const promote = Math.max(3, Math.ceil(total * 0.2));
  const relegate = Math.max(3, Math.ceil(total * 0.2));
  if (rank <= promote) return 'promote';
  if (rank > total - relegate) return 'relegate';
  return 'safe';
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function ResultsScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const claimResults = useFantasyStore((s) => s.claimResults);
  const simulateFinalPrices = useFantasyStore((s) => s.simulateFinalPrices);
  const resetForNewWeek = useFantasyStore((s) => s.resetForNewWeek);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);
  const getEffectiveAverageReturn = useFantasyStore((s) => s.getEffectiveAverageReturn);
  const coins = useEconomyStore((s) => s.coins);
  const xp = useEconomyStore((s) => s.xp);

  useEffect(() => {
    if (currentEntry && currentEntry.picks.some((p) => p.finalPrice === null)) {
      simulateFinalPrices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaderboard = useMemo(
    () =>
      currentEntry
        ? getMockLeaderboard(currentEntry.tier, currentEntry.weekId)
        : getMockLeaderboard('silver', getCurrentWeekId()),
    [currentEntry],
  );

  const totalPlayers = leaderboard.length || 100;
  const avgReturn = getAverageReturn();
  const effReturn = getEffectiveAverageReturn();
  const rank = currentEntry?.finalRank ?? leaderboard.length + 1;
  const isTop3 = rank <= 3;
  const hasClaimed = currentEntry?.claimed ?? false;
  const hasUnclaimed = !!currentEntry && !hasClaimed;
  const returnPositive = effReturn >= 0;

  const tierConfig = currentEntry ? TIER_CONFIGS[currentEntry.tier] : null;
  const coinsBack = currentEntry ? Math.round(currentEntry.coinsPaid * (1 + effReturn / 100)) : 0;
  const xpEarned = currentEntry?.xpEarned ??
    (tierConfig && rank >= 1 && rank <= 5 ? tierConfig.prizeXP[rank - 1] : 25);
  const gemsEarned = isTop3 ? 50 : rank <= 5 ? 30 : 10;

  const zone = zoneForRank(rank, totalPlayers);
  const isPromoted = zone === 'promote';
  const isDemoted = zone === 'relegate';

  // Top 3 podium — substitute local player if they made it
  const top3 = useMemo(() => {
    const list = leaderboard.slice(0, 3).map((e) => ({ ...e, isLocal: false }));
    if (currentEntry && rank <= 3) {
      list[rank - 1] = { ...list[rank - 1], displayName: 'את/ה', isLocal: true };
    }
    return list;
  }, [leaderboard, rank, currentEntry]);

  const fromTier: FantasyTier = currentEntry?.tier ?? 'silver';
  const toTier: FantasyTier = NEXT_TIER[fromTier];

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
        {isTop3 && hasClaimed && <ConfettiBurst />}

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
          {/* Title */}
          <AnimatedReanimated.View entering={FadeInDown.duration(360)} style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: FANTASY.ink, letterSpacing: -0.3 }}>
              העונה הסתיימה!
            </Text>
            <Text style={{ fontSize: 13, color: FANTASY.inkMuted, marginTop: 4, fontWeight: '700' }}>
              סיימת במקום #{rank} מתוך {totalPlayers}
            </Text>
          </AnimatedReanimated.View>

          {/* Podium */}
          <AnimatedReanimated.View entering={ZoomIn.delay(120).duration(420).springify()}>
            <F2Podium winners={top3.map((e, i) => ({
              rank: (i + 1) as 1 | 2 | 3,
              name: e.displayName,
              returnPercent: e.returnPercent,
              isLocal: e.isLocal,
            }))} />
          </AnimatedReanimated.View>

          {/* Promotion banner */}
          {isPromoted && currentEntry && toTier !== fromTier && (
            <AnimatedReanimated.View entering={FadeInDown.delay(320).duration(360)}>
              <View style={{
                backgroundColor: FANTASY.purpleSoft,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#c4b5fd',
                padding: 14,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 12,
              }}>
                <F2TierShield tier={TIER_TO_SHIELD[toTier]} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '900',
                    color: FANTASY.purple,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    ...RTL,
                  }}>
                    קידום!
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: FANTASY.ink, ...RTL, marginTop: 2 }}>
                    עלית ל{TIER_LABEL[toTier]} 🎉
                  </Text>
                </View>
              </View>
            </AnimatedReanimated.View>
          )}

          {/* Demotion banner */}
          {isDemoted && (
            <AnimatedReanimated.View entering={FadeInDown.delay(320).duration(360)}>
              <View style={{
                backgroundColor: FANTASY.negativeSoft,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: FANTASY.negativeStroke,
                padding: 14,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 12,
              }}>
                <Text style={{ fontSize: 26 }}>📉</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: FANTASY.negativeDark, ...RTL }}>
                    ירדת ליגה
                  </Text>
                  <Text style={{ fontSize: 12, color: FANTASY.negativeDark, ...RTL, marginTop: 2 }}>
                    שבוע הבא הזדמנות לחזרה
                  </Text>
                </View>
              </View>
            </AnimatedReanimated.View>
          )}

          {/* Prizes grid */}
          {currentEntry && (
            <AnimatedReanimated.View entering={FadeInDown.delay(420).duration(340)}>
              <F2PrizesGrid xp={xpEarned} gems={gemsEarned} coins={coinsBack} />
            </AnimatedReanimated.View>
          )}

          {/* Summary card */}
          {currentEntry && (
            <AnimatedReanimated.View entering={FadeInDown.delay(500).duration(320)}>
              <View style={{
                backgroundColor: FANTASY.surfaceCard,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: FANTASY.borderStrong,
                padding: 14,
                gap: 10,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.ink, ...RTL }}>
                  הסיכום שלך
                </Text>
                {[
                  {
                    label: 'תשואה ממוצעת',
                    value: `${effReturn >= 0 ? '+' : ''}${effReturn.toFixed(2)}%`,
                    color: returnPositive ? FANTASY.positiveDark : FANTASY.negativeDark,
                  },
                  {
                    label: 'מטבעות שהוחזרו',
                    value: `${coinsBack.toLocaleString('he-IL')} 💰`,
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

          {/* Final leaderboard */}
          <AnimatedReanimated.View entering={FadeInDown.delay(580).duration(320)}>
            <Text style={{
              fontSize: 14,
              fontWeight: '900',
              color: FANTASY.ink,
              ...RTL,
              marginBottom: 6,
            }}>
              דירוג סופי
            </Text>
            <View style={{ gap: 5 }}>
              {leaderboard.slice(0, 5).map((entry) => {
                const isLocalRow = currentEntry ? entry.rank === rank && rank <= 5 : false;
                const entryZone = zoneForRank(entry.rank, totalPlayers);
                return (
                  <F2LeaderRow
                    key={entry.playerId}
                    rank={entry.rank}
                    name={isLocalRow ? 'את/ה' : entry.displayName}
                    returnPercent={entry.returnPercent}
                    change={entry.change}
                    isLocal={isLocalRow}
                    position={entryZone === 'promote' ? 'promoted' : entryZone === 'relegate' ? 'demoted' : 'stable'}
                  />
                );
              })}
              {currentEntry && rank > 5 && (
                <>
                  <Text style={{
                    fontSize: 14,
                    color: FANTASY.inkFaint,
                    textAlign: 'center',
                    fontWeight: '800',
                    marginVertical: 4,
                  }}>
                    · · ·
                  </Text>
                  <F2LeaderRow
                    rank={rank}
                    name="את/ה"
                    returnPercent={effReturn}
                    isLocal
                    position={zone === 'promote' ? 'promoted' : zone === 'relegate' ? 'demoted' : 'stable'}
                  />
                </>
              )}
            </View>
          </AnimatedReanimated.View>

          {/* CTA */}
          <AnimatedReanimated.View entering={FadeInDown.delay(660).duration(320)}>
            {hasUnclaimed ? (
              <F2Button
                tone="gold"
                size="lg"
                onPress={handleClaim}
                icon={<F2Trophy size={16} color="#451a03" />}
              >
                🎁 אסוף פרסים
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
