import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Newspaper, ChevronLeft, MessageCircle, Sparkles } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { playSuccessChord, playSoftThud } from '../lib/sounds';
import type { ChallengeItem } from '../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ACCENT_GOLD = '#facc15';
const ACCENT_GOLD_DEEP = '#d97706';

// Captain Shark voice — snarky but warm, no shark emoji. We pick one of two
// lines per item so the second card doesn't echo the first verbatim.
const CORRECT_LINES = [
  'מטורף, פיצחת בלי לחשוב פעמיים',
  'קלאסי. סיבוב הבא יותר קשה',
];
function pickCorrectLine(index: number): string {
  return CORRECT_LINES[index % CORRECT_LINES.length];
}
function pickWrongLine(entity: string, index: number): string {
  return index === 0
    ? `הא, חשבת? התשובה: ${entity}. בא נלקח את הבא`
    : `נגעת אבל לא לקחת. ${entity} הייתה התשובה`;
}

interface ChallengePageProps {
  item: ChallengeItem;
  index: 0 | 1;
  /** Width of the parent FlatList page — passed in so the page sizes match. */
  pageWidth?: number;
  /** Called when the user picks a chip (or restored from a prior answer). */
  onAnswered: (selectedIdx: number, wasCorrect: boolean) => void;
  /** Tap "המשך" → parent advances FlatList by one page. */
  onContinue: () => void;
  /** Open the chat overlay with this item as context. */
  onOpenChat: () => void;
  /** If the user already answered this item earlier, we restore that state. */
  preAnsweredIdx?: number;
}

/**
 * Full-screen page for a single news item, curiosity-gap format:
 *   State A — blanked headline + 4 chips
 *   State B — correct: morph the ____ → entity (gold), summary FadeInDown, confetti
 *   State C — wrong: shake + reveal correct entity in gold, summary
 *
 * Falls back to the legacy `question + options` layout if the payload doesn't
 * carry the v2 blanked-headline fields yet (cached pre-deploy rows).
 */
