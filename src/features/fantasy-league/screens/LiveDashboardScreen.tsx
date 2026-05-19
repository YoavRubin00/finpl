import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { DUO, ZONE } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { STOCK_CATEGORIES, simulateWeeklyReturn } from '../fantasyData';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { PortfolioSlotCard } from '../components/PortfolioSlotCard';
import { LeaderboardRow, ZoneDivider } from '../components/LeaderboardZone';
import { LeagueShield, type LeagueShieldPosition } from '../components/LeagueShield';
import type { StockCategoryId, FantasyTier } from '../fantasyTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SECTOR_LABEL: Record<StockCategoryId, string> = {
  tech: 'טכנולוגיה',
  banks: 'בנקים',
  energy: 'אנרגיה',
  health: 'בריאות',
  crypto: 'קריפטו',
};

const TIER_TO_SHIELD: Record<FantasyTier, LeagueShieldPosition> = {
  silver: 'silver',
  gold: 'gold',
  diamond: 'gold',
};

const TIER_LABEL: Record<FantasyTier, string> = {
  silver: 'ליגת הכסף',
  gold: 'ליגת הזהב',
  diamond: 'ליגת היהלומים',
};

const EMOJI_AVATARS = ['🦈', '🦋', '🐱', '🦊', '🦁', '🐯', '🐸', '🐻', '🐼', '🐨', '🦄', '🐢'];
function emojiForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return EMOJI_AVATARS[Math.abs(hash) % EMOJI_AVATARS.length];
}

function zoneForRank(rank: number, total: number): 'promote' | 'safe' | 'relegate' {
  const promote = Math.max(3, Math.ceil(total * 0.2));
  const relegate = Math.max(3, Math.ceil(total * 0.2));
  if (rank <= promote) return 'promote';
  if (rank > total - relegate) return 'relegate';
  return 'safe';
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function LiveDashboardScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);
  const coins = useEconomyStore((s) => s.coins);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const leaderboard = useMemo(() => getLeaderboardWithLocal(), [getLeaderboardWithLocal]);
  const localEntry = leaderboard.find((e) => e.isLocal);
  const avgReturn = getAverageReturn();
  const returnPositive = avgReturn >= 0;
  const totalPlayers = leaderboard.length || 100;

  const liveReturns = useMemo(() => {
    if (!currentEntry) return {};
    const weekId = currentEntry.weekId + String(Math.floor(tick / 5));
    const result: Record<string, number> = {};
    currentEntry.picks.forEach((pick) => {
      result[pick.ticker] = simulateWeeklyReturn(pick.ticker, weekId);
    });
    return result;
  }, [currentEntry, tick]);

  const daysActive = currentEntry?.lockedAt
    ? Math.max(1, Math.floor((Date.now() - new Date(currentEntry.lockedAt).getTime()) / (24 * 60 * 60 * 1000)))
    : 5;

  const stockToCategory = useMemo(() => {
    const map: Record<string, StockCategoryId> = {};
    STOCK_CATEGORIES.forEach((cat) => {
      cat.stocks.forEach((s) => { map[s.ticker] = cat.id; });
    });
    return map;
  }, []);

  // Build leaderboard with zones
  const enrichedLeaderboard = useMemo(() => {
    return leaderboard.slice(0, 30).map((e) => ({
      ...e,
      zone: zoneForRank(e.rank, totalPlayers),
    }));
  }, [leaderboard, totalPlayers]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="חזור"
          hitSlop={12}
        >
          <Text style={{ fontSize: 22, color: '#0f172a', fontWeight: '700' }}>→</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {currentEntry ? TIER_LABEL[currentEntry.tier] : 'ליגת הזהב'} · חי
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statText}>❤️ 4/5</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statText}>💎 24</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statText}>💰 {coins.toLocaleString('he-IL')}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ─── Live rank hero card ─── */}
        {currentEntry ? (
          <Animated.View entering={FadeInDown.duration(360)} style={styles.heroWrap}>
            <LinearGradient
              colors={returnPositive ? ['#16a34a', '#15803d'] : ['#dc2626', '#991b1b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveBadgeText}>תחרות חיה</Text>
                </View>
                <Text style={styles.heroTitle}>תיק הפנטזי שלך</Text>
              </View>

              <View style={styles.heroMainRow}>
                <View style={styles.rankPillBig}>
                  <Text style={styles.rankPillText}>#{localEntry?.rank ?? '—'}</Text>
                  <Text style={styles.rankPillTotal}>מ-{totalPlayers}</Text>
                  <LeagueShield position={currentEntry ? TIER_TO_SHIELD[currentEntry.tier] : 'gold'} size={20} />
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={styles.heroReturn}>
                    {returnPositive ? '+' : ''}{avgReturn.toFixed(1)}%
                  </Text>
                  <Text style={styles.heroSub}>מתוך {daysActive} ימים בליגה</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : (
          <View style={styles.noEntry}>
            <Text style={styles.noEntryEmoji}>🎯</Text>
            <Text style={styles.noEntryTitle}>לא נרשמת לתחרות השבוע</Text>
            <Text style={styles.noEntrySub}>הירשם והתחל לאסוף תשואות</Text>
          </View>
        )}

        {/* ─── My portfolio section ─── */}
        {currentEntry && currentEntry.picks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable
                onPress={() => router.push('/fantasy/draft')}
                accessibilityRole="button"
                accessibilityLabel="ערוך תיק"
                hitSlop={8}
              >
                <Text style={styles.sectionAction}>ערוך תיק</Text>
              </Pressable>
              <Text style={styles.sectionTitle}>התיק שלך</Text>
            </View>

            <View style={{ gap: 8 }}>
              {currentEntry.picks.map((pick, idx) => (
                <Animated.View key={pick.ticker} entering={FadeIn.delay(idx * 60).duration(280)}>
                  <PortfolioSlotCard
                    ticker={pick.ticker}
                    name={pick.stockName}
                    sectorLabel={SECTOR_LABEL[stockToCategory[pick.ticker] ?? pick.categoryId]}
                    categoryId={stockToCategory[pick.ticker] ?? pick.categoryId}
                    returnPercent={liveReturns[pick.ticker] ?? pick.returnPercent ?? 0}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ─── Leaderboard with zones ─── */}
        {enrichedLeaderboard.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(320)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionMeta}>
                {`▲ 1-10 · 11-90 · 91-100 ▼`}
              </Text>
              <Text style={styles.sectionTitle}>לוח התוצאות</Text>
            </View>

            {/* Promote zone */}
            <ZoneDivider zone="promote" rangeLabel="1-10 עולים לליגה" />
            {enrichedLeaderboard.filter((e) => e.zone === 'promote').slice(0, 4).map((entry) => {
              const medalMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
              return (
                <LeaderboardRow
                  key={entry.playerId}
                  rank={entry.rank}
                  name={entry.displayName}
                  returnPercent={entry.returnPercent}
                  isLocal={entry.isLocal}
                  zone="promote"
                  isNew={entry.change === 'new'}
                  medalEmoji={medalMap[entry.rank]}
                  avatarEmoji={emojiForName(entry.displayName)}
                />
              );
            })}

            {/* Local entry — always shown */}
            {localEntry && localEntry.rank > 4 && localEntry.rank <= totalPlayers - 4 && (
              <>
                <ZoneDivider zone="safe" rangeLabel={`#${localEntry.rank} — המיקום שלך`} />
                <LeaderboardRow
                  rank={localEntry.rank}
                  name={localEntry.displayName}
                  returnPercent={localEntry.returnPercent}
                  isLocal
                  zone={zoneForRank(localEntry.rank, totalPlayers)}
                  avatarEmoji={emojiForName(localEntry.displayName)}
                />
              </>
            )}

            {/* Relegate zone */}
            <ZoneDivider zone="relegate" rangeLabel="91-100 יורדים" />
            {enrichedLeaderboard.filter((e) => e.zone === 'relegate').slice(-2).map((entry) => (
              <LeaderboardRow
                key={entry.playerId}
                rank={entry.rank}
                name={entry.displayName}
                returnPercent={entry.returnPercent}
                isLocal={entry.isLocal}
                zone="relegate"
                avatarEmoji={emojiForName(entry.displayName)}
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DUO.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: DUO.surface,
    borderBottomWidth: 1,
    borderBottomColor: DUO.border,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', ...RTL },
  statsRow: { flexDirection: 'row-reverse', gap: 6 },
  statChip: { backgroundColor: DUO.surface, borderWidth: 1, borderColor: DUO.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#16a34a',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  hero: { padding: 18, gap: 14 },
  heroTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.95)', ...RTL },
  liveBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86efac' },
  liveBadgeText: { fontSize: 11, fontWeight: '900', color: '#ffffff' },
  heroMainRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  rankPillBig: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', gap: 4, minWidth: 88 },
  rankPillText: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.8 },
  rankPillTotal: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroReturn: { fontSize: 44, fontWeight: '900', color: '#ffffff', letterSpacing: -1.4 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700', ...RTL, marginTop: 2 },
  noEntry: { margin: 16, padding: 32, alignItems: 'center', backgroundColor: DUO.surface, borderRadius: 16, borderWidth: 1, borderColor: DUO.border, gap: 8 },
  noEntryEmoji: { fontSize: 40 },
  noEntryTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', ...RTL },
  noEntrySub: { fontSize: 13, color: '#64748b', ...RTL },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', ...RTL },
  sectionAction: { fontSize: 13, fontWeight: '800', color: DUO.blue, ...RTL },
  sectionMeta: { fontSize: 10, fontWeight: '700', color: ZONE.safe.text, ...RTL },
});
