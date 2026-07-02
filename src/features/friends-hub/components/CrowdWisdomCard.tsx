import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CROWD_QUESTIONS } from '../../crowd-question/crowdQuestionsData';
import { useCrowdQuestionStore } from '../../crowd-question/useCrowdQuestionStore';
import type { CrowdQuestion, Sentiment, Topic } from '../../crowd-question/types';
import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { FinnCue } from './FinnCue';

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

interface BarPalette {
  selected: string;
  pastel: string;
}

const BAR_PALETTE: Record<Sentiment, BarPalette> = {
  green: { selected: '#22c55e', pastel: '#bbf7d0' },
  red: { selected: '#ef4444', pastel: '#fecaca' },
  yes: { selected: '#3b82f6', pastel: '#bfdbfe' },
  no: { selected: '#6366f1', pastel: '#c7d2fe' },
};

interface PollBarProps {
  option: CrowdQuestion['options'][number];
  pct: number;
  isUserChoice: boolean;
  /** Reveal the % distribution — only AFTER the user has voted (Yoav 2026-07-02).
   *  Before voting, options are clean neutral pills with no invented baseline. */
  revealed: boolean;
}

function PollBar({ option, pct, isUserChoice, revealed }: PollBarProps): React.ReactElement {
  const palette = BAR_PALETTE[option.sentiment];

  // Pre-vote: clean neutral pill, no fill, no %.
  if (!revealed) {
    return (
      <View
        accessibilityRole="button"
        accessibilityLabel={option.label}
        style={{
          height: 36,
          borderRadius: 10,
          backgroundColor: '#f1f5f9',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          justifyContent: 'center',
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 12,
          gap: 6,
        }}
      >
        {option.emoji && <Text style={{ fontSize: 14 }}>{option.emoji}</Text>}
        <Text
          style={{ fontSize: 13, fontWeight: '800', color: '#334155', writingDirection: 'rtl' }}
          maxFontSizeMultiplier={1.15}
        >
          {option.label}
        </Text>
        <View style={{ flex: 1 }} />
      </View>
    );
  }

  // Post-vote: reveal the % distribution.
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${option.label}: ${pct}%${isUserChoice ? ' (הצבעתם)' : ''}`}
      accessibilityValue={{ now: pct, min: 0, max: 100, text: `${pct}%` }}
      style={{
        height: 36,
        borderRadius: 10,
        backgroundColor: palette.pastel,
        overflow: 'hidden',
        borderWidth: isUserChoice ? 2 : 0,
        borderColor: isUserChoice ? '#16a34a' : 'transparent',
        justifyContent: 'center',
      }}
    >
      {/* Filled portion */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          backgroundColor: palette.selected,
          opacity: 0.85,
        }}
      />
      {/* Label row */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 12,
          gap: 6,
        }}
      >
        {option.emoji && <Text style={{ fontSize: 14 }}>{option.emoji}</Text>}
        <Text
          style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', writingDirection: 'rtl' }}
          maxFontSizeMultiplier={1.15}
        >
          {option.label}
        </Text>
        {isUserChoice && (
          <View style={{ backgroundColor: '#16a34a', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>✓ הצבעתם</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }} maxFontSizeMultiplier={1.15}>
          {pct}%
        </Text>
      </View>
    </View>
  );
}

export function CrowdWisdomCard(): React.ReactElement {
  const getTodayQuestion = useCrowdQuestionStore((s) => s.getTodayQuestion);
  const userVotes = useCrowdQuestionStore((s) => s.userVotes);

  const top3 = React.useMemo<CrowdQuestion[]>(() => {
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

  function handlePressQuestion(): void {
    tapHaptic();
    router.push('/crowd-wisdom' as never);
  }

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

      {/* ── Header ── */}
      <Pressable
        onPress={handlePressQuestion}
        accessibilityRole="button"
        accessibilityLabel="חכמת ההמונים. לחצו לצפייה"
        style={({ pressed }) => ({
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          gap: 10,
          backgroundColor: pressed ? STITCH.surfaceLow : '#ffffff',
        })}
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
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '900',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
            maxFontSizeMultiplier={1.15}
          >
            חכמת ההמונים
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: STITCH.onSurfaceVariant,
              writingDirection: 'rtl',
              textAlign: 'right',
              marginTop: 1,
            }}
            maxFontSizeMultiplier={1.15}
          >
            סנטימנט הקהילה בשאלות הגדולות
          </Text>
        </View>
        <Text style={{ fontSize: 20, color: STITCH.primary }}>‹</Text>
      </Pressable>

      {/* ── Poll items ── */}
      {top3.map((q, idx) => {
        const theme = TOPIC_THEMES[q.tags.topic];
        const userVote = userVotes[q.id] ?? null;
        const revealed = userVote !== null;
        return (
          <Animated.View key={q.id} entering={FadeInDown.duration(280).delay(idx * 60)}>
            <Pressable
              onPress={handlePressQuestion}
              accessibilityRole="button"
              accessibilityLabel={`שאלה: ${q.text}. לחצו להצבעה`}
              style={({ pressed }) => ({
                backgroundColor: pressed ? STITCH.surfaceLow : '#ffffff',
                borderTopWidth: 1,
                borderTopColor: STITCH.surfaceHighest,
              })}
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
                >
                  {q.text}
                </Text>

                {/* Two pill bars — neutral before voting, % distribution after */}
                <View style={{ gap: 6 }}>
                  <PollBar
                    option={q.options[0]}
                    pct={q.baselinePct[0]}
                    isUserChoice={userVote === q.options[0].id}
                    revealed={revealed}
                  />
                  <PollBar
                    option={q.options[1]}
                    pct={q.baselinePct[1]}
                    isUserChoice={userVote === q.options[1].id}
                    revealed={revealed}
                  />
                </View>

                {/* Pre-vote nudge (no invented counts) */}
                {!revealed && (
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ fontSize: 11, color: theme.color, fontWeight: '800' }} maxFontSizeMultiplier={1.15}>
                      הצביעו במסך חכמת ההמונים ‹
                    </Text>
                  </View>
                )}
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
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
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
