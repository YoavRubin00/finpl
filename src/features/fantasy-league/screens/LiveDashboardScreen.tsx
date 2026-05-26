import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FANTASY, type FantasySectorId } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { useEconomy } from '../../economy/useEconomy';
import { STOCK_CATEGORIES, simulateWeeklyReturn } from '../fantasyData';
import {
  F2Header,
  F2Ambient,
  F2ScoreboardHero,
  F2LivePick,
  F2LeaderRow,
} from '../v2/components';
import {
  F2Section,
  F2GameweekMeter,
  F2WalletCluster,
  F2Tag,
} from '../v2/atoms';
import { F2SharkMark, F2Chevron } from '../v2/icons';
import type { StockCategoryId, FantasyTier } from '../fantasyTypes';
import type { SparkPath } from '../v2/atoms';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const CATEGORY_TO_SECTOR: Record<StockCategoryId, FantasySectorId> = {
  tech: 'tech',
  spec_growth: 'spec_growth',
  energy: 'energy',
  israel: 'israel',
  crypto: 'crypto',
};

const TIER_LABEL: Record<FantasyTier, string> = {
  silver: 'ליגת הכסף',
  gold: 'ליגת הזהב',
  diamond: 'ליגת היהלומים',
};

function sparkForReturn(ret: number): SparkPath {
  if (ret >= 8) return 'rally';
  if (ret >= 3) return 'rising';
  if (ret >= 0.5) return 'up';
  if (ret > -0.5) return 'wave';
  if (ret > -3) return 'flat';
  if (ret > -8) return 'down';
  return 'crash';
}

export function LiveDashboardScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);
  const getEffectiveAverageReturn = useFantasyStore((s) => s.getEffectiveAverageReturn);
  const { data: economyData } = useEconomy();
  const coins = economyData?.coins ?? 0;
  const xp = economyData?.xp ?? 0;

  // Tick every minute to refresh "live" returns
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const leaderboard = useMemo(
    () => getLeaderboardWithLocal(),
    [getLeaderboardWithLocal, tick],
  );
  const localEntry = leaderboard.find((e) => e.isLocal);
  const avgReturn = getAverageReturn();
  const effReturn = getEffectiveAverageReturn();
  const captainBoost = Math.round((effReturn - avgReturn) * 100) / 100;
  const rank = localEntry?.rank ?? leaderboard.length + 1;
  const totalPlayers = leaderboard.length || 100;

  // Live returns mock — refreshed by tick
  const liveReturns = useMemo(() => {
    if (!currentEntry) return {};
    const weekKey = currentEntry.weekId + String(Math.floor(tick / 5));
    const result: Record<string, number> = {};
    currentEntry.picks.forEach((pick) => {
      result[pick.ticker] = simulateWeeklyReturn(pick.ticker, weekKey);
    });
    return result;
  }, [currentEntry, tick]);

  const stockToCategory = useMemo(() => {
    const map: Record<string, StockCategoryId> = {};
    STOCK_CATEGORIES.forEach((cat) => {
      cat.stocks.forEach((s) => { map[s.ticker] = cat.id; });
    });
    return map;
  }, []);

  const tierLabel = currentEntry ? TIER_LABEL[currentEntry.tier] : 'ליגת הזהב';

  // Pre-entry empty state
  if (!currentEntry) {
    return (
      <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
        <F2Ambient tone="sky" />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <F2Header
            eyebrow={tierLabel}
            title="לוח חי"
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
              לא נרשמת לתחרות השבוע
            </Text>
            <Text style={{
              fontSize: 13,
              color: FANTASY.inkMuted,
              ...RTL,
              textAlign: 'center',
              lineHeight: 19,
            }}>
              הצטרף לדראפט, בחר 5 מניות, ונה קפטן —{'\n'}ותתחיל לאסוף נקודות
            </Text>
            <Pressable
              onPress={() => router.push('/fantasy/draft')}
              style={({ pressed }) => ({
                marginTop: 12,
                backgroundColor: FANTASY.primary,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                borderBottomWidth: 3,
                borderBottomColor: FANTASY.primaryDark,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
                פתח את הדראפט
              </Text>
            </Pressable>
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
          eyebrow={`${tierLabel} · חי`}
          title="לוח חי"
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
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, gap: 12 }}
        >
          {/* Scoreboard hero */}
          <Animated.View entering={FadeInDown.duration(360)}>
            <F2ScoreboardHero
              returnPercent={effReturn}
              rank={rank}
              rankDelta={rank <= 3 ? 2 : -1}
              prevRank={rank + 2}
              captainBoost={Math.abs(captainBoost) > 0.01 ? captainBoost : undefined}
            />
          </Animated.View>

          {/* Gameweek meter */}
          <Animated.View entering={FadeInDown.delay(60).duration(320)}>
            <F2GameweekMeter day={4} total={7} deadline="2י׳ 14:32" />
          </Animated.View>

          {/* Portfolio */}
          {currentEntry.picks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(120).duration(320)}>
              <F2Section
                action="ערוך תיק"
                hint="לחץ על תיק לפרטים"
                onActionPress={() => router.push('/fantasy/draft')}
              >
                התיק שלך
              </F2Section>
              <View style={{ gap: 7 }}>
                {currentEntry.picks.map((pick, idx) => {
                  const categoryId = stockToCategory[pick.ticker] ?? pick.categoryId;
                  const sector = CATEGORY_TO_SECTOR[categoryId] ?? 'tech';
                  const ret = liveReturns[pick.ticker] ?? pick.returnPercent ?? 0;
                  const isCap = currentEntry.captainTicker === pick.ticker;
                  return (
                    <Animated.View
                      key={pick.ticker}
                      entering={FadeIn.delay(idx * 60).duration(280)}
                    >
                      <F2LivePick
                        ticker={pick.ticker}
                        name={pick.stockName}
                        sector={sector}
                        todayChange={ret / 5}
                        totalChange={ret}
                        isCaptain={isCap}
                        allocation={pick.allocation}
                        spark={sparkForReturn(ret)}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Leaderboard — continuous list, no zone banners */}
          <Animated.View entering={FadeInDown.delay(200).duration(320)}>
            <F2Section hint={`#${rank} מתוך ${totalPlayers}`}>
              לוח התוצאות
            </F2Section>

            {/* Top 10 */}
            <View style={{ gap: 5 }}>
              {leaderboard.slice(0, 10).map((entry) => (
                <F2LeaderRow
                  key={entry.playerId}
                  rank={entry.rank}
                  name={entry.isLocal ? 'את/ה' : entry.displayName}
                  returnPercent={entry.returnPercent}
                  change={entry.change}
                  isLocal={entry.isLocal}
                />
              ))}

              {/* Local position if outside top 10 */}
              {localEntry && localEntry.rank > 10 && (
                <>
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 6,
                    marginTop: 4,
                    marginBottom: 4,
                  }}>
                    <Text style={{
                      fontSize: 10,
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
