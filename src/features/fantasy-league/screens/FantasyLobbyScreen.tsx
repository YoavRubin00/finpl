import React, { useEffect, useMemo, useState } from 'react';
import { useAppActive } from '../../../hooks/useAppActive';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FANTASY } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { captureEvent } from '../../../lib/posthog';
import { successHaptic } from '../../../utils/haptics';
import {
  getCompetitionPhase,
  getNextDraftOpen,
  getDraftClose,
  getCompetitionEnd,
  isDraftOpen,
  getNextCompetitionWeekId,
  getGameweekDay,
  STOCK_CATEGORIES,
  simulateWeeklyReturn,
  TIER_CONFIGS,
} from '../fantasyData';
import { useLiveReturnsStore } from '../useLiveReturnsStore';
import {
  F2Header,
  F2Ambient,
  F2ScoreboardHero,
  F2LivePick,
  F2QuickAction,
  F2LeagueArenaCard,
} from '../v2/components';
import { LeaguePrizesCard } from '../components/LeaguePrizesCard';
import {
  F2Section,
  F2Panel,
  F2GameweekMeter,
  F2Button,
  F2Tag,
  F2LiveDot,
} from '../v2/atoms';
import {
  F2Swap,
  F2Users,
  F2Trophy,
  F2Plus,
  F2CaptainBadge,
  F2SharkMark,
  F2Bolt,
  type TierKey,
} from '../v2/icons';
import type { StockCategoryId, FantasyTier, CompetitionPhase, WeeklyEntry } from '../fantasyTypes';
import type { SparkPath } from '../v2/atoms';
import type { FantasySectorId } from '../../../constants/theme';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Map app's StockCategoryId to v2 sector id
const CATEGORY_TO_SECTOR: Record<StockCategoryId, FantasySectorId> = {
  tech: 'tech',
  spec_growth: 'spec_growth',
  energy: 'energy',
  israel: 'israel',
  crypto: 'crypto',
  hype: 'hype',
};

