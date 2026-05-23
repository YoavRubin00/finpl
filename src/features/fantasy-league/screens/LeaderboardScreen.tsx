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

  // Continuous list: top 10 + ellipsis + local row if not in top 10.
  const top10 = leaderboard.slice(0, 10);
  const showLocalSeparately = !!localEntry && localEntry.rank > 10;

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

          {/* Continuous leaderboard — top 10 + ellipsis + local row */}
          <Animated.View entering={FadeInDown.delay(120).duration(320)}>
            <F2Section hint={`${totalPlayers} שחקנים`}>דירוג הליגה</F2Section>
            <View style={{ gap: 5 }}>
              {top10.map((entry) => (
                <F2LeaderRow
                  key={entry.playerId}
                  rank={entry.rank}
                  name={entry.isLocal ? 'את/ה' : entry.displayName}
                  returnPercent={entry.returnPercent}
                  change={entry.change}
                  isLocal={entry.isLocal}
                />
              ))}
              {showLocalSeparately && localEntry && (
                <>
                  <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={{
                      fontSize: 11,
                      color: FANTASY.inkFaint,
                      fontWeight: '800',
                      letterSpacing: 0.6,
                    }}>
                      · · ·
                    </Text>
                  </View>
                  <F2LeaderRow
                    rank={localEntry.rank}
                    name="את/ה"
                    returnPercent={localEntry.returnPercent}
                    change={localEntry.change}
                    isLocal
                  />
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
