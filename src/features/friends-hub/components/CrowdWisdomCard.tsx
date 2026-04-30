import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { CROWD_QUESTIONS } from '../../crowd-question/crowdQuestionsData';
import { useCrowdQuestionStore } from '../../crowd-question/useCrowdQuestionStore';
import type { CrowdQuestion, Sentiment, Topic } from '../../crowd-question/types';
import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

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

function LiveDot(): React.ReactElement {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (reduced) return;
    scale.value = withRepeat(
      withTiming(1.4, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: '#ef4444',
        },
        animStyle,
      ]}
    />
  );
}

interface PollBarProps {
  option: CrowdQuestion['options'][number];
  pct: number;
  isUserChoice: boolean;
}

function PollBar({ option, pct, isUserChoice }: PollBarProps): React.ReactElement {
  const palette = BAR_PALETTE[option.sentiment];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${option.label}: ${pct}%${isUserChoice ? ' (הצבעת)' : ''}`}
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
          style={{
            fontSize: 13,
            fontWeight: '900',
            color: '#0f172a',
            writingDirection: 'rtl',
          }}
        >
          {option.label}
        </Text>
        {isUserChoice && (
          <View
            style={{
              backgroundColor: '#16a34a',
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 1,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>✓ הצבעת</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '900',
            color: '#0f172a',
          }}
        >
          {pct}%
        </Text>
      </View>
    </View>
  );
}

export function CrowdWisdomCard(): React.ReactElement {
  const getTodayQuestion = useCrowdQuestionStore((s) => s.getTodayQuestion);
  const userVotes = useCrowdQuestionStore((s) => s.userVotes);

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
    // If diversity didn't fill 3 (unlikely), pad with most-popular regardless of topic
    if (picks.length < 3) {
      for (const q of sorted) {
        if (picks.length >= 3) break;
        if (!picks.some((p) => p.id === q.id)) picks.push(q);
      }
    }
    return picks;
  }, [getTodayQuestion]);

  const totalVoters = useMemo(
    () => top3.reduce((s, q) => s + q.baselineN, 0),
    [top3],
  );

  function handlePressQuestion(): void {
    tapHaptic();
    router.push('/finfeed' as never);
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
      {/* ── Purple accent strip ── */}
      <View style={{ height: 4, backgroundColor: '#7c3aed', opacity: 0.8 }} />

      {/* ── Header ── */}
      <Pressable
        onPress={handlePressQuestion}
        accessibilityRole="button"
        accessibilityLabel={`חכמת ההמונים, ${totalVoters.toLocaleString('he-IL')} הצביעו. לחץ לצפייה`}
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
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '900',
                color: STITCH.onSurface,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              חכמת ההמונים
            </Text>
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#fef2f2',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: '#fecaca',
              }}
            >
              <LiveDot />
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#b91c1c', writingDirection: 'rtl' }}>בזמן אמת</Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: STITCH.onSurfaceVariant,
              writingDirection: 'rtl',
              textAlign: 'right',
              marginTop: 1,
            }}
          >
            {totalVoters.toLocaleString('he-IL')} משתתפים · סנטימנט שוק
          </Text>
        </View>
        <Text style={{ fontSize: 20, color: STITCH.primary }}>‹</Text>
      </Pressable>

      {/* ── Poll items ── */}
      {top3.map((q, idx) => {
        const theme = TOPIC_THEMES[q.tags.topic];
        const userVote = userVotes[q.id] ?? null;
        return (
          <Animated.View
            key={q.id}
            entering={FadeIn.duration(200).delay(idx * 80)}
          >
            <Pressable
              onPress={handlePressQuestion}
              accessibilityRole="button"
              accessibilityLabel={`שאלה: ${q.text}. ${q.baselineN.toLocaleString('he-IL')} הצביעו. לחץ להצבעה`}
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

                {/* Two pill bars */}
                <View style={{ gap: 6 }}>
                  <PollBar
                    option={q.options[0]}
                    pct={q.baselinePct[0]}
                    isUserChoice={userVote === q.options[0].id}
                  />
                  <PollBar
                    option={q.options[1]}
                    pct={q.baselinePct[1]}
                    isUserChoice={userVote === q.options[1].id}
                  />
                </View>

                {/* Footer stats */}
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    marginTop: 10,
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: STITCH.onSurfaceVariant, fontWeight: '700' }}>
                    👥 {q.baselineN.toLocaleString('he-IL')} הצביעו
                  </Text>
                  {userVote === null && (
                    <Text style={{ fontSize: 11, color: theme.color, fontWeight: '800' }}>
                      הצביעו בפיד הראשי ‹
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* ── Footer CTA ── */}
      <Pressable
        onPress={handlePressQuestion}
        accessibilityRole="button"
        accessibilityLabel="פתח את הפיד הראשי לכל השאלות"
        style={({ pressed }) => ({
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 46,
          paddingVertical: 12,
          backgroundColor: pressed ? '#ede9fe' : '#f5f3ff',
          borderTopWidth: 1,
          borderTopColor: STITCH.surfaceHighest,
          gap: 6,
        })}
      >
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#7c3aed', writingDirection: 'rtl' }}>
          לכל השאלות בפיד
        </Text>
        <Text style={{ fontSize: 14, color: '#7c3aed' }}>‹</Text>
      </Pressable>
    </View>
  );
}
