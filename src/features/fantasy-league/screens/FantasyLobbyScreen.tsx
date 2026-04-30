import React, { useMemo } from 'react';
import { SafeLottie } from '../../../components/ui/SafeLottie';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CLASH, DUO, STITCH } from '../../../constants/theme';
import {
  FINN_STANDARD,
  FINN_FIRE,
  FINN_HAPPY,
  FINN_DANCING,
} from '../../retention-loops/finnMascotConfig';
import { useFantasyStore } from '../useFantasyStore';
import { getCompetitionPhase, TIER_CONFIGS, getNextDraftOpen, getDraftClose, getCompetitionEnd } from '../fantasyData';
import { PhaseBanner } from '../components/PhaseBanner';
import type { CompetitionPhase } from '../fantasyTypes';

function formatDateHe(d: Date): string {
  return d.toLocaleDateString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Pre-draft card ─────────────────────────────────────────────────────────
function PreDraftCard(): React.ReactElement {
  const nextOpen = getNextDraftOpen();
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(340)} style={styles.centerCard}>
      <ExpoImage source={FINN_STANDARD} style={styles.finnLg} contentFit="contain" accessible={false} />
      <Text style={styles.centerTitle}>הדראפט טרם נפתח</Text>
      <Text style={styles.centerSub}>
        חלון הדראפט נפתח ב{formatDateHe(nextOpen)}
      </Text>
      <Text style={styles.centerSub}>
        בינתיים — למד, צבור מטבעות, תכנן אסטרטגיה!
      </Text>
    </Animated.View>
  );
}

