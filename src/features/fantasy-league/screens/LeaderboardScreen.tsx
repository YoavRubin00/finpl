import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FANTASY } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { useEconomyStore } from '../../economy/useEconomyStore';
import {
  F2Header,
  F2Ambient,
  F2LeaderRow,
  F2H2HCard,
} from '../v2/components';
import {
  F2Section,
  F2Chip,
  F2WalletCluster,
  F2Tag,
} from '../v2/atoms';
import { F2Chevron, F2SharkMark } from '../v2/icons';
import type { FantasyTier } from '../fantasyTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const TIER_LABEL: Record<FantasyTier, string> = {
  silver: 'ליגת הכסף',
  gold: 'ליגת הזהב',
  diamond: 'ליגת היהלומים',
};

type FilterKey = 'global' | 'friends' | 'month' | 'season';

function zoneForRank(rank: number, total: number): 'promoted' | 'demoted' | 'stable' {
  const promote = Math.max(3, Math.ceil(total * 0.2));
  const relegate = Math.max(3, Math.ceil(total * 0.2));
  if (rank <= promote) return 'promoted';
  if (rank > total - relegate) return 'demoted';
  return 'stable';
}

export function LeaderboardScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const getEffectiveAverageReturn = useFantasyStore((s) => s.getEffectiveAverageReturn);
  const coins = useEconomyStore((s) => s.coins);
  const xp = useEconomyStore((s) => s.xp);

  const [filter, setFilter] = useState<FilterKey>('global');

  const leaderboard = useMemo(
    () => (currentEntry ? getLeaderboardWithLocal() : []),
    [currentEntry, getLeaderboardWithLocal],
  );

  const localEntry = leaderboard.find((e) => e.isLocal);
  const rank = localEntry?.rank ?? leaderboard.length + 1;
  const totalPlayers = leaderboard.length || 100;
  const effReturn = getEffectiveAverageReturn();

  // Opponent for H2H: player one rank above local
  const opponent = leaderboard.find((e) => !e.isLocal && e.rank === Math.max(1, rank - 1));

  // Partition rows: top 4 promote, local row + neighbors, bottom 2 relegate
  const top4 = leaderboard.slice(0, 4);
  const bottom2 = leaderboard.slice(-2);
  const middleStart = Math.max(4, rank - 2);
  const middleEnd = Math.min(leaderboard.length - 2, rank + 2);
  const middleRows =
    localEntry && localEntry.rank > 4 && localEntry.rank < totalPlayers - 1
      ? leaderboard.slice(middleStart, middleEnd + 1)
      : [];

  const tierLabel = currentEntry ? TIER_LABEL[currentEntry.tier] : 'ליגת הזהב';

  // Empty state
  if (!currentEntry) {
    return (
      <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
        <F2Ambient tone="sky" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <F2Header
            eyebrow={tierLabel}
            title="דירוג"
            back
            onBack={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/fantasy');
            }}
            right={<F2WalletCluster xp={xp} coins={coins} />}
          />
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            gap: 14,
          }}>
            <F2SharkMark size={64} />
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: FANTASY.ink,
              ...RTL,
              textAlign: 'center',
            }}>
              אין דירוג עדיין
            </Text>
            <Text style={{
              fontSize: 13,
              color: FANTASY.inkMuted,
              ...RTL,
              textAlign: 'center',
              lineHeight: 19,
            }}>
              הצטרף לתחרות השבועית{'\n'}כדי לראות את הדירוג שלך
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
      <F2Ambient tone="sky" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <F2Header
          eyebrow={`${tierLabel} · ${totalPlayers} שחקנים`}
          title="דירוג"
          back
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/fantasy');
          }}
          right={<F2WalletCluster xp={xp} coins={coins} />}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, gap: 12 }}
        >
          {/* Sub-tabs */}
          <Animated.View entering={FadeInDown.duration(280)}>
            <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
              <F2Chip active={filter === 'global'} onPress={() => setFilter('global')}>
                כללי
              </F2Chip>
              <F2Chip active={filter === 'friends'} onPress={() => setFilter('friends')}>
                חברים
              </F2Chip>
              <F2Chip active={filter === 'month'} onPress={() => setFilter('month')}>
                החודש
              </F2Chip>
              <F2Chip active={filter === 'season'} onPress={() => setFilter('season')}>
                העונה
              </F2Chip>
            </View>
          </Animated.View>

          {/* H2H matchup */}
          {opponent && (
            <Animated.View entering={FadeInDown.delay(60).duration(320)}>
              <F2Section>קרב השבוע</F2Section>
              <F2H2HCard
                me={{ name: 'את/ה', returnPercent: effReturn, picks: currentEntry.picks.length }}
                opp={{
                  name: opponent.displayName,
                  returnPercent: opponent.returnPercent,
                  picks: 5,
                }}
              />
            </Animated.View>
          )}

          {/* Top 4 — Promote zone */}
          <Animated.View entering={FadeInDown.delay(120).duration(320)}>
            <F2Section hint="עולים לליגה הבאה">דירוג סופי</F2Section>
            <View style={{
              backgroundColor: FANTASY.positiveSoft,
              borderWidth: 1,
              borderColor: FANTASY.positiveStroke,
              borderRadius: 10,
              paddingVertical: 6,
              paddingHorizontal: 10,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
              alignSelf: 'flex-start',
            }}>
              <F2Chevron size={10} dir="up" color={FANTASY.positiveDark} />
              <Text style={{
                fontSize: 10,
                color: FANTASY.positiveDark,
                fontWeight: '800',
                letterSpacing: 0.4,
              }}>
                אזור עלייה · 4 ראשונים
              </Text>
            </View>
            <View style={{ gap: 5 }}>
              {top4.map((entry) => (
                <F2LeaderRow
                  key={entry.playerId}
                  rank={entry.rank}
                  name={entry.isLocal ? 'את/ה' : entry.displayName}
                  returnPercent={entry.returnPercent}
                  change={entry.change}
                  isLocal={entry.isLocal}
                  position="promoted"
                />
              ))}
            </View>
          </Animated.View>

          {/* Middle (local + neighbors) */}
          {middleRows.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(320)}>
              <View style={{
                backgroundColor: FANTASY.surfaceMuted,
                borderRadius: 10,
                paddingVertical: 6,
                paddingHorizontal: 10,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 4,
                marginBottom: 8,
                alignSelf: 'flex-start',
              }}>
                <Text style={{
                  fontSize: 10,
                  color: FANTASY.inkLabel,
                  fontWeight: '800',
                  letterSpacing: 0.4,
                }}>
                  אזור בטוח · המיקום שלך
                </Text>
              </View>
              <View style={{ gap: 5 }}>
                {middleRows.map((entry) => {
                  const zone = zoneForRank(entry.rank, totalPlayers);
                  return (
                    <F2LeaderRow
                      key={entry.playerId}
                      rank={entry.rank}
                      name={entry.isLocal ? 'את/ה' : entry.displayName}
                      returnPercent={entry.returnPercent}
                      change={entry.change}
                      isLocal={entry.isLocal}
                      position={zone}
                    />
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Bottom 2 — Relegate zone */}
          <Animated.View entering={FadeInDown.delay(280).duration(320)}>
            <View style={{
              backgroundColor: FANTASY.negativeSoft,
              borderWidth: 1,
              borderColor: FANTASY.negativeStroke,
              borderRadius: 10,
              paddingVertical: 6,
              paddingHorizontal: 10,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 4,
              marginBottom: 8,
              alignSelf: 'flex-start',
            }}>
              <F2Chevron size={10} dir="down" color={FANTASY.negativeDark} />
              <Text style={{
                fontSize: 10,
                color: FANTASY.negativeDark,
                fontWeight: '800',
                letterSpacing: 0.4,
              }}>
                אזור ירידה · 2 אחרונים
              </Text>
            </View>
            <View style={{ gap: 5 }}>
              {bottom2.map((entry) => (
                <F2LeaderRow
                  key={entry.playerId}
                  rank={entry.rank}
                  name={entry.isLocal ? 'את/ה' : entry.displayName}
                  returnPercent={entry.returnPercent}
                  change={entry.change}
                  isLocal={entry.isLocal}
                  position="demoted"
                />
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
