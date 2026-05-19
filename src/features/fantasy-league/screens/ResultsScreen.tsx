import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AnimatedReanimated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { DUO, LEAGUE_GOLD } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { getMockLeaderboard, getCurrentWeekId, TIER_CONFIGS } from '../fantasyData';
import { PodiumCharacter } from '../components/PodiumCharacter';
import { PromotionBanner } from '../components/PromotionBanner';
import { PrizesGrid } from '../components/PrizesGrid';
import { LeaderboardRow, ZoneDivider } from '../components/LeaderboardZone';
import type { FantasyTier } from '../fantasyTypes';
import type { LeagueShieldPosition } from '../components/LeagueShield';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ─── Confetti (top-3 only) ───────────────────────────────────────────────────
const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#16a34a', '#3b82f6', '#a855f7', '#ec4899'];

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
  }, []);

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
const EMOJI_AVATARS = ['🦈', '🦋', '🐱', '🦊', '🦁', '🐯', '🐸', '🐻', '🐼', '🐨', '🦄', '🐢'];
function emojiForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return EMOJI_AVATARS[Math.abs(hash) % EMOJI_AVATARS.length];
}

const TIER_TO_SHIELD: Record<FantasyTier, LeagueShieldPosition> = {
  silver: 'silver',
  gold: 'gold',
  diamond: 'gold',
};