// Map tier to shield tier
const TIER_TO_SHIELD: Record<FantasyTier, TierKey> = {
  silver: 'silver',
  gold: 'gold',
  diamond: 'diamond',
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

function formatCountdown(target: Date): { days: number; hours: number; label: string } {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, label: 'נגמר' };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return { days, hours, label: `${days}ימ׳ ${hours}ש׳` };
  const mins = Math.floor((ms % 3600000) / 60000);
  return { days: 0, hours, label: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}` };
}

// getGameweekDay now lives in fantasyData (Israel-time, Monday-anchored — Fable P0-7).

// ─── Not-entered state — honest next-draft countdown ────────────────────────
// Shown to a user who has NOT joined the current cycle. Copy adapts to the
// phase so a mid-competition visitor sees why the draft is closed and exactly
// when the next window opens — never a blank screen.
function PreDraftCard({ phase }: { phase: CompetitionPhase }): React.ReactElement {
  const nextOpen = getNextDraftOpen();
  const cd = formatCountdown(nextOpen);
  const title =
    phase === 'competition'
      ? 'התחרות של השבוע כבר רצה'
      : phase === 'results'
        ? 'השבוע נסגר — התוצאות בפנים'
        : 'הדראפט הבא נפתח בקרוב';
  const body =
    phase === 'competition' || phase === 'results'
      ? 'ההצטרפות נפתחת בדראפט הבא: בחירת 6 מניות, מינוי קפטן, ותחרות שבועית. בינתיים — צוברים מטבעות.'
      : 'בחירת 6 מניות, מינוי קפטן, וצבירת נקודות שבועיות. בינתיים — צוברים מטבעות.';
  return (
    <Animated.View
      entering={FadeInDown.delay(80).duration(320)}
      style={{
        backgroundColor: FANTASY.surfaceCard,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: FANTASY.borderStrong,
        padding: 20,
        alignItems: 'center',
        gap: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <F2SharkMark size={56} />
      <Text style={{ fontSize: 18, fontWeight: '900', color: FANTASY.ink, ...RTL, textAlign: 'center' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: FANTASY.inkMuted, ...RTL, textAlign: 'center', lineHeight: 19 }}>
        {body}
      </Text>
      <View style={{
        backgroundColor: FANTASY.warningSoft,
        borderWidth: 1,
        borderColor: FANTASY.warningStroke,
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginTop: 4,
      }}>
        <Text style={{
          fontSize: 13,
          fontWeight: '900',
          color: FANTASY.warningDark,
          fontVariant: ['tabular-nums'],
        }}>
          ⏱  הדראפט הבא · {cd.label}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Draft-open CTA ─────────────────────────────────────────────────────────
interface DraftOpenProps { hasEntered: boolean; isLocked: boolean }
function DraftOpenCard({ hasEntered, isLocked }: DraftOpenProps): React.ReactElement {
  const draftClose = getDraftClose();
  const cd = formatCountdown(draftClose);
  const cta = isLocked
    ? 'צפה בדראפט שלך'
    : hasEntered
      ? 'המשך לדראפט →'
      : 'פתח את הדראפט →';
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(320)} style={{ gap: 12 }}>
      <F2Panel pad={14} accent={FANTASY.gold}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: FANTASY.goldSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <F2Trophy size={26} color={FANTASY.goldDark} />
          </View>
          <View style={{ flex: 1 }}>
            <F2LiveDot color={FANTASY.warning} label="דראפט פתוח" />
            <Text style={{ fontSize: 16, fontWeight: '900', color: FANTASY.ink, ...RTL, marginTop: 4 }}>
              {isLocked ? 'הדראפט שלך נעול ✓' : hasEntered ? 'השלם את הדראפט' : 'בנה את התיק שלך'}
            </Text>
            <Text style={{ fontSize: 11, color: FANTASY.inkMuted, ...RTL, marginTop: 2, fontVariant: ['tabular-nums'] }}>
              נסגר בעוד {cd.label}
            </Text>
          </View>
        </View>
      </F2Panel>
      <F2Button
        tone="primary"
        size="md"
        onPress={() => router.push('/fantasy/draft')}
      >
        {cta}
      </F2Button>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
// ─── Results card — the week that just closed (Monday return hook) ──────────
// pendingResult is already settled + credited at rollover, so this is a
// celebratory recap + dismiss, not a claim gate.
function ResultCard({
  entry,
  onDismiss,
}: {
  entry: WeeklyEntry;
  onDismiss: () => void;
}): React.ReactElement {
  const totalAlloc = entry.picks.reduce((s, p) => s + p.allocation, 0) || 1;
  const eff =
    entry.picks.reduce((s, p) => {
      const mult =
        entry.captainTicker === p.ticker ? 2 : entry.viceTicker === p.ticker ? 1.5 : 1;
      return s + p.allocation * (p.returnPercent ?? 0) * mult;
    }, 0) / totalAlloc;
  const up = eff >= 0;
  // Best pick of the week — the celebration beat (Fable P1-2).
  const best = entry.picks.length
    ? entry.picks.reduce((a, b) => ((b.returnPercent ?? 0) > (a.returnPercent ?? 0) ? b : a))
    : null;
  const bestIsCaptain = !!best && entry.captainTicker === best.ticker;
  // Beat-the-market delta (Moni P1-8): the S&P 500 return this week settled
  // against, and whether the (leveraged) portfolio beat it on a positive week.
  const bench = entry.benchmarkReturn ?? null;
  const beatMarket = bench != null && eff > bench && eff > 0;
  useEffect(() => {
    try { successHaptic(); } catch { /* non-fatal */ }
  }, []);
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={{ gap: 12 }}>
      <F2Panel pad={14} accent={up ? FANTASY.positive : FANTASY.primary}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <F2SharkMark size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: FANTASY.ink, ...RTL }}>
              השבוע נסגר!
            </Text>
            <Text
              style={{ fontSize: 12, color: FANTASY.inkMuted, ...RTL, marginTop: 3, lineHeight: 18 }}
            >
              תשואת התיק: {up ? '+' : ''}
              {eff.toFixed(1)}% · נכנסו לך {(entry.coinsReturned ?? 0).toLocaleString('en-US')} 🪙 ו-
              {entry.xpEarned ?? 0} XP
            </Text>
            {bench != null && (
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '800',
                  color: beatMarket ? FANTASY.positiveDark : FANTASY.inkMuted,
                  ...RTL,
                  marginTop: 3,
                }}
              >
                {beatMarket ? '🎯 ניצחת את השוק! ' : ''}S&P 500: {bench >= 0 ? '+' : ''}
                {bench.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
        {best && (best.returnPercent ?? 0) !== 0 && (
          <View
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: FANTASY.border,
            }}
          >
            <Text style={{ fontSize: 15 }}>{bestIsCaptain ? '👑' : '🔥'}</Text>
            <Text style={{ fontSize: 12, color: FANTASY.inkSoft, ...RTL, flex: 1 }}>
              הכוכב שלך: {best.ticker} {(best.returnPercent ?? 0) >= 0 ? '+' : ''}
              {(best.returnPercent ?? 0).toFixed(1)}%{bestIsCaptain ? ' · קפטן ×2' : ''}
            </Text>
          </View>
        )}
      </F2Panel>
      <F2Button tone="ghost" size="md" onPress={onDismiss}>
        יאללה, לשבוע הבא
      </F2Button>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function FantasyLobbyScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const nextEntry = useFantasyStore((s) => s.nextEntry);
  const pendingResult = useFantasyStore((s) => s.pendingResult);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const rolloverIfDue = useFantasyStore((s) => s.rolloverIfDue);
  const dismissResult = useFantasyStore((s) => s.dismissResult);

  const phase = getCompetitionPhase();
  const hasEntered = currentEntry !== null; // has a LIVE team this week
  const isLocked = !!currentEntry?.lockedAt;
  const picks = currentEntry?.picks ?? [];

  // Next-week draft state — parallel to the live team, open Thu 09:00 → Mon
  // 09:00 IL. `hasNextTeam` guards against a stale slot the rollover hasn't
  // cleared yet (belt-and-suspenders; rolloverIfDue below normally clears it).
  const draftOpen = isDraftOpen();
  const hasNextTeam =
    nextEntry !== null && nextEntry.weekId === getNextCompetitionWeekId();
  const isNextLocked = !!nextEntry?.lockedAt;

  // Live tick — refreshes simulated returns every minute (cache-stable for 5
  // ticks). Gated on app-active: the tick re-sorts the ~100-row leaderboard,
  // so it must not keep firing while backgrounded. The immediate tick on
  // (re)activation keeps every label fresh the moment the app returns.
  const [tick, setTick] = useState(0);
  const appActive = useAppActive();
  useEffect(() => {
    if (!appActive) return;
    setTick((t) => t + 1);
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [appActive]);

  // Advance the weekly cycle at Monday 09:00 IL: promote a drafted next-week
  // team to live + settle the outgoing week. Idempotent — safe on every show
  // and on each minute tick, so a rollover fires even if the app is left open.
  useEffect(() => {
    rolloverIfDue();
  }, [rolloverIfDue, appActive, tick]);

  // Fire once per surfaced results card — the Monday return-hook impression.
  useEffect(() => {
    if (!pendingResult) return;
    try {
      captureEvent('fantasy_result_viewed', {
        coins_returned: pendingResult.coinsReturned ?? 0,
        xp_earned: pendingResult.xpEarned ?? 0,
      });
    } catch { /* non-fatal */ }
  }, [pendingResult?.weekId]);

  // Real weekly returns from Yahoo when available; the deterministic
  // simulation keeps the league alive offline. Refresh rides the minute tick.
  const realReturns = useLiveReturnsStore((s) => s.returns);
  useEffect(() => {
    const tickers = STOCK_CATEGORIES.flatMap((cat) => cat.stocks.map((s) => s.ticker));
    void useLiveReturnsStore.getState().refresh(tickers);
  }, [tick]);

  const liveReturns = useMemo(() => {
    if (!currentEntry) return {} as Record<string, number>;
    const weekKey = currentEntry.weekId + String(Math.floor(tick / 5));
    const result: Record<string, number> = {};
    currentEntry.picks.forEach((pick) => {
      result[pick.ticker] = realReturns[pick.ticker] ?? simulateWeeklyReturn(pick.ticker, weekKey);
    });
    return result;
  }, [currentEntry, tick, realReturns]);

  // Effective return — allocation-weighted with ×2 leverage on captain pick
  const { avgReturn, effReturn } = useMemo(() => {
    if (!currentEntry || currentEntry.picks.length === 0) {
      return { avgReturn: 0, effReturn: 0 };
    }
    const totalAlloc = currentEntry.picks.reduce((s, p) => s + p.allocation, 0);
    if (totalAlloc === 0) return { avgReturn: 0, effReturn: 0 };
    let plain = 0;
    let eff = 0;
    currentEntry.picks.forEach((pick) => {
      const r = liveReturns[pick.ticker] ?? pick.returnPercent ?? 0;
      plain += pick.allocation * r;
      const mult =
        currentEntry.captainTicker === pick.ticker ? 2
        : currentEntry.viceTicker === pick.ticker ? 1.5
        : 1;
      eff += pick.allocation * r * mult;
    });
    return {
      avgReturn: Math.round((plain / totalAlloc) * 100) / 100,
      effReturn: Math.round((eff / totalAlloc) * 100) / 100,
    };
  }, [currentEntry, liveReturns]);

  const captainBoost = Math.round((effReturn - avgReturn) * 100) / 100;
  const leaderboard = useMemo(
    () => (hasEntered ? getLeaderboardWithLocal() : []),
    [hasEntered, getLeaderboardWithLocal, tick],
  );
  const localEntry = leaderboard.find((e) => e.isLocal);
  const rank = localEntry?.rank ?? leaderboard.length + 1;
  const totalPlayers = leaderboard.length;
  // No real opponents settle while the board is frozen — don't invent a field
  // of "100 players" (Fable P0-6 / Moni P0-2). Rank UI shows only with rivals.
  const hasRivals = totalPlayers > 1;

  // Build StockCategoryId → ticker map for sectors
  const stockToCategory = useMemo(() => {
    const m: Record<string, StockCategoryId> = {};
    STOCK_CATEGORIES.forEach((cat) => {
      cat.stocks.forEach((s) => { m[s.ticker] = cat.id; });
    });
    return m;
  }, []);

  const competitionEnd = getCompetitionEnd();
  const cd = formatCountdown(competitionEnd);
  const gameweekDay = getGameweekDay();

  // No-captain nudge
  const hasNoCaptain = isLocked && currentEntry && !currentEntry.captainTicker && picks.length === 6;

  // Prize breakdown for the current league (shown in the lobby).
  const tierConfig = currentEntry ? TIER_CONFIGS[currentEntry.tier] : null;

  return (
    <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
      <F2Ambient tone="sky" />

      {/* No top SafeAreaView here — a header (the tabs GlobalWealthHeader on
          /(tabs)/fantasy, or the one re-mounted in app/fantasy/index) always
          sits above and already owns the top inset. */}
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 16, gap: 12 }}
        >
          {/* Screen title + back (wallet lives in the wealth header above) */}
          <F2Header
            eyebrow="Fantasy · ליגת מניות"
            title="פנטזי ליג"
            back
            onBack={() => {
              router.replace('/(tabs)/friends');
            }}
          />

          {/* Results of the week that just closed — a Monday return hook. */}
          {pendingResult && (
            <ResultCard entry={pendingResult} onDismiss={dismissResult} />
          )}

          {/* Next-week draft — runs in parallel with the live team below
              (Thu 09:00 → Mon 09:00 IL). Reuses DraftOpenCard, keyed on the
              NEXT-week slot; when closed, a countdown to Thursday 09:00. */}
          {draftOpen ? (
            <DraftOpenCard hasEntered={hasNextTeam} isLocked={isNextLocked} />
          ) : (
            !hasNextTeam && <PreDraftCard phase={phase} />
          )}

          {/* League arena card — only with real rivals (no fabricated field) */}
          {hasEntered && currentEntry && hasRivals && (
            <Animated.View entering={FadeInDown.duration(360)}>
              <F2LeagueArenaCard
                tier={currentEntry.tier as 'silver' | 'gold' | 'diamond'}
                tierLabel={TIER_LABEL[currentEntry.tier]}
                rank={rank}
                totalPlayers={totalPlayers}
                weekDay={gameweekDay > 5 ? 5 : gameweekDay}
                weekTotalDays={5}
              />
            </Animated.View>
          )}

          {/* Scoreboard hero — only if in active competition with picks */}
          {hasEntered && picks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(60).duration(360)}>
              <F2ScoreboardHero
                returnPercent={effReturn}
                rank={rank}
                rankDelta={0}
                prevRank={rank}
                captainBoost={Math.abs(captainBoost) > 0.01 ? captainBoost : undefined}
              />
            </Animated.View>
          )}

          {/* Gameweek meter — only for a joined player in an active week */}
          {hasEntered && (phase === 'competition' || phase === 'draft') && (
            <Animated.View entering={FadeInDown.delay(60).duration(320)}>
              <F2GameweekMeter day={gameweekDay} total={7} deadline={cd.label} />
            </Animated.View>
          )}

          {/* No-captain nudge */}
          {hasNoCaptain && (
            <Animated.View entering={FadeInDown.delay(80).duration(320)}>
              <Pressable
                onPress={() => router.push('/fantasy/draft')}
                style={({ pressed }) => ({
                  backgroundColor: FANTASY.goldSoft,
                  borderWidth: 1.5,
                  borderColor: FANTASY.goldStroke,
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 10,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <F2CaptainBadge size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.warningDark, ...RTL }}>
                    בחר קפטן! ×2 נקודות
                  </Text>
                  <Text style={{ fontSize: 11, color: FANTASY.warningDark, ...RTL, marginTop: 1 }}>
                    מנה את המניה החזקה ביותר שלך כקפטן
                  </Text>
                </View>
                <F2Tag color={FANTASY.warningDark}>חיוני</F2Tag>
              </Pressable>
            </Animated.View>
          )}

          {/* Quick Actions (3 tiles) */}
          {hasEntered && (
            <Animated.View entering={FadeInDown.delay(120).duration(320)}>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <F2QuickAction
                  label="ערוך תיק"
                  sub={currentEntry?.captainTicker ? `קפטן · ${currentEntry.captainTicker}` : 'בלי קפטן'}
                  icon={<F2Trophy size={20} color={FANTASY.primary} />}
                  onPress={() => router.push('/fantasy/draft')}
                />
                <F2QuickAction
                  label="לוח חי"
                  sub={hasRivals ? `#${rank} מ-${totalPlayers}` : `תשואה ${effReturn >= 0 ? '+' : ''}${effReturn}%`}
                  icon={<F2Bolt size={20} color={FANTASY.primary} />}
                  onPress={() => router.push('/fantasy/live')}
                />
                <F2QuickAction
                  label="דירוג"
                  sub={hasRivals ? `#${rank} · ${totalPlayers}` : 'משחק יחיד'}
                  icon={<F2Users size={20} color={FANTASY.primary} />}
                  onPress={() => router.push('/fantasy/leaderboard')}
                />
              </View>
            </Animated.View>
          )}

          {/* All live picks — horizontal scroller, swipe to see more */}
          {hasEntered && picks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(320)}>
              <F2Section action="לוח חי ←" onActionPress={() => router.push('/fantasy/live')}>
                פני התיק השבוע
              </F2Section>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row-reverse',
                  paddingHorizontal: 2,
                  paddingVertical: 2,
                  gap: 8,
                }}
              >
                {picks.map((pick) => {
                  const categoryId = stockToCategory[pick.ticker] ?? pick.categoryId;
                  const sector = CATEGORY_TO_SECTOR[categoryId] ?? 'tech';
                  const ret = liveReturns[pick.ticker] ?? pick.returnPercent ?? 0;
                  const isCap = currentEntry?.captainTicker === pick.ticker;
                  return (
                    <View key={pick.ticker} style={{ width: 230 }}>
                      <F2LivePick
                        ticker={pick.ticker}
                        name={pick.stockName}
                        sector={sector}
                        todayChange={0}
                        totalChange={ret}
                        isCaptain={isCap}
                        allocation={pick.allocation}
                        spark={sparkForReturn(ret)}
                        onPress={() => router.push('/fantasy/live')}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* League prizes — placed below the live cards for full transparency */}
          {hasEntered && currentEntry && tierConfig && (
            <Animated.View entering={FadeInDown.delay(240).duration(360)}>
              <LeaguePrizesCard
                tier={currentEntry.tier}
                tierLabel={TIER_LABEL[currentEntry.tier]}
                entryCost={tierConfig.entryCost}
                prizeMultipliers={tierConfig.prizeMultipliers}
                prizeDiamonds={tierConfig.prizeDiamonds}
                prizeXP={tierConfig.prizeXP}
                currentRank={rank}
              />
            </Animated.View>
          )}

          {/* How it works — for first-timers (no entry) */}
          {!hasEntered && phase !== 'pre_draft' && (
            <Animated.View entering={FadeInDown.delay(320).duration(320)}>
              <F2Panel pad={16}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: FANTASY.ink, ...RTL, marginBottom: 10 }}>
                  איך עובד פנטזי ליג?
                </Text>
                {[
                  'בחר 6 מניות — אחת מכל קטגוריה',
                  'מנה קפטן (×2 נקודות) וסגן (×1.5)',
                  'התחרה שבוע, התקדם בליגות',
                ].map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: FANTASY.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: FANTASY.inkSoft, ...RTL, lineHeight: 19 }}>
                      {step}
                    </Text>
                  </View>
                ))}
              </F2Panel>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
