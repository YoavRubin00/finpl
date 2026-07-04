import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { CROWD_QUESTIONS } from '../../crowd-question/crowdQuestionsData';
import { useCrowdQuestionStore } from '../../crowd-question/useCrowdQuestionStore';
import type { CrowdQuestion, Topic } from '../../crowd-question/types';
import { useCrowdWisdomStore, selectMonthlyAccuracy } from '../../crowd-wisdom/useCrowdWisdomStore';
import { AccuracyHeroCard } from '../../crowd-wisdom/components/AccuracyHeroCard';
import { StreakHeroCard } from '../../crowd-wisdom/components/StreakHeroCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { getApiBase } from '../../../db/apiBase';
import type { LiveMarketData } from '../../live-news/liveMarketTypes';
import { FinnCue } from './FinnCue';
import { Ta35WeeklyForecast } from './Ta35WeeklyForecast';
import { JournalEventPoll } from '../../investors-journal/JournalEventPoll';

interface TopicTheme {
  color: string;
  label: string;
}

const TOPIC_THEMES: Record<Topic, TopicTheme> = {
  sp500: { color: '#0ea5e9', label: '📈 S&P 500' },
  tlv35: { color: '#0891b2', label: '🇮🇱 ת"א-35' },
  btc: { color: '#f59e0b', label: '₿ קריפטו' },
  rates: { color: '#7c3aed', label: '🏦 ריבית' },
  macro: { color: '#6366f1', label: '🌍 מאקרו' },
  usd_ils: { color: '#16a34a', label: '💵 דולר/שקל' },
  oil: { color: '#1f2937', label: '🛢️ נפט' },
  gold: { color: '#eab308', label: '🥇 זהב' },
  earnings: { color: '#db2777', label: '📊 דוחות' },
};

/**
 * Topics we can HONESTLY resolve against real live-market data (A2). Only the
 * Tel-Aviv index is served by /api/market/live, so it's the only directional
 * green/red question we can settle client-side — everything else stays silent
 * until a real server resolver exists (Yoav 2026-07-02).
 */
const TOPIC_TO_MARKET_LABEL: Partial<Record<Topic, string>> = {
  tlv35: 'ת"א 35',
};

interface PollBarProps {
  option: CrowdQuestion['options'][number];
  isUserChoice: boolean;
  /** True once the user has voted. NO invented %/baseline is ever shown — after
   *  voting we only highlight the user's own pick (P0-4, Yoav 2026-07-02). */
  revealed: boolean;
}

function PollBar({ option, isUserChoice, revealed }: PollBarProps): React.ReactElement {
  const highlight = revealed && isUserChoice;
  return (
    // Decorative representation of the option — the parent Pressable already
    // exposes the actionable label to screen readers (C8: no role on a
    // non-pressable View).
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        height: 36,
        borderRadius: 10,
        backgroundColor: highlight ? '#dcfce7' : '#f1f5f9',
        borderWidth: highlight ? 2 : 1,
        borderColor: highlight ? '#16a34a' : '#e2e8f0',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 6,
      }}
    >
      {option.emoji && <Text style={{ fontSize: 14 }}>{option.emoji}</Text>}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: highlight ? '#166534' : '#334155',
          writingDirection: 'rtl',
        }}
        maxFontSizeMultiplier={1.15}
      >
        {option.label}
      </Text>
      <View style={{ flex: 1 }} />
      {highlight && (
        <View style={{ backgroundColor: '#16a34a', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>✓ הצבעתם</Text>
        </View>
      )}
    </View>
  );
}

/** Ease-out coin count-up. Snaps to the target instantly under reduced-motion. */
function useCountUp(target: number, active: boolean, reduced: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const duration = 700;
    const tick = (): void => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, reduced]);
  return value;
}

