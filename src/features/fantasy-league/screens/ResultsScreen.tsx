import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import AnimatedReanimated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { CLASH, DUO } from '../../../constants/theme';
import {
  FINN_DANCING,
  FINN_HAPPY,
  FINN_EMPATHIC,
} from '../../retention-loops/finnMascotConfig';
import { useFantasyStore } from '../useFantasyStore';
import { getMockLeaderboard, getCurrentWeekId, getNextDraftOpen, TIER_CONFIGS } from '../fantasyData';

// ─── Confetti burst (top-3 only) ─────────────────────────────────────────────
const CONFETTI_COLORS = ['#d4a017', '#f5c842', '#4ade80', '#38bdf8', '#c084fc', '#fb7185'];

function ConfettiBurst(): React.ReactElement {
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  const animations = useRef(pieces.map(() => ({
    y: new Animated.Value(0),
    x: new Animated.Value(0),
    opacity: new Animated.Value(1),
    rotate: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    const anims = pieces.map((_, i) => {
      const { y, x, opacity, rotate } = animations[i];
      const dx = (Math.random() - 0.5) * 280;
      const dy = Math.random() * 320 + 80;
      return Animated.parallel([
        Animated.timing(y, { toValue: dy, duration: 1200, delay: i * 40, useNativeDriver: true }),
        Animated.timing(x, { toValue: dx, duration: 1200, delay: i * 40, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(600 + i * 30),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 6, duration: 1200, delay: i * 40, useNativeDriver: true }),
      ]);
    });
    Animated.stagger(20, anims).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((_, i) => {
        const { y, x, opacity, rotate } = animations[i];
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = Math.random() * 8 + 5;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 60,
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

// ─── Podium ───────────────────────────────────────────────────────────────────
function Podium({ top3 }: { top3: Array<{ displayName: string; returnPercent: number; isLocal: boolean }> }): React.ReactElement {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean); // 2-1-3 visual order
  const heights = [80, 110, 60];
  const medals = ['🥈', '🥇', '🥉'];
  const ranks = [2, 1, 3];

  return (
    <View style={styles.podiumWrap}>
      {order.map((entry, i) => (
        <AnimatedReanimated.View
          key={entry?.displayName ?? i}
          entering={FadeInDown.delay(i * 120).duration(400).springify()}
          style={{ alignItems: 'center', gap: 8 }}
        >
          {/* Crown Lottie floats above #1 */}
          {i === 1 ? (
            <LottieView
              source={require("../../../../assets/lottie/Crown.json")}
              style={{ width: 40, height: 40 }}
              autoPlay
              loop={false}
            />
          ) : <View style={{ height: 40 }} />}
          <Text style={{ fontSize: 11, fontWeight: '800', color: entry?.isLocal ? CLASH.goldLight : 'rgba(255,255,255,0.7)', writingDirection: 'rtl', textAlign: 'center' }}
            numberOfLines={1}
          >
            {entry?.displayName ?? '—'}
          </Text>
          <Text style={{ fontSize: 11, color: entry && entry.returnPercent >= 0 ? '#4ade80' : '#f87171', fontWeight: '700' }}>
            {entry ? `${entry.returnPercent >= 0 ? '+' : ''}${entry.returnPercent.toFixed(1)}%` : ''}
          </Text>
          <Text style={{ fontSize: 28 }}>{medals[i]}</Text>
          <View
            style={{
              width: 72,
              height: heights[i],
              borderRadius: 8,
              backgroundColor: i === 1
                ? 'rgba(212,160,23,0.3)'
                : i === 0
                ? 'rgba(148,163,184,0.2)'
                : 'rgba(180,83,9,0.2)',
              borderTopWidth: 3,
              borderColor: i === 1 ? CLASH.goldBorder : i === 0 ? '#94a3b8' : '#b45309',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '900', color: 'rgba(255,255,255,0.6)' }}>
              #{ranks[i]}
            </Text>
          </View>
        </AnimatedReanimated.View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ResultsScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const claimResults = useFantasyStore((s) => s.claimResults);
  const simulateFinalPrices = useFantasyStore((s) => s.simulateFinalPrices);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);

  const [showSparkles, setShowSparkles] = useState(false);
  const handleClaim = useCallback(() => {
    claimResults();
    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 2500);
  }, [claimResults]);

  // Simulate final prices on mount if not yet done
  useEffect(() => {
    if (currentEntry && currentEntry.picks.some((p) => p.finalPrice === null)) {
      simulateFinalPrices();
    }
  }, []);

  const leaderboard = useMemo(
    () => currentEntry ? getMockLeaderboard(currentEntry.tier, currentEntry.weekId) : getMockLeaderboard('silver', getCurrentWeekId()),
    [currentEntry],
  );

  const avgReturn = getAverageReturn();
  const rank = currentEntry?.finalRank ?? (leaderboard.length + 1);
  const isTop3 = rank <= 3;
  const hasClaimed = currentEntry?.claimed ?? false;
  const hasUnclaimed = currentEntry && !hasClaimed;
  const returnPositive = avgReturn >= 0;

  const tierConfig = currentEntry ? TIER_CONFIGS[currentEntry.tier] : null;
  const coinsBack = currentEntry
    ? Math.round(currentEntry.coinsPaid * (1 + avgReturn / 100))
    : 0;
  const xpEarned = currentEntry?.xpEarned ??
    (tierConfig && rank >= 1 && rank <= 5 ? tierConfig.prizeXP[rank - 1] : 25);

  const finnSource = isTop3 ? FINN_DANCING : returnPositive ? FINN_HAPPY : FINN_EMPATHIC;
  const nextDraft = getNextDraftOpen();

  const top3 = useMemo(() => {
    const list = leaderboard.slice(0, 3).map((e) => ({ ...e, isLocal: false }));
    if (currentEntry && rank <= 3) {
      list[rank - 1] = { ...list[rank - 1], displayName: 'אתה', isLocal: true };
    }
    return list;
  }, [leaderboard, rank, currentEntry]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {isTop3 && hasClaimed && <ConfettiBurst />}
      {showSparkles && !isTop3 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LottieView
            source={require("../../../../assets/lottie/wired-flat-2474-sparkles-glitter-hover-pinch.json")}
            style={{ flex: 1 }}
            autoPlay
            loop={false}
          />
        </View>
      )}

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
            <Text style={styles.headerTitle}>תוצאות השבוע 🏆</Text>
            <Text style={styles.headerSub}>
              {hasUnclaimed ? 'יש פרסים לאסוף!' : 'תוצאות סופיות'}
            </Text>
          </View>
          <ExpoImage source={finnSource} style={{ width: 72, height: 72 }} contentFit="contain" accessible={false} />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ─── Podium ─── */}
        <AnimatedReanimated.View entering={FadeInDown.delay(60).duration(360)} style={styles.podiumSection}>
          <Text style={styles.podiumTitle}>הפודיום</Text>
          <Podium top3={top3} />
        </AnimatedReanimated.View>

        {/* ─── Your result card ─── */}
        {currentEntry && (
          <AnimatedReanimated.View entering={FadeInDown.delay(200).duration(340)} style={styles.resultCard}>
            <LinearGradient
              colors={isTop3 ? ['rgba(212,160,23,0.2)', 'rgba(212,160,23,0.05)'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
              style={styles.resultCardInner}
            >
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>המקום שלך</Text>
                <Text style={[styles.resultValue, isTop3 && { color: CLASH.goldLight }]}>
                  #{rank} {isTop3 ? '🏆' : ''}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>תשואה ממוצעת</Text>
                <Text style={[styles.resultValue, { color: returnPositive ? '#4ade80' : '#f87171' }]}>
                  {returnPositive ? '+' : ''}{avgReturn.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>מטבעות שיוחזרו</Text>
                <Text style={[styles.resultValue, { color: returnPositive ? '#4ade80' : '#f87171' }]}>
                  {coinsBack.toLocaleString('he-IL')} 🪙
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>XP שנצבר</Text>
                <Text style={[styles.resultValue, { color: '#a78bfa' }]}>+{xpEarned} XP</Text>
              </View>

              {/* Claim button */}
              {hasUnclaimed && (
                <Pressable
                  onPress={handleClaim}
                  style={({ pressed }) => [styles.claimBtn, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="אסוף פרסים"
                >
                  <LinearGradient
                    colors={[CLASH.goldLight, CLASH.goldBorder]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.claimBtnInner}
                  >
                    <Text style={styles.claimBtnText}>🎁 אסוף פרסים!</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {hasClaimed && (
                <View style={styles.claimedBadge}>
                  <Text style={styles.claimedText}>✅ פרסים נאספו!</Text>
                </View>
              )}
            </LinearGradient>
          </AnimatedReanimated.View>
        )}

        {/* ─── Full leaderboard ─── */}
        <AnimatedReanimated.View entering={FadeInDown.delay(300).duration(320)} style={styles.fullLeader}>
          <Text style={styles.fullLeaderTitle}>דירוג מלא</Text>
          {leaderboard.map((entry, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <View
                key={entry.playerId}
                style={[
                  styles.leaderRow,
                  i < 5 && styles.leaderRowTop5,
                  entry.isLocal && styles.leaderRowLocal,
                ]}
              >
                <Text style={styles.rankText}>{i < 3 ? medals[i] : `#${entry.rank}`}</Text>
                <Text style={[styles.leaderName, entry.isLocal && { color: CLASH.goldLight, fontWeight: '900' }]} numberOfLines={1}>
                  {entry.displayName}
                </Text>
                {entry.leaguePosition === 'promoted' && <Text style={{ fontSize: 10, color: '#4ade80' }}>▲</Text>}
                {entry.leaguePosition === 'demoted' && <Text style={{ fontSize: 10, color: '#f87171' }}>▼</Text>}
                <Text style={[styles.leaderReturn, { color: entry.returnPercent >= 0 ? '#4ade80' : '#f87171' }]}>
                  {entry.returnPercent >= 0 ? '+' : ''}{entry.returnPercent.toFixed(1)}%
                </Text>
              </View>
            );
          })}
        </AnimatedReanimated.View>

        {/* ─── Next draft countdown ─── */}
        <AnimatedReanimated.View entering={FadeInDown.delay(380).duration(300)} style={styles.nextDraft}>
          <Text style={{ fontSize: 20 }}>⏳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextDraftTitle}>הדראפט הבא</Text>
            <Text style={styles.nextDraftSub}>
              נפתח ב{nextDraft.toLocaleDateString('he-IL', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </AnimatedReanimated.View>

        {/* DUO streak chip */}
        {(currentEntry?.draftStreakWeeks ?? 0) >= 2 && (
          <AnimatedReanimated.View entering={ZoomIn.delay(450).duration(300)} style={styles.streakBadge}>
            <LottieView
              source={require("../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
              style={{ width: 24, height: 24 }}
              autoPlay
              loop
            />
            <Text style={styles.streakText}>
              {currentEntry?.draftStreakWeeks} שבועות ברצף — המשך כך!
            </Text>
          </AnimatedReanimated.View>
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
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl', textAlign: 'right', marginTop: 3 },
  podiumSection: { margin: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 16 },
  podiumTitle: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.7)', writingDirection: 'rtl', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.8 },
  podiumWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  resultCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212,160,23,0.2)' },
  resultCardInner: { padding: 18, gap: 12 },
  resultRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  resultLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', writingDirection: 'rtl' },
  resultValue: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  claimBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, shadowColor: CLASH.goldGlow, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  claimBtnInner: { paddingVertical: 15, alignItems: 'center' },
  claimBtnText: { fontSize: 17, fontWeight: '900', color: '#000000' },
  claimedBadge: { backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', marginTop: 8 },
  claimedText: { fontSize: 15, fontWeight: '800', color: '#4ade80' },
  fullLeader: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 4 },
  fullLeaderTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right', marginBottom: 8 },
  leaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  leaderRowTop5: { borderBottomColor: 'rgba(212,160,23,0.08)' },
  leaderRowLocal: { backgroundColor: 'rgba(212,160,23,0.1)', borderRadius: 10, paddingHorizontal: 8 },
  rankText: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.55)', width: 32, textAlign: 'right' },
  leaderName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', writingDirection: 'rtl', textAlign: 'right' },
  leaderReturn: { fontSize: 13, fontWeight: '800', minWidth: 52, textAlign: 'left' },
  nextDraft: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  nextDraftTitle: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.8)', writingDirection: 'rtl', textAlign: 'right' },
  nextDraftSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginTop: 2 },
  streakBadge: { marginHorizontal: 16, marginBottom: 16, backgroundColor: DUO.orangeSurface, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(234,88,12,0.25)' },
  streakText: { fontSize: 14, fontWeight: '800', color: DUO.orange, writingDirection: 'rtl' },
});