const NEXT_TIER: Record<FantasyTier, FantasyTier> = {
  silver: 'gold',
  gold: 'diamond',
  diamond: 'diamond',
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
  const coins = useEconomyStore((s) => s.coins);

  useEffect(() => {
    if (currentEntry && currentEntry.picks.some((p) => p.finalPrice === null)) {
      simulateFinalPrices();
    }
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
  const rank = currentEntry?.finalRank ?? leaderboard.length + 1;
  const isTop3 = rank <= 3;
  const hasClaimed = currentEntry?.claimed ?? false;
  const hasUnclaimed = !!currentEntry && !hasClaimed;
  const returnPositive = avgReturn >= 0;

  const tierConfig = currentEntry ? TIER_CONFIGS[currentEntry.tier] : null;
  const coinsBack = currentEntry ? Math.round(currentEntry.coinsPaid * (1 + avgReturn / 100)) : 0;
  const xpEarned = currentEntry?.xpEarned ??
    (tierConfig && rank >= 1 && rank <= 5 ? tierConfig.prizeXP[rank - 1] : 25);

  const zone = zoneForRank(rank, totalPlayers);
  const isPromoted = zone === 'promote';
  const isDemoted = zone === 'relegate';

  // Podium top 3 — substitute local player if they made it
  const top3 = useMemo(() => {
    const list = leaderboard.slice(0, 3).map((e) => ({ ...e, isLocal: false }));
    if (currentEntry && rank <= 3) {
      list[rank - 1] = { ...list[rank - 1], displayName: 'אתה', isLocal: true };
    }
    return list;
  }, [leaderboard, rank, currentEntry]);

  const fromTier = currentEntry?.tier ?? 'silver';
  const toTier = NEXT_TIER[fromTier];

  const handleClaim = (): void => {
    claimResults();
  };

  const handleNextSeason = (): void => {
    resetForNewWeek();
    router.replace('/(tabs)/fantasy');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {isTop3 && hasClaimed && <ConfettiBurst />}

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>סוף עונה · פודיום וקידום</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* ─── Title ─── */}
        <AnimatedReanimated.View entering={FadeInDown.duration(360)} style={styles.titleWrap}>
          <Text style={styles.title}>העונה הסתיימה!</Text>
          <Text style={styles.subtitle}>סיימת במקום #{rank} מתוך {totalPlayers}</Text>
        </AnimatedReanimated.View>

        {/* ─── Podium ─── */}
        <AnimatedReanimated.View entering={FadeInDown.delay(80).duration(400)} style={styles.podiumCard}>
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.podiumInner}
          >
            {/* Stars decoration */}
            {[10, 30, 60, 85, 110, 140].map((leftPct, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: 10 + (i % 3) * 14,
                  left: `${leftPct % 100}%`,
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: '#fbbf24',
                  opacity: 0.6,
                }}
              />
            ))}

            <View style={styles.podiumRow}>
              {/* Order: 2 - 1 - 3 visually */}
              {top3[1] && (
                <AnimatedReanimated.View entering={ZoomIn.delay(280).duration(380).springify()}>
                  <PodiumCharacter
                    rank={2}
                    name={top3[1].displayName}
                    returnPercent={top3[1].returnPercent}
                    isLocal={top3[1].isLocal}
                    avatarEmoji={emojiForName(top3[1].displayName)}
                  />
                </AnimatedReanimated.View>
              )}
              {top3[0] && (
                <AnimatedReanimated.View entering={ZoomIn.delay(180).duration(400).springify()}>
                  <PodiumCharacter
                    rank={1}
                    name={top3[0].displayName}
                    returnPercent={top3[0].returnPercent}
                    isLocal={top3[0].isLocal}
                    avatarEmoji={emojiForName(top3[0].displayName)}
                  />
                </AnimatedReanimated.View>
              )}
              {top3[2] && (
                <AnimatedReanimated.View entering={ZoomIn.delay(380).duration(380).springify()}>
                  <PodiumCharacter
                    rank={3}
                    name={top3[2].displayName}
                    returnPercent={top3[2].returnPercent}
                    isLocal={top3[2].isLocal}
                    avatarEmoji={emojiForName(top3[2].displayName)}
                  />
                </AnimatedReanimated.View>
              )}
            </View>
          </LinearGradient>
        </AnimatedReanimated.View>

        {/* ─── Promotion banner ─── */}
        {isPromoted && currentEntry && toTier !== fromTier && (
          <AnimatedReanimated.View entering={FadeInDown.delay(440).duration(360)}>
            <PromotionBanner
              fromLeague={TIER_TO_SHIELD[fromTier]}
              toLeague={TIER_TO_SHIELD[toTier]}
            />
          </AnimatedReanimated.View>
        )}

        {/* ─── Demotion banner (if relevant) ─── */}
        {isDemoted && (
          <AnimatedReanimated.View entering={FadeInDown.delay(440).duration(360)} style={styles.demoteBanner}>
            <Text style={{ fontSize: 24 }}>📉</Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 15, fontWeight: '900', color: '#991b1b' }, RTL]}>ירדת ליגה</Text>
              <Text style={[{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }, RTL]}>שבוע הבא הזדמנות לחזרה</Text>
            </View>
          </AnimatedReanimated.View>
        )}

        {/* ─── Prizes grid ─── */}
        {currentEntry && (
          <AnimatedReanimated.View entering={FadeInDown.delay(520).duration(340)}>
            <PrizesGrid
              xpAmount={xpEarned}
              diamondsAmount={isTop3 ? 50 : isPromoted ? 30 : 10}
              coinsAmount={coinsBack}
            />
          </AnimatedReanimated.View>
        )}

        {/* ─── Result breakdown card ─── */}
        {currentEntry && (
          <AnimatedReanimated.View entering={FadeInDown.delay(600).duration(320)} style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, RTL]}>הסיכום שלך</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, RTL]}>תשואה ממוצעת</Text>
              <Text style={[styles.summaryValue, { color: returnPositive ? '#15803d' : '#b91c1c' }]}>
                {returnPositive ? '+' : ''}{avgReturn.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, RTL]}>מטבעות הוחזרו</Text>
              <Text style={[styles.summaryValue, { color: '#a16207' }]}>
                {coinsBack.toLocaleString('he-IL')} 💰
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, RTL]}>XP נצבר</Text>
              <Text style={[styles.summaryValue, { color: '#6d28d9' }]}>+{xpEarned} ⚡</Text>
            </View>
          </AnimatedReanimated.View>
        )}

        {/* ─── Full mini-leaderboard ─── */}
        <AnimatedReanimated.View entering={FadeInDown.delay(680).duration(320)} style={styles.leaderSection}>
          <Text style={[styles.leaderTitle, RTL]}>דירוג סופי</Text>
          <ZoneDivider zone="promote" rangeLabel="עולים לליגה הבאה" />
          {leaderboard.slice(0, 4).map((entry, i) => {
            const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
            const isLocal = currentEntry ? entry.rank === rank && rank <= 4 : false;
            return (
              <LeaderboardRow
                key={entry.playerId}
                rank={entry.rank}
                name={isLocal ? 'את/ה' : entry.displayName}
                returnPercent={entry.returnPercent}
                isLocal={isLocal}
                zone="promote"
                medalEmoji={medals[entry.rank]}
                avatarEmoji={emojiForName(entry.displayName)}
              />
            );
          })}

          {/* Your position if outside top 4 */}
          {currentEntry && rank > 4 && (
            <>
              <ZoneDivider zone={zone} rangeLabel={`#${rank} — את/ה`} />
              <LeaderboardRow
                rank={rank}
                name="את/ה"
                returnPercent={avgReturn}
                isLocal
                zone={zone}
                avatarEmoji="🦈"
              />
            </>
          )}
        </AnimatedReanimated.View>

        {/* ─── Claim / Next Season CTA ─── */}
        <AnimatedReanimated.View entering={FadeInDown.delay(760).duration(320)} style={styles.ctaWrap}>
          {hasUnclaimed ? (
            <Pressable
              onPress={handleClaim}
              style={({ pressed }) => [styles.claimBtn, { opacity: pressed ? 0.92 : 1, transform: [{ translateY: pressed ? 2 : 0 }] }]}
              accessibilityRole="button"
              accessibilityLabel="אסוף את הפרסים שלך"
            >
              <LinearGradient
                colors={[LEAGUE_GOLD.bgFrom, LEAGUE_GOLD.bgTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimBtnInner}
              >
                <Text style={styles.claimBtnText}>🎁 אסוף פרסים</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleNextSeason}
              style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.92 : 1, transform: [{ translateY: pressed ? 2 : 0 }] }]}
              accessibilityRole="button"
              accessibilityLabel="המשך לעונה הבאה"
            >
              <LinearGradient
                colors={[LEAGUE_GOLD.bgFrom, LEAGUE_GOLD.bgTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimBtnInner}
              >
                <Text style={styles.claimBtnText}>לעונה הבאה →</Text>
              </LinearGradient>
            </Pressable>
          )}
        </AnimatedReanimated.View>
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', ...RTL },
  statsRow: { flexDirection: 'row-reverse', gap: 6 },
  statChip: { backgroundColor: DUO.surface, borderWidth: 1, borderColor: DUO.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  titleWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.6, ...RTL },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '700', ...RTL },
  podiumCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 18, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  podiumInner: { paddingHorizontal: 8, paddingTop: 14, paddingBottom: 0, position: 'relative' },
  podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 6 },
  demoteBanner: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#fee2e2', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#fecaca' },
  summaryCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: DUO.border, gap: 12, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  summaryTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  summaryRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  summaryValue: { fontSize: 15, fontWeight: '900' },
  leaderSection: { marginHorizontal: 16, marginBottom: 14 },
  leaderTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 4, paddingHorizontal: 4 },
  ctaWrap: { marginHorizontal: 16, marginTop: 4 },
  claimBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: LEAGUE_GOLD.glow, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  nextBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: LEAGUE_GOLD.glow, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  claimBtnInner: { paddingVertical: 16, alignItems: 'center' },
  claimBtnText: { fontSize: 17, fontWeight: '900', color: LEAGUE_GOLD.ink, letterSpacing: 0.4 },
});