export function CrowdWisdomCard(): React.ReactElement {
  const getTodayQuestion = useCrowdQuestionStore((s) => s.getTodayQuestion);
  const userVotes = useCrowdQuestionStore((s) => s.userVotes);
  const votedDates = useCrowdQuestionStore((s) => s.votedDates);
  const resolvedVotes = useCrowdQuestionStore((s) => s.resolvedVotes);
  const pendingWin = useCrowdQuestionStore((s) => s.pendingWin);
  const clearPendingWin = useCrowdQuestionStore((s) => s.clearPendingWin);
  const claimStreakMilestone = useCrowdQuestionStore((s) => s.claimStreakMilestone);

  // Market accuracy (A3) — resolved-vote accuracy from the crowd-wisdom store.
  // This is the ONLY streak/accuracy source allowed here: real market outcomes
  // + participation. Never the "with-crowd" streak (invented baseline).
  const accuracyInfo = useCrowdWisdomStore(useShallow(selectMonthlyAccuracy));

  const reduced = useReducedMotion();

  // ── Real participation streak (votedDates) — 100% self-data (A1) ──────────
  const votingStreak = useMemo(
    () => useCrowdQuestionStore.getState().getVotingStreak(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [votedDates],
  );

  // ── A1: claim any newly-reached voting-streak milestone (3/7/14) once ─────
  const [milestoneReward, setMilestoneReward] = useState<{ milestone: number; coins: number } | null>(null);
  const claimedRef = useRef(false);
  useEffect(() => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    const reward = claimStreakMilestone();
    if (reward) {
      setMilestoneReward(reward);
      successHaptic();
    }
  }, [claimStreakMilestone]);

  // ── A2: resolve directional index votes against REAL live-market data ─────
  const hasResolvableVote = useMemo(
    () =>
      Object.keys(userVotes).some((qid) => {
        if (resolvedVotes[qid]) return false;
        const q = CROWD_QUESTIONS.find((x) => x.id === qid);
        return !!q && !!TOPIC_TO_MARKET_LABEL[q.tags.topic];
      }),
    [userVotes, resolvedVotes],
  );

  useEffect(() => {
    if (!hasResolvableVote) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/market/live`);
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as LiveMarketData;
        if (cancelled || !Array.isArray(data.rates)) return;
        const rateByLabel = new Map(data.rates.map((r) => [r.label, r] as const));
        const { userVotes: votes, resolveVoteWithMarket } = useCrowdQuestionStore.getState();
        for (const qid of Object.keys(votes)) {
          const q = CROWD_QUESTIONS.find((x) => x.id === qid);
          if (!q) continue;
          const label = TOPIC_TO_MARKET_LABEL[q.tags.topic];
          if (!label) continue;
          const rate = rateByLabel.get(label);
          if (!rate || (rate.direction !== 'up' && rate.direction !== 'down')) continue;
          resolveVoteWithMarket(qid, rate.direction);
        }
      } catch {
        /* offline — no resolution, stays silent (honest) */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasResolvableVote]);

  useEffect(() => {
    if (pendingWin) successHaptic();
  }, [pendingWin]);

  // ── Celebration (A2 win > A1 milestone) ───────────────────────────────────
  const winOptionId = pendingWin ? userVotes[pendingWin.questionId] : undefined;
  const winQuestion = pendingWin ? CROWD_QUESTIONS.find((q) => q.id === pendingWin.questionId) : undefined;
  const winSentiment = winQuestion?.options.find((o) => o.id === winOptionId)?.sentiment;
  const winColorWord = winSentiment === 'red' ? 'באדום' : 'בירוק';

  const celebration = pendingWin
    ? { kind: 'win' as const, coins: pendingWin.coins }
    : milestoneReward
      ? { kind: 'milestone' as const, coins: milestoneReward.coins, milestone: milestoneReward.milestone }
      : null;
  const displayCoins = useCountUp(celebration?.coins ?? 0, !!celebration, reduced);

  const dismissCelebration = useCallback(() => {
    tapHaptic();
    if (pendingWin) clearPendingWin();
    else setMilestoneReward(null);
  }, [pendingWin, clearPendingWin]);

  const top3 = useMemo<CrowdQuestion[]>(() => {
    const today = getTodayQuestion();
    const seenTopics = new Set<Topic>([today.tags.topic]);
    const sorted = [...CROWD_QUESTIONS]
      .filter((q) => q.id !== today.id)
      .sort((a, b) => b.baselineN - a.baselineN);

    const picks: CrowdQuestion[] = [today];
    for (const q of sorted) {
      if (picks.length >= 3) break;
      if (!seenTopics.has(q.tags.topic)) {
        picks.push(q);
        seenTopics.add(q.tags.topic);
      }
    }
    if (picks.length < 3) {
      for (const q of sorted) {
        if (picks.length >= 3) break;
        if (!picks.some((p) => p.id === q.id)) picks.push(q);
      }
    }
    return picks;
  }, [getTodayQuestion]);

  const handlePressQuestion = useCallback((): void => {
    tapHaptic();
    router.push('/crowd-wisdom' as never);
  }, []);

  const showStats = votingStreak > 0 || accuracyInfo.resolvedCount > 0;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: STITCH.surfaceHighest,
        overflow: 'hidden',
        shadowColor: '#3e3c8f',
        shadowOpacity: 0.09,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* ── Purple accent strip (RTL: right edge) ── */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#7c3aed', opacity: 0.9, zIndex: 1 }} />

      {/* ── Celebration banner (real win / real milestone) ── */}
      {celebration && (
        <Pressable
          onPress={dismissCelebration}
          accessibilityRole="button"
          accessibilityLabel={
            celebration.kind === 'win'
              ? `צדקתם! ת״א-35 ${winColorWord}. הרווחתם ${celebration.coins} מטבעות. הקישו לסגירה`
              : `רצף הצבעות של ${celebration.milestone} ימים. הרווחתם ${celebration.coins} מטבעות. הקישו לסגירה`
          }
        >
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}
          >
            {!reduced && <ConfettiExplosion gentle particleCount={22} />}
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }} maxFontSizeMultiplier={1.2}>
              {celebration.kind === 'win' ? `צדקתם! ת״א-35 ${winColorWord}` : `רצף הצבעות: ${celebration.milestone} ימים`}
            </Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <GoldCoinIcon size={16} />
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }} maxFontSizeMultiplier={1.2}>
                +{displayCoins}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', writingDirection: 'rtl' }} maxFontSizeMultiplier={1.2}>
                הקישו לסגירה
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {/* ── Header ── */}
      <Pressable
        onPress={handlePressQuestion}
        accessibilityRole="button"
        accessibilityLabel="חכמת ההמונים. לחצו לצפייה"
        // STATIC style only — a function-style ({pressed}) => ({...layout}) drops
        // the WHOLE style on Android (known Pressable bug), which stacked this
        // header into a column and clipped the title at the right edge. That was
        // the "broken header" Yoav kept seeing (2026-07-04) — the earlier padding
        // fix lived inside the dropped style, so it never applied.
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingRight: 16,
          paddingLeft: 12,
          paddingTop: 14,
          paddingBottom: 12,
          gap: 10,
          backgroundColor: '#ffffff',
        }}
        android_ripple={{ color: 'rgba(124,58,237,0.08)' }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#ede9fe',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22 }}>🗳️</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Explicit lineHeight on BOTH texts — without it RN clips Hebrew
              ascenders/descenders (the "subtitle cut at the top" Yoav saw,
              2026-07-03), and the title reads cramped against the subtitle. */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'right',
              lineHeight: 26,
            }}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            חכמת ההמונים
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '600',
              color: STITCH.onSurfaceVariant,
              writingDirection: 'rtl',
              textAlign: 'right',
              marginTop: 2,
              lineHeight: 18,
            }}
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
          >
            סנטימנט הקהילה בשאלות הגדולות
          </Text>
        </View>
        <ChevronLeft size={22} color={STITCH.primary} strokeWidth={2.6} />
      </Pressable>

      {/* ── Personal stats strip (A3) — REAL market accuracy + participation streak ── */}
      {showStats && (
        <View
          style={{
            flexDirection: 'row-reverse',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <StreakHeroCard
            streak={votingStreak}
            variant="mini"
            eyebrow="רצף הצבעות"
            caption={votingStreak === 1 ? 'יום ברצף' : 'ימים ברצף'}
            emoji="🔥"
            showBonus={false}
          />
          <AccuracyHeroCard
            variant="mini"
            accuracy={accuracyInfo.accuracy}
            resolvedCount={accuracyInfo.resolvedCount}
          />
        </View>
      )}

      {/* ── ת"א-35 weekly forecast — pinned; real weekly %s, resets Sunday ── */}
      <Ta35WeeklyForecast />

      {/* ── יומן משקיעים bridge — the nearest macro event's forecast, same
           votes/percentages as the journal sheet (one vote everywhere) ── */}
      <JournalEventPoll />

      {/* ── Poll items ── */}
      {top3.map((q, idx) => {
        const theme = TOPIC_THEMES[q.tags.topic];
        const userVote = userVotes[q.id] ?? null;
        const revealed = userVote !== null;
        const verdict = resolvedVotes[q.id];
        return (
          <Animated.View key={q.id} entering={FadeInDown.duration(280).delay(idx * 60)}>
            <Pressable
              onPress={handlePressQuestion}
              accessibilityRole="button"
              accessibilityLabel={`שאלה: ${q.text}. לחצו להצבעה`}
              // Static style — function-style drops on Android (see header note).
              style={{
                backgroundColor: '#ffffff',
                borderTopWidth: 1,
                borderTopColor: STITCH.surfaceHighest,
              }}
              android_ripple={{ color: 'rgba(124,58,237,0.06)' }}
            >
              {/* Topic accent line */}
              <View style={{ height: 3, backgroundColor: theme.color, opacity: 0.85 }} />

              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                {/* Tag + hot badge row */}
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    gap: 6,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: theme.color + '1A',
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: theme.color + '40',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '900', color: theme.color }}>
                      {theme.label}
                    </Text>
                  </View>
                  {idx === 0 && (
                    <View
                      style={{
                        backgroundColor: '#fef3c7',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: '#fcd34d',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#b45309' }}>
                        🔥 השאלה היומית
                      </Text>
                    </View>
                  )}
                  {verdict && (
                    <View
                      style={{
                        backgroundColor: verdict === 'right' ? '#dcfce7' : '#f1f5f9',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: verdict === 'right' ? '#86efac' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: verdict === 'right' ? '#15803d' : '#64748b' }}>
                        {verdict === 'right' ? '✓ צדקתם' : 'לא הפעם'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Question text */}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: STITCH.onSurface,
                    writingDirection: 'rtl',
                    textAlign: 'right',
                    marginBottom: 10,
                    lineHeight: 20,
                  }}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  {q.text}
                </Text>

                {/* Two pill bars — neutral before voting; after voting only the
                    user's own pick is highlighted (NO invented %/sentiment). */}
                <View style={{ gap: 6 }}>
                  <PollBar
                    option={q.options[0]}
                    isUserChoice={userVote === q.options[0].id}
                    revealed={revealed}
                  />
                  <PollBar
                    option={q.options[1]}
                    isUserChoice={userVote === q.options[1].id}
                    revealed={revealed}
                  />
                </View>

                {/* Nudge — pre-vote CTA, or honest "still collecting votes" */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 10 }}>
                  {revealed ? (
                    <Text style={{ fontSize: 11, color: STITCH.onSurfaceVariant, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                      עדיין אוספים הצבעות
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 11, color: theme.color, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>
                      הצביעו במסך חכמת ההמונים ‹
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* ── Finn coach line ── */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest }}>
        <FinnCue
          variant="tablet"
          text="מה הקהל חושב? לפעמים הציבור צודק. לפעמים..."
          tone="purple"
        />
      </View>

      {/* ── Footer CTA — purple premium gradient ── */}
      <Pressable
        onPress={handlePressQuestion}
        accessibilityRole="button"
        accessibilityLabel="פתחו חכמת המונים — כל השאלות"
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed && !reduced ? 0.99 : 1 }] })}
      >
        <LinearGradient
          colors={['#c4b5fd', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 48,
            paddingVertical: 12,
            paddingHorizontal: 18,
            gap: 8,
          }}
        >
          <Text
            style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', flexShrink: 1 }}
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
          >
            פתחו את חכמת ההמונים
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff' }}>‹</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
