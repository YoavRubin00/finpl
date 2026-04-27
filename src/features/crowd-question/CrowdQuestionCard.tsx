import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
import { FINN_DANCING, FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useAuthStore } from '../auth/useAuthStore';
import { submitCrowdVote, type CrowdQuestionStats } from '../../db/sync/syncCrowdQuestion';
import { getIsraelDateISO } from '../../utils/israelTime';
import { useLivePercents } from './computeLiveStats';
import { useCrowdQuestionStore } from './useCrowdQuestionStore';
import type { CrowdOption, CrowdQuestion, MarketSnapshot, Sentiment } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function fixBidi(text: string): string {
  return text.replace(
    /([A-Za-z0-9$%€£¥₪,.+\-]+(?:\s+[A-Za-z0-9$%€£¥₪,.+\-]+)*)/g,
    '\u200F$1\u200F',
  );
}

interface BarPalette {
  selected: string;
  pastel: string;
}

const BAR_PALETTE: Record<Sentiment, BarPalette> = {
  green: { selected: '#22c55e', pastel: '#bbf7d0' },
  red: { selected: '#ef4444', pastel: '#fecaca' },
  yes: { selected: '#3b82f6', pastel: '#bfdbfe' },
  no: { selected: '#3b82f6', pastel: '#bfdbfe' },
};

const WISDOM_EXPLANATION =
  'כשהרבה אנשים מנחשים יחד, הממוצע של כולם לרוב מדויק יותר מהאדם הכי חכם בקבוצה. בשווקים זה לא תחזית — זה תמונת סנטימנט: איך הקהילה מרגישה עכשיו. לפעמים ההמון צודק, לפעמים זה דווקא הסיגנל לצאת מהזרם.';

interface Props {
  market?: MarketSnapshot;
}

export const CrowdQuestionCard = React.memo(function CrowdQuestionCard({ market }: Props) {
  const getTodayQuestion = useCrowdQuestionStore((s) => s.getTodayQuestion);
  const hasVotedToday = useCrowdQuestionStore((s) => s.hasVotedToday);
  const getUserVoteFor = useCrowdQuestionStore((s) => s.getUserVoteFor);
  const recordLocalVote = useCrowdQuestionStore((s) => s.recordLocalVote);
  const authId = useAuthStore((s) => s.email ?? 'guest');
  const syncToken = useAuthStore((s) => s.syncToken);

  const question = useMemo<CrowdQuestion>(() => getTodayQuestion(market), [getTodayQuestion, market]);
  const alreadyVoted = hasVotedToday();
  const persistedVote = getUserVoteFor(question.id);

  const [chosen, setChosen] = useState<CrowdOption['id'] | null>(persistedVote);
  const [optimisticStats, setOptimisticStats] = useState<CrowdQuestionStats | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    setChosen(persistedVote);
    setOptimisticStats(null);
    setVoteError(null);
  }, [persistedVote, question.id]);

  const showResults = chosen !== null || alreadyVoted;

  const handleChoose = useCallback(
    async (option: CrowdOption) => {
      if (alreadyVoted || chosen) return;
      tapHaptic();
      setChosen(option.id);
      setVoteError(null);
      try {
        const dateIL = getIsraelDateISO();
        const result = await submitCrowdVote({
          authId,
          syncToken,
          questionId: question.id,
          choice: option.id,
          voteDateIL: dateIL,
        });
        recordLocalVote(question.id, option.id);
        setOptimisticStats({ countA: result.countA, countB: result.countB, total: result.total });
        successHaptic();
      } catch (err: unknown) {
        setChosen(null);
        setVoteError(err instanceof Error ? err.message : 'fetch failed');
        errorHaptic();
      }
    },
    [alreadyVoted, chosen, question.id, authId, syncToken, recordLocalVote],
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <CardHeader />

          <Animated.View entering={FadeIn.duration(280).delay(80)} style={styles.finnRow}>
            <View style={styles.bubble}>
              <View style={styles.bubbleTail} accessible={false} importantForAccessibility="no" />
              <Text style={[styles.bubbleText, RTL]} allowFontScaling={false}>
                {fixBidi(question.text)}
              </Text>
            </View>
            <ExpoImage
              source={chosen ? FINN_DANCING : FINN_STANDARD}
              style={styles.finn}
              contentFit="contain"
              accessible={false}
            />
          </Animated.View>

          {!showResults ? (
            <Animated.View
              entering={FadeIn.duration(260).delay(160)}
              exiting={FadeOut.duration(180)}
              style={styles.optionsWrap}
            >
              {question.options.map((option, idx) => (
                <OptionButton
                  key={option.id}
                  option={option}
                  onPress={() => handleChoose(option)}
                  delay={160 + idx * 60}
                />
              ))}
              {voteError && (
                <Text
                  style={[styles.errorText, RTL]}
                  accessibilityLiveRegion="assertive"
                  accessibilityRole="alert"
                  allowFontScaling={false}
                >
                  לא הצלחנו לשמור את ההצבעה. נסו שוב.
                </Text>
              )}
            </Animated.View>
          ) : (
            <ResultsBars
              question={question}
              userVote={chosen}
              alreadyVoted={alreadyVoted}
              optimisticStats={optimisticStats}
            />
          )}

          <Animated.View
            entering={FadeInUp.duration(420).delay(showResults ? 280 : 320)}
            style={styles.explainCard}
            accessible
            accessibilityLabel={`מה זה חכמת ההמונים. ${WISDOM_EXPLANATION}`}
          >
            <View style={styles.explainHeader}>
              <Text style={styles.explainEmoji} allowFontScaling={false} accessible={false}>
                💡
              </Text>
              <Text style={[styles.explainTitle, RTL]} allowFontScaling={false}>
                מה זה חכמת ההמונים?
              </Text>
            </View>
            <Text style={[styles.explainBody, RTL]} allowFontScaling={false}>
              {WISDOM_EXPLANATION}
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
});

