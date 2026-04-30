import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CLASH, DUO } from '../../../constants/theme';
import { FINN_HAPPY, FINN_EMPATHIC } from '../../retention-loops/finnMascotConfig';
import { useFantasyStore } from '../useFantasyStore';
import { STOCK_CATEGORIES, simulateWeeklyReturn } from '../fantasyData';

function StockLiveRow({ ticker, stockName, returnPercent }: { ticker: string; stockName: string; returnPercent: number }): React.ReactElement {
  const positive = returnPercent >= 0;
  const barWidth = Math.min(Math.abs(returnPercent) * 4, 100);

  return (
    <View style={styles.stockRow}>
      <View style={styles.stockRowLeft}>
        <View style={styles.tickerBadge}>
          <Text style={styles.tickerText}>{ticker}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockName} numberOfLines={1}>{stockName}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${barWidth}%`,
                  backgroundColor: positive ? '#4ade80' : '#f87171',
                  alignSelf: positive ? 'flex-end' : 'flex-start',
                },
              ]}
            />
          </View>
        </View>
      </View>
      <Text style={[styles.stockReturn, { color: positive ? '#4ade80' : '#f87171' }]}>
        {positive ? '+' : ''}{returnPercent.toFixed(1)}%
      </Text>
    </View>
  );
}

export function LiveDashboardScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);

  const leaderboard = useMemo(() => getLeaderboardWithLocal(), [getLeaderboardWithLocal]);
  const avgReturn = getAverageReturn();
  const localEntry = leaderboard.find((e) => e.isLocal);

  // Simulate live price updates (deterministic, incremental)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const liveReturns = useMemo(() => {
    if (!currentEntry) return {};
    const weekId = currentEntry.weekId + String(Math.floor(tick / 5));
    const result: Record<string, number> = {};
    currentEntry.picks.forEach((pick) => {
      result[pick.ticker] = simulateWeeklyReturn(pick.ticker, weekId);
    });
    return result;
  }, [currentEntry, tick]);

  const returnPositive = avgReturn >= 0;
  const friendAbove = leaderboard.find((e) => !e.isLocal && e.rank === (localEntry?.rank ?? 1) - 1);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[CLASH.bgPrimary, CLASH.bgSecondary]}
        style={styles.header}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="חזור">
          <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>→</Text>
        </Pressable>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>📊 לוח חי</Text>
            <Text style={styles.headerSub}>עדכון כל דקה</Text>
          </View>
          <ExpoImage
            source={returnPositive ? FINN_HAPPY : FINN_EMPATHIC}
            style={{ width: 64, height: 64 }}
            contentFit="contain"
            accessible={false}
          />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ─── Portfolio value card ─── */}
        {currentEntry ? (
          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.portfolioCard}>
            <View style={styles.portfolioTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.portfolioLabel}>תשואה ממוצעת</Text>
                <Text style={[styles.portfolioReturn, { color: returnPositive ? '#4ade80' : '#f87171' }]}>
                  {returnPositive ? '+' : ''}{avgReturn.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.rankBox}>
                <Text style={styles.rankLabel}>דירוג</Text>
                <Text style={styles.rankNum}>#{localEntry?.rank ?? '—'}</Text>
              </View>
            </View>

            {/* Tier info */}
            <View style={styles.tierRow}>
              <Text style={styles.tierInfo}>
                {`${currentEntry.tier === 'silver' ? '🥈' : currentEntry.tier === 'gold' ? '🥇' : '💎'} הושקעו ${currentEntry.coinsPaid.toLocaleString('he-IL')} מטבעות`}
              </Text>
              <Text style={[styles.coinReturn, { color: returnPositive ? '#4ade80' : '#f87171' }]}>
                {`≈ ${Math.round(currentEntry.coinsPaid * (1 + avgReturn / 100)).toLocaleString('he-IL')} 🪙`}
              </Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.noEntry}>
            <Text style={styles.noEntryText}>לא נרשמת לתחרות השבוע</Text>
          </View>
        )}

        {/* ─── DUO social nudge ─── */}
        {friendAbove && localEntry && (
          <Animated.View entering={FadeInDown.delay(100).duration(280)} style={styles.duoNudge}>
            <Text style={styles.duoNudgeText}>
              ⚡ רק {Math.abs(friendAbove.returnPercent - (localEntry.returnPercent)).toFixed(1)}% מאחורי {friendAbove.displayName} — תוכל לעקוף אותם!
            </Text>
          </Animated.View>
        )}

        {/* ─── Live stocks ─── */}
        {currentEntry && currentEntry.picks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.section}>
            <Text style={styles.sectionTitle}>המניות שלך</Text>
            {currentEntry.picks.map((pick) => (
              <StockLiveRow
                key={pick.ticker}
                ticker={pick.ticker}
                stockName={pick.stockName}
                returnPercent={liveReturns[pick.ticker] ?? pick.returnPercent ?? 0}
              />
            ))}
          </Animated.View>
        )}

        {/* ─── Leaderboard ─── */}
        {leaderboard.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(320)} style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 דירוג שבועי</Text>
            {leaderboard.slice(0, 15).map((entry, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const medal = i < 3 ? medals[i] : null;
              const isTop20pct = entry.leaguePosition === 'promoted';
              const isBot20pct = entry.leaguePosition === 'demoted';

              return (
                <Animated.View
                  key={entry.playerId}
                  entering={FadeInDown.delay(i * 40).duration(250)}
                  style={[styles.leaderRow, entry.isLocal && styles.leaderRowLocal]}
                >
                  <View style={styles.leaderRank}>
                    <Text style={styles.leaderRankText}>{medal ?? `${entry.rank}`}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, entry.isLocal && { color: CLASH.goldLight, fontWeight: '900' }]} numberOfLines={1}>
                      {entry.displayName}
                    </Text>
                  </View>
                  {isTop20pct && <Text style={{ fontSize: 11, color: '#4ade80' }}>▲</Text>}
                  {isBot20pct && <Text style={{ fontSize: 11, color: '#f87171' }}>▼</Text>}
                  <Text style={[styles.leaderReturn, { color: entry.returnPercent >= 0 ? '#4ade80' : '#f87171' }]}>
                    {entry.returnPercent >= 0 ? '+' : ''}{entry.returnPercent.toFixed(1)}%
                  </Text>
                </Animated.View>
              );
            })}

            {/* Ellipsis if local not in top 15 */}
            {localEntry && (localEntry.rank ?? 0) > 15 && (
              <>
                <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 4, fontSize: 16 }}>···</Text>
                </View>
                <View style={[styles.leaderRow, styles.leaderRowLocal]}>
                  <View style={styles.leaderRank}>
                    <Text style={styles.leaderRankText}>{localEntry.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaderName, { color: CLASH.goldLight, fontWeight: '900' }]}>אתה</Text>
                  </View>
                  <Text style={[styles.leaderReturn, { color: localEntry.returnPercent >= 0 ? '#4ade80' : '#f87171' }]}>
                    {localEntry.returnPercent >= 0 ? '+' : ''}{localEntry.returnPercent.toFixed(1)}%
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLASH.bgPrimary },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginTop: 2 },
  portfolioCard: { margin: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 14 },
  portfolioTop: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  portfolioLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.6 },
  portfolioReturn: { fontSize: 38, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  rankBox: { backgroundColor: 'rgba(212,160,23,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: CLASH.goldBorder + '40' },
  rankLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' },
  rankNum: { fontSize: 22, fontWeight: '900', color: CLASH.goldLight },
  tierRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  tierInfo: { fontSize: 12, color: 'rgba(255,255,255,0.6)', writingDirection: 'rtl' },
  coinReturn: { fontSize: 13, fontWeight: '800' },
  noEntry: { padding: 32, alignItems: 'center' },
  noEntryText: { fontSize: 15, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' },
  duoNudge: { marginHorizontal: 16, marginBottom: 8, backgroundColor: DUO.blueSurface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  duoNudgeText: { fontSize: 13, fontWeight: '700', color: DUO.blue, writingDirection: 'rtl', textAlign: 'right' },
  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right', marginBottom: 6 },
  stockRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stockRowLeft: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  tickerBadge: { backgroundColor: 'rgba(212,160,23,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: CLASH.goldBorder + '40', minWidth: 44, alignItems: 'center' },
  tickerText: { fontSize: 11, fontWeight: '900', color: CLASH.goldLight },
  stockName: { fontSize: 12, color: 'rgba(255,255,255,0.75)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 4 },
  barTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', flexDirection: 'row' },
  barFill: { height: 4, borderRadius: 2 },
  stockReturn: { fontSize: 13, fontWeight: '800', minWidth: 52, textAlign: 'left' },
  leaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  leaderRowLocal: { backgroundColor: 'rgba(212,160,23,0.08)', borderRadius: 10, paddingHorizontal: 8 },
  leaderRank: { width: 30, alignItems: 'center' },
  leaderRankText: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)' },
  leaderName: { fontSize: 13, color: 'rgba(255,255,255,0.85)', writingDirection: 'rtl', textAlign: 'right' },
  leaderReturn: { fontSize: 13, fontWeight: '800', minWidth: 52, textAlign: 'left' },
});