// ─── Draft open card ────────────────────────────────────────────────────────
function DraftOpenCard({ hasEntered, isLocked }: { hasEntered: boolean; isLocked: boolean }): React.ReactElement {
  const draftClose = getDraftClose();
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(340)} style={{ gap: 16 }}>
      {/* Hero banner */}
      <LinearGradient
        colors={['rgba(212,160,23,0.18)', 'rgba(212,160,23,0.04)']}
        style={styles.draftHero}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }}>
          <ExpoImage source={FINN_FIRE} style={styles.finnMd} contentFit="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <Text style={styles.draftHeroLabel}>🏹 דראפט פתוח!</Text>
            <Text style={styles.draftHeroTitle}>
              {isLocked ? 'הדראפט שלך נעול ✅' : hasEntered ? 'השלם את הדראפט' : 'בנה את התיק שלך'}
            </Text>
            <Text style={styles.draftHeroSub}>
              נסגר ב{formatDateHe(draftClose)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* CTA */}
      <Pressable
        onPress={() => router.push('/fantasy/draft')}
        style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.86 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={isLocked ? 'צפה בדראפט שלך' : 'פתח מסך דראפט'}
      >
        <LinearGradient
          colors={[CLASH.goldLight, CLASH.goldBorder]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryBtnInner}
        >
          <Text style={styles.primaryBtnText}>
            {isLocked ? '✅ צפה בדראפט' : hasEntered ? '← המשך לדרפט' : '← פתח את הדראפט'}
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Tier chips */}
      {!hasEntered && (
        <View style={styles.tierChips}>
          {Object.values(TIER_CONFIGS).map((cfg) => (
            <View key={cfg.id} style={styles.tierChip}>
              <Text style={styles.tierChipEmoji}>{cfg.emoji}</Text>
              <Text style={styles.tierChipLabel}>{cfg.label}</Text>
              <Text style={styles.tierChipCost}>{(cfg.entryCost / 1000).toFixed(0)}K 🪙</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ─── Competition live card ───────────────────────────────────────────────────
function CompetitionCard({ phase }: { phase: CompetitionPhase }): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);

  const leaderboard = useMemo(() => getLeaderboardWithLocal(), [getLeaderboardWithLocal]);
  const avgReturn = getAverageReturn();
  const localEntry = leaderboard.find((e) => e.isLocal);
  const returnPositive = avgReturn >= 0;

  const isDraftAlsoOpen = phase === 'draft'; // Thu–Sat overlap

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(340)} style={{ gap: 12 }}>
      {/* Portfolio summary card */}
      {currentEntry ? (
        <View style={styles.portfolioCard}>
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioTitle}>התיק שלך</Text>
            <View style={[styles.returnBadge, { backgroundColor: returnPositive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }]}>
              <Text style={[styles.returnValue, { color: returnPositive ? '#4ade80' : '#f87171' }]}>
                {returnPositive ? '+' : ''}{avgReturn}%
              </Text>
            </View>
          </View>

          {/* Mini picks list */}
          <View style={styles.picksList}>
            {currentEntry.picks.map((pick) => (
              <View key={pick.ticker} style={styles.pickRow}>
                <View style={styles.tickerBadgeSmall}>
                  <Text style={styles.tickerBadgeText}>{pick.ticker}</Text>
                </View>
                <Text style={styles.pickName} numberOfLines={1}>{pick.stockName}</Text>
              </View>
            ))}
            {currentEntry.picks.length === 0 && (
              <Text style={styles.emptyPicks}>אין מניות — השלם את הדראפט</Text>
            )}
          </View>

          <Pressable
            onPress={() => router.push('/fantasy/live')}
            style={({ pressed }) => [styles.liveBtn, { opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="צפה בלוח חי"
          >
            <Text style={styles.liveBtnText}>📊 לוח חי ודירוג ←</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.noEntryCard}>
          <ExpoImage source={FINN_STANDARD} style={{ width: 60, height: 60 }} contentFit="contain" accessible={false} />
          <Text style={styles.noEntryText}>לא הצטרפת לתחרות השבוע</Text>
          <Text style={styles.noEntrySub}>הדראפט{isDraftAlsoOpen ? ' עדיין פתוח!' : ' נסגר'}</Text>
          {isDraftAlsoOpen && (
            <Pressable
              onPress={() => router.push('/fantasy/draft')}
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.86 : 1, marginTop: 8 }]}
              accessibilityRole="button"
              accessibilityLabel="הצטרף לדראפט"
            >
              <LinearGradient colors={[CLASH.goldLight, CLASH.goldBorder]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnInner}>
                <Text style={styles.primaryBtnText}>הצטרף עכשיו ←</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      )}

      {/* Mini leaderboard top 3 */}
      {leaderboard.length > 0 && (
        <Animated.View entering={FadeInDown.delay(180).duration(300)} style={styles.miniLeaderboard}>
          <Text style={styles.miniLeaderTitle}>🏆 מובילים השבוע</Text>
          {leaderboard.slice(0, 3).map((entry) => (
            <View key={entry.playerId} style={[styles.miniLeaderRow, entry.isLocal && styles.miniLeaderRowLocal]}>
              <Text style={styles.rankText}>#{entry.rank}</Text>
              <Text style={[styles.leaderName, entry.isLocal && { color: CLASH.goldLight, fontWeight: '900' }]} numberOfLines={1}>
                {entry.displayName}
              </Text>
              <Text style={[styles.leaderReturn, { color: entry.returnPercent >= 0 ? '#4ade80' : '#f87171' }]}>
                {entry.returnPercent >= 0 ? '+' : ''}{entry.returnPercent}%
              </Text>
            </View>
          ))}
          {localEntry && localEntry.rank > 3 && (
            <>
              <View style={styles.leaderEllipsis}><Text style={styles.leaderEllipsisText}>···</Text></View>
              <View style={[styles.miniLeaderRow, styles.miniLeaderRowLocal]}>
                <Text style={styles.rankText}>#{localEntry.rank}</Text>
                <Text style={[styles.leaderName, { color: CLASH.goldLight, fontWeight: '900' }]}>אתה</Text>
                <Text style={[styles.leaderReturn, { color: localEntry.returnPercent >= 0 ? '#4ade80' : '#f87171' }]}>
                  {localEntry.returnPercent >= 0 ? '+' : ''}{localEntry.returnPercent}%
                </Text>
              </View>
            </>
          )}
          <Pressable
            onPress={() => router.push('/fantasy/live')}
            style={{ alignItems: 'center', marginTop: 10 }}
            accessibilityRole="button"
            accessibilityLabel="ראה דירוג מלא"
          >
            <Text style={styles.seeAllLink}>ראה דירוג מלא ←</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* DUO social nudge */}
      {localEntry && leaderboard.length > 1 && (
        (() => {
          const above = leaderboard.find((e) => e.rank === (localEntry.rank ?? 1) - 1);
          if (!above || above.isLocal) return null;
          const delta = Math.abs(above.returnPercent - localEntry.returnPercent);
          return (
            <Animated.View entering={FadeInDown.delay(260).duration(280)} style={styles.duoNudge}>
              <Text style={styles.duoNudgeText}>
                ⚡ רק {delta.toFixed(1)}% מאחורי {above.displayName} — אתה כמעט שם!
              </Text>
            </Animated.View>
          );
        })()
      )}

      {/* Upcoming draft FAB (Thu–Sat overlap) */}
      {isDraftAlsoOpen && currentEntry && (
        <Pressable
          onPress={() => router.push('/fantasy/draft')}
          style={({ pressed }) => [styles.draftFAB, { opacity: pressed ? 0.88 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="הכן דראפט לשבוע הבא"
        >
          <Text style={styles.draftFABText}>🏹 ערוך דראפט לשבוע הבא</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// ─── Results card ────────────────────────────────────────────────────────────
function ResultsCard(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const hasUnclaimed = currentEntry && !currentEntry.claimed && currentEntry.finalRank !== null;

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(340)} style={{ gap: 16 }}>
      <View style={styles.resultsHero}>
        <ExpoImage
          source={currentEntry?.finalRank && currentEntry.finalRank <= 3 ? FINN_DANCING : FINN_HAPPY}
          style={styles.finnMd}
          contentFit="contain"
          accessible={false}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.draftHeroLabel}>
            {currentEntry?.finalRank ? `מקום #${currentEntry.finalRank} 🏆` : 'תוצאות השבוע'}
          </Text>
          <Text style={styles.draftHeroTitle}>
            {hasUnclaimed ? 'יש פרס לאסוף!' : 'המתן לדראפט הבא'}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/fantasy/results')}
        style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.86 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="צפה בתוצאות"
      >
        <LinearGradient
          colors={hasUnclaimed ? [CLASH.goldLight, CLASH.goldBorder] : ['#475569', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryBtnInner}
        >
          <Text style={[styles.primaryBtnText, !hasUnclaimed && { color: 'rgba(255,255,255,0.8)' }]}>
            {hasUnclaimed ? '🎁 אסוף פרסים ←' : '📊 צפה בתוצאות ←'}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function FantasyLobbyScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const phase = getCompetitionPhase();
  const hasEntered = currentEntry !== null;
  const isLocked = !!currentEntry?.lockedAt;
  const streakWeeks = currentEntry?.draftStreakWeeks ?? 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ─── Header ─── */}
        <LinearGradient
          colors={[CLASH.bgPrimary, CLASH.bgSecondary, CLASH.bgPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topHeader}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="חזור"
          >
            <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>→</Text>
          </Pressable>
          <View style={styles.topHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.topTitle}>ליגת הפנטזיה 📈</Text>
              <Text style={styles.topSub}>בחר מניות · תתחרה · תרוויח</Text>
            </View>
            {/* Streak chip */}
            {streakWeeks >= 2 && (
              <View style={styles.streakChip}>
                <SafeLottie
                  source={require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json')}
                  style={{ width: 22, height: 22 }}
                  autoPlay
                  loop
                />
                <Text style={styles.streakText}>{streakWeeks} שבועות</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ─── Phase banner ─── */}
        <PhaseBanner phase={phase} />

        {/* ─── Phase-conditional content ─── */}
        <View style={{ paddingHorizontal: 16, gap: 0 }}>
          {phase === 'pre_draft' && <PreDraftCard />}
          {phase === 'draft' && <DraftOpenCard hasEntered={hasEntered} isLocked={isLocked} />}
          {phase === 'competition' && <CompetitionCard phase={phase} />}
          {phase === 'results' && <ResultsCard />}
        </View>

        {/* ─── How it works (always visible) ─── */}
        <Animated.View entering={FadeInDown.delay(320).duration(300)} style={styles.howItWorks}>
          <Text style={styles.howTitle}>⚡ איך זה עובד</Text>
          {[
            { emoji: '1️⃣', text: 'בחמישי נפתח הדראפט — בחר 5 מניות (אחת מכל קטגוריה)' },
            { emoji: '2️⃣', text: 'מיום ראשון עד שבת — המניות שלך מתחרות' },
            { emoji: '3️⃣', text: 'בשבת ב-20:00 — נכריז על המנצחים ותקבל תשואה' },
          ].map((step, i) => (
            <View key={i} style={styles.howRow}>
              <Text style={{ fontSize: 18 }}>{step.emoji}</Text>
              <Text style={styles.howText}>{step.text}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLASH.bgPrimary },
  topHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, marginBottom: 6 },
  topHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  topTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' },
  topSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl', textAlign: 'right', marginTop: 3 },
  streakChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(234,88,12,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(234,88,12,0.35)' },
  streakText: { fontSize: 12, fontWeight: '800', color: '#fb923c', writingDirection: 'rtl' },
  centerCard: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  finnLg: { width: 120, height: 120 },
  finnMd: { width: 72, height: 72 },
  centerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'center' },
  centerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', writingDirection: 'rtl', textAlign: 'center', lineHeight: 20 },
  draftHero: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(212,160,23,0.2)' },
  draftHeroLabel: { fontSize: 12, fontWeight: '800', color: CLASH.goldLight, textTransform: 'uppercase', letterSpacing: 0.8, writingDirection: 'rtl', textAlign: 'right' },
  draftHeroTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right', marginTop: 4 },
  draftHeroSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl', textAlign: 'right', marginTop: 3 },
  primaryBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: CLASH.goldGlow, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  primaryBtnInner: { paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: '#000000' },
  tierChips: { flexDirection: 'row-reverse', gap: 8 },
  tierChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tierChipEmoji: { fontSize: 20 },
  tierChipLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', writingDirection: 'rtl', textAlign: 'center' },
  tierChipCost: { fontSize: 11, fontWeight: '800', color: CLASH.goldLight },
  portfolioCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 12 },
  portfolioHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  portfolioTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' },
  returnBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  returnValue: { fontSize: 16, fontWeight: '900' },
  picksList: { gap: 6 },
  pickRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  tickerBadgeSmall: { backgroundColor: 'rgba(212,160,23,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: CLASH.goldBorder + '40' },
  tickerBadgeText: { fontSize: 11, fontWeight: '800', color: CLASH.goldLight },
  pickName: { fontSize: 12, color: 'rgba(255,255,255,0.75)', writingDirection: 'rtl', flex: 1, textAlign: 'right' },
  emptyPicks: { fontSize: 12, color: 'rgba(255,255,255,0.4)', writingDirection: 'rtl', textAlign: 'right' },
  liveBtn: { backgroundColor: 'rgba(56,189,248,0.12)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)' },
  liveBtnText: { fontSize: 14, fontWeight: '800', color: '#7dd3fc', writingDirection: 'rtl' },
  noEntryCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  noEntryText: { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.8)', writingDirection: 'rtl' },
  noEntrySub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', writingDirection: 'rtl' },
  miniLeaderboard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  miniLeaderTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right', marginBottom: 4 },
  miniLeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 4 },
  miniLeaderRowLocal: { backgroundColor: 'rgba(212,160,23,0.08)', borderRadius: 8, paddingHorizontal: 8 },
  rankText: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.5)', width: 28, textAlign: 'right' },
  leaderName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', writingDirection: 'rtl', textAlign: 'right' },
  leaderReturn: { fontSize: 13, fontWeight: '800' },
  leaderEllipsis: { alignItems: 'center' },
  leaderEllipsisText: { color: 'rgba(255,255,255,0.3)', fontSize: 16, letterSpacing: 4 },
  seeAllLink: { fontSize: 13, color: '#7dd3fc', fontWeight: '700', writingDirection: 'rtl' },
  duoNudge: { backgroundColor: DUO.blueSurface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  duoNudgeText: { fontSize: 13, fontWeight: '700', color: DUO.blue, writingDirection: 'rtl', textAlign: 'right' },
  draftFAB: { backgroundColor: 'rgba(212,160,23,0.12)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: CLASH.goldBorder + '60' },
  draftFABText: { fontSize: 14, fontWeight: '800', color: CLASH.goldLight, writingDirection: 'rtl' },
  resultsHero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, backgroundColor: 'rgba(245,201,11,0.08)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,201,11,0.2)' },
  howItWorks: { margin: 16, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 10 },
  howTitle: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.8)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 4 },
  howRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  howText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)', writingDirection: 'rtl', textAlign: 'right', lineHeight: 19 },
});