function CardHeader() {
  const reduceMotion = useReducedMotion();
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      dotOpacity.value = 1;
      return;
    }
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
    );
  }, [dotOpacity, reduceMotion]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
      <View
        style={styles.liveChip}
        accessible
        accessibilityLabel="עדכון בזמן אמת"
      >
        <Animated.View style={[styles.liveDot, dotStyle]} />
        <Text style={styles.liveLabel} allowFontScaling={false}>
          בזמן אמת
        </Text>
      </View>
      <Text style={[styles.title, RTL]} accessibilityRole="header" allowFontScaling={false}>
        חכמת ההמונים
      </Text>
    </Animated.View>
  );
}

function OptionButton({
  option,
  onPress,
  delay,
}: {
  option: CrowdOption;
  onPress: () => void;
  delay: number;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Animated.View entering={FadeInUp.duration(260).delay(delay)} style={styles.optionGlowWrap}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={`${option.label} — הצבעה`}
        accessibilityHint="הקש להצבעה"
      >
        {/* bg/border live on inner View so Reanimated 4 + Pressable function-style
            quirks on Android can't drop the styles and leave white-on-white text */}
        <View style={[styles.optionBtn, pressed && styles.optionBtnPressed]}>
          <Text style={styles.optionText} allowFontScaling={false}>
            {option.emoji ? `${option.label}  ${option.emoji}` : option.label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ResultsBars({
  question,
  userVote,
  alreadyVoted,
  optimisticStats,
}: {
  question: CrowdQuestion;
  userVote: CrowdOption['id'] | null;
  alreadyVoted: boolean;
  optimisticStats: CrowdQuestionStats | null;
}) {
  const live = useLivePercents({
    questionId: question.id,
    userVote,
    optimisticStats,
  });

  return (
    <Animated.View entering={FadeInUp.duration(320)} style={styles.resultsWrap}>
      <ResultBar
        option={question.options[0]}
        pct={live.pctA}
        isMine={userVote === 'a'}
        delay={0}
      />
      <ResultBar
        option={question.options[1]}
        pct={live.pctB}
        isMine={userVote === 'b'}
        delay={80}
      />
      {!live.hasData && !live.isLoading && (
        <Text style={[styles.placeholderText, RTL]} allowFontScaling={false}>
          תהיו הראשונים להצביע היום!
        </Text>
      )}
      {(alreadyVoted || userVote) && (
        <Text style={[styles.votedToday, RTL]} accessibilityLiveRegion="polite" allowFontScaling={false}>
          ✓ הצבעת היום
        </Text>
      )}
    </Animated.View>
  );
}

function ResultBar({
  option,
  pct,
  isMine,
  delay,
}: {
  option: CrowdOption;
  pct: number;
  isMine: boolean;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(0);
  const lastPct = React.useRef<number | null>(null);
  const palette = BAR_PALETTE[option.sentiment];

  useEffect(() => {
    if (lastPct.current !== null && Math.abs(lastPct.current - pct) < 0.5) {
      return;
    }
    lastPct.current = pct;
    const duration = reduceMotion ? 220 : 600;
    width.value = withTiming(pct, { duration, easing: Easing.out(Easing.cubic) });
  }, [pct, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <Animated.View entering={FadeInUp.duration(320).delay(delay)}>
      <View
        style={styles.resultRow}
        accessible
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${option.label}: ${pct} אחוז${isMine ? ', הבחירה שלך' : ''}`}
      >
        <Animated.View
          style={[
            styles.resultFill,
            { backgroundColor: isMine ? palette.selected : palette.pastel },
            fillStyle,
          ]}
        />
        <View style={styles.resultContent}>
          <View style={styles.resultLabelRow}>
            <Text style={styles.resultLabel} allowFontScaling={false}>
              {option.emoji ? `${option.label}  ${option.emoji}` : option.label}
            </Text>
            {isMine && (
              <View style={styles.myBadge}>
                <Text style={styles.myBadgeText} allowFontScaling={false}>
                  ✓ הבחירה שלך
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.resultPct} allowFontScaling={false}>
            {fixBidi(`${pct}%`)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.35)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
  },
  header: {
    gap: 8,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  liveChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfeff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0891b2',
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0891b2',
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0369a1',
    alignSelf: 'flex-end',
  },
  finnRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  finn: {
    width: 100,
    height: 100,
    flexShrink: 0,
  },
  bubble: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.35)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleTail: {
    position: 'absolute',
    right: -8,
    top: 22,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'rgba(14,165,233,0.35)',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0f172a',
    fontWeight: '700',
  },
  optionsWrap: {
    gap: 12,
    marginTop: 4,
  },
  optionGlowWrap: {
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 0,
  },
  optionBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 5,
    borderBottomColor: '#0369a1',
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  optionBtnPressed: {
    opacity: 0.95,
    transform: [{ translateY: 2 }],
    borderBottomWidth: 3,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 4,
  },
  resultsWrap: {
    gap: 10,
    marginTop: 4,
  },
  resultRow: {
    height: 52,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  resultFill: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  resultContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 1,
  },
  resultLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    writingDirection: 'rtl',
  },
  myBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(3,105,161,0.3)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  myBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0369a1',
    writingDirection: 'rtl',
  },
  resultPct: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    textAlign: 'center',
    marginTop: 6,
  },
  votedToday: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
    marginTop: 6,
  },
  explainCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  explainHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  explainEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  explainTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0369a1',
  },
  explainBody: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: '#1e293b',
  },
});