export function ChallengePage({
  item,
  index,
  pageWidth,
  onAnswered,
  onContinue,
  onOpenChat,
  preAnsweredIdx,
}: ChallengePageProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(preAnsweredIdx ?? null);
  const [showConfetti, setShowConfetti] = useState(false);

  const hasV2 = Boolean(item.blankedHeadline && item.chips && typeof item.correctChipIdx === 'number');
  const chips = hasV2 ? item.chips : (item.options ?? ['', '', '', '']);
  const correctIdx = hasV2 ? item.correctChipIdx : (item.correctIdx ?? 0);

  const showResult = selected !== null;
  const wasCorrect = showResult && selected === correctIdx;
  const revealEntity = hasV2 ? item.blankedEntity : '';

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const handleSelect = useCallback(
    (idx: number) => {
      if (showResult) return;
      tapHaptic();
      const correct = idx === correctIdx;
      setSelected(idx);
      onAnswered(idx, correct);
      if (correct) {
        successHaptic();
        if (!reduceMotion) setShowConfetti(true);
        void playSuccessChord();
      } else {
        errorHaptic();
        if (!reduceMotion) {
          shakeX.value = withSequence(
            withTiming(-10, { duration: 60 }),
            withTiming(10, { duration: 60 }),
            withTiming(-6, { duration: 60 }),
            withTiming(0, { duration: 60 }),
          );
        }
        void playSoftThud();
      }
    },
    [showResult, correctIdx, onAnswered, reduceMotion, shakeX],
  );

  useEffect(() => {
    if (showConfetti) {
      const t = setTimeout(() => setShowConfetti(false), 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [showConfetti]);

  const renderedHeadline = useMemo(() => {
    if (!hasV2) {
      return (
        <Text style={styles.headlineFallback} allowFontScaling={false}>
          {item.question ?? item.headlineHe}
        </Text>
      );
    }
    if (!showResult) {
      const parts = item.blankedHeadline.split('____');
      return (
        <Text style={styles.headline} allowFontScaling={false}>
          {parts[0]}
          <Text style={styles.blankedSlot}>____</Text>
          {parts[1] ?? ''}
        </Text>
      );
    }
    const parts = item.blankedHeadline.split('____');
    return (
      <Text style={styles.headline} allowFontScaling={false}>
        {parts[0]}
        <Text style={[styles.revealedEntity, wasCorrect ? styles.revealedEntityCorrect : styles.revealedEntityWrong]}>
          {revealEntity}
        </Text>
        {parts[1] ?? ''}
      </Text>
    );
  }, [hasV2, item, showResult, wasCorrect, revealEntity]);

  return (
    <View style={[styles.page, pageWidth ? { width: pageWidth } : null]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.eyebrowRow}>
          <Text style={styles.itemNumber} allowFontScaling={false}>
            {index === 0 ? '01' : '02'} / 02
          </Text>
        </View>

        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} accessible={false} />
        ) : (
          <LinearGradient
            colors={['#1e3a8a', '#0c4a6e', '#0e7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imagePlaceholder}
          >
            <Newspaper size={36} color="rgba(255,255,255,0.7)" strokeWidth={2} />
          </LinearGradient>
        )}

        <Animated.View style={shakeStyle}>{renderedHeadline}</Animated.View>

        {!showResult && (
          <View style={styles.chipsGrid}>
            {chips.map((chip, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSelect(idx)}
                accessibilityRole="button"
                accessibilityLabel={`בחר: ${chip}`}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={styles.chipText} allowFontScaling={false}>
                  {chip}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {showResult && (
          <Animated.View entering={FadeInDown.duration(320).springify().damping(16)}>
            <View style={[styles.resultPanel, wasCorrect ? styles.resultCorrect : styles.resultWrong]}>
              <View style={styles.resultHeader}>
                <Sparkles size={16} color={wasCorrect ? '#15803d' : '#b91c1c'} strokeWidth={2.6} />
                <Text
                  style={[styles.resultHeaderText, { color: wasCorrect ? '#15803d' : '#b91c1c' }]}
                  allowFontScaling={false}
                >
                  {wasCorrect
                    ? pickCorrectLine(index)
                    : pickWrongLine(revealEntity, index)}
                </Text>
              </View>
              <Text style={styles.summary} allowFontScaling={false}>
                {item.summaryHe}
              </Text>
              {item.explanation ? (
                <Text style={styles.explanation} allowFontScaling={false}>
                  {item.explanation}
                </Text>
              ) : null}
              {item.historicalExample ? (
                <View style={styles.historyBox}>
                  <Text style={styles.historyLabel} allowFontScaling={false}>📚 דוגמה מהעבר</Text>
                  <Text style={styles.historyText} allowFontScaling={false}>
                    {item.historicalExample}
                  </Text>
                </View>
              ) : null}
            </View>

            <Animated.View entering={FadeIn.delay(180).duration(220)}>
              <Pressable
                onPress={() => { tapHaptic(); onOpenChat(); }}
                style={styles.chatButton}
                accessibilityRole="button"
                accessibilityLabel="שאל את הקפטן שארק"
              >
                <MessageCircle size={16} color={STITCH.primary} strokeWidth={2.4} />
                <Text style={styles.chatButtonText} allowFontScaling={false}>
                  💬 שאל את הקפטן שארק
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(360).duration(240)}>
              <Pressable
                onPress={() => { tapHaptic(); onContinue(); }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
                style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.continueBtnText} allowFontScaling={false}>המשך</Text>
                <ChevronLeft size={20} color="#0f172a" strokeWidth={3} />
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>

      {showConfetti && (
        <View pointerEvents="none" style={styles.confettiOverlay}>
          <ConfettiExplosion />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: STITCH.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 14,
  },
  eyebrowRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: 1.2,
  },
  image: {
    width: '100%',
    height: SCREEN_H * 0.22,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
  },
  imagePlaceholder: {
    width: '100%',
    height: SCREEN_H * 0.22,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  headlineFallback: {
    fontSize: 18,
    fontWeight: '800',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 26,
  },
  blankedSlot: {
    color: ACCENT_GOLD_DEEP,
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    fontWeight: '900',
    letterSpacing: 1,
  },
  revealedEntity: {
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  revealedEntityCorrect: {
    color: '#15803d',
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
  revealedEntityWrong: {
    color: ACCENT_GOLD_DEEP,
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
  },
  chipsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  chip: {
    width: (SCREEN_W - 20 * 2 - 10) / 2,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: STITCH.primary,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: '#e0f2fe',
    transform: [{ scale: 0.97 }],
  },
  chipText: {
    fontSize: 15,
    fontWeight: '800',
    color: STITCH.primary,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  resultPanel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    marginTop: 4,
  },
  resultCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  resultWrong: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  resultHeaderText: {
    fontSize: 14,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  summary: {
    fontSize: 15,
    fontWeight: '600',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 22,
  },
  explanation: {
    fontSize: 13,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 20,
  },
  historyBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 4,
  },
  historyText: {
    fontSize: 12,
    fontWeight: '500',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 18,
  },
  chatButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: STITCH.primaryCyan,
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.primary,
    writingDirection: 'rtl',
  },
  continueBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: ACCENT_GOLD,
    shadowColor: ACCENT_GOLD_DEEP,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
  },
  confettiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
