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
  withRepeat,
  withDelay,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { Image as ExpoImage } from 'expo-image';
import { ChevronLeft, MessageCircle, Newspaper } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { playSuccessChord, playSoftThud } from '../lib/sounds';
import { FINN_FIRE, FINN_HAPPY, FINN_EMPATHIC, FINN_TALKING } from '../../retention-loops/finnMascotConfig';
import type { ChallengeItem } from '../types';

// Lottie assets — chosen by יפיופי: live market vibe in the hero, sparkle on
// correct, coins flying on reward. All already exist in assets/lottie/.
const HERO_GRAPH_LOTTIE = require('../../../../assets/lottie/wired-flat-163-graph-line-chart-hover-slide.json');
const SPARKLES_LOTTIE = require('../../../../assets/lottie/wired-flat-2474-sparkles-glitter-hover-pinch.json');
const COIN_LOTTIE = require('../../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json');

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ACCENT_GOLD = '#facc15';
const ACCENT_GOLD_DEEP = '#d97706';

// Heuristic: figure out which market the item is about. We use a small SVG-safe
// emoji (📍/🏛️) plus the country label in Hebrew — regional-indicator flag
// emojis (🇺🇸/🇮🇱/🇪🇺) render as raw "US"/"IL"/"EU" letter pairs on Windows web
// (no flag font), which read as "vs ארה״ב" garbage. The neutral pin keeps the
// pill universally legible.
function inferSourceFlag(item: ChallengeItem): { flag: string; label: string } {
  const haystack = `${item.source ?? ''} ${item.summaryHe ?? ''} ${item.headlineHe ?? ''}`;
  if (/בנק ישראל|בורסה.*תל אביב|ת"א|TA-?125|ישראל|שקל/i.test(haystack)) {
    return { flag: '🏛️', label: 'ישראל' };
  }
  if (/Fed|S&P|Nasdaq|דאו|וול ?סטריט|ארה"ב|ארה״ב|דולר/i.test(haystack)) {
    return { flag: '🏛️', label: 'ארה״ב' };
  }
  if (/ECB|אירו|אירופה|גרמני|צרפת/i.test(haystack)) {
    return { flag: '🏛️', label: 'אירופה' };
  }
  return { flag: '🌐', label: 'גלובלי' };
}

// Heuristic: pick a playful prefix emoji per chip based on directional cues
// in the text. Pure visual sugar — none of these expose the correct answer.
function chipEmoji(chip: string): string {
  if (/עליה|עולה|עולים|חזק|חיובי|שיא|רווח|צמיחה/i.test(chip)) return '📈';
  if (/ירידה|נופל|נופלים|חלש|שלילי|הפסד|קריסה|מיתון/i.test(chip)) return '📉';
  if (/דרמטי|פתאומי|הפתעה|זעזוע|משבר/i.test(chip)) return '💥';
  return '🤔';
}

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

  // Pulse on the blanked ____ slot — invites the user to look and tap.
  // Cancelled once the answer is revealed OR when reduced motion is on.
  const slotPulse = useSharedValue(1);
  const slotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: slotPulse.value }],
    opacity: 0.75 + (slotPulse.value - 1) * 5, // 0.75–1.0 mapped from 1.00–1.05
  }));
  useEffect(() => {
    if (reduceMotion || showResult) {
      cancelAnimation(slotPulse);
      slotPulse.value = withTiming(1, { duration: 200 });
      return;
    }
    slotPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 700 }),
        withTiming(1.0, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, showResult, slotPulse]);

  // Delayed pulse on the continue button — starts 800ms after the result
  // appears so the eye finishes reading the panel before being invited
  // onward. Bouncy press snap on tap.
  const continuePulse = useSharedValue(1);
  const continueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continuePulse.value }],
  }));
  useEffect(() => {
    if (!showResult || reduceMotion) {
      cancelAnimation(continuePulse);
      continuePulse.value = withTiming(1, { duration: 200 });
      return;
    }
    continuePulse.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 800 }),
          withTiming(1.0, { duration: 800 }),
        ),
        -1,
        false,
      ),
    );
  }, [showResult, reduceMotion, continuePulse]);

  // Per-chip press scale animation refs — separate so 4 chips don't stomp
  // each other's spring state.
  const chipScales = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];
  const chipPressIn = useCallback((idx: number) => {
    chipScales[idx].value = withSpring(0.94, { damping: 14, stiffness: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chipPressOut = useCallback((idx: number) => {
    chipScales[idx].value = withSpring(1, { damping: 12, stiffness: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Pulse the ____ slot to invite tapping. Wrapped in Animated.Text so
      // scale/opacity can be driven from a shared value.
      return (
        <Text style={styles.headline} allowFontScaling={false}>
          {parts[0]}
          <Animated.Text style={[styles.blankedSlot, slotPulseStyle]}>____</Animated.Text>
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
    <LinearGradient
      colors={['#fafbfc', '#f0f9ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.page, pageWidth ? { width: pageWidth } : null]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.eyebrowRow}>
          {/* News-strap badge — makes it visually obvious this is a real news
              item, not a quiz / mini-game. User feedback 2026-05-30. */}
          <View style={styles.newsStrap}>
            <Newspaper size={11} color="#dc2626" strokeWidth={2.6} />
            <Text style={styles.newsStrapText} allowFontScaling={false}>
              אקטואליה היום · LIVE
            </Text>
          </View>
          <Text style={styles.itemNumber} allowFontScaling={false}>
            {index === 0 ? '01' : '02'} / 02
          </Text>
        </View>

        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} accessible={false} />
        ) : (
          // Hero composite: animated graph behind a Captain Shark mascot, with
          // a "LIVE" red ticker + market-flag pill. Replaces the static
          // newspaper-icon placeholder so the screen reads as "morning ritual
          // with Finn", not "test placeholder". See plan §1.
          <View style={styles.heroWrap} accessible={false}>
            <LinearGradient
              colors={['#1e3a8a', '#0c4a6e', '#0e7490']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {!reduceMotion && (
              <View pointerEvents="none" style={styles.heroLottie}>
                <LottieView source={HERO_GRAPH_LOTTIE} autoPlay loop style={{ width: '100%', height: '100%' }} />
              </View>
            )}
            {/* Source pill — top-LEFT in RTL frame (visual end). */}
            {(() => {
              const { flag, label } = inferSourceFlag(item);
              return (
                <View style={styles.heroSourcePill} pointerEvents="none">
                  <Text style={styles.heroSourcePillText} allowFontScaling={false}>
                    {flag} {label}
                  </Text>
                </View>
              );
            })()}
            {/* LIVE ticker — bottom, red, TV-news vibe. */}
            <View style={styles.heroTicker} pointerEvents="none">
              <View style={styles.heroTickerDot} />
              <Text style={styles.heroTickerText} allowFontScaling={false}>
                שווקים פעילים · עכשיו
              </Text>
            </View>
            {/* Finn the news anchor — corner mascot. */}
            <ExpoImage
              source={FINN_FIRE}
              style={styles.heroFinn}
              contentFit="contain"
              accessible={false}
            />
          </View>
        )}

        <Animated.View style={shakeStyle}>{renderedHeadline}</Animated.View>

        {!showResult && (
          <View style={styles.chipsGrid}>
            {chips.map((chip, idx) => {
              const emoji = chipEmoji(chip);
              const animStyle = useAnimatedStyle(() => ({
                transform: [{ scale: chipScales[idx].value }],
              }));
              return (
                <Animated.View
                  key={idx}
                  entering={FadeInDown.delay(idx * 80).springify().damping(14)}
                  style={[styles.chipWrap, animStyle]}
                >
                  <Pressable
                    onPress={() => handleSelect(idx)}
                    onPressIn={() => chipPressIn(idx)}
                    onPressOut={() => chipPressOut(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`בחר: ${chip}`}
                    hitSlop={4}
                    style={styles.chip}
                  >
                    <LinearGradient
                      colors={['#ffffff', '#f0f9ff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.chipGradient}
                    >
                      <Text style={styles.chipEmoji} allowFontScaling={false}>
                        {emoji}
                      </Text>
                      <Text style={styles.chipText} allowFontScaling={false}>
                        {chip}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        {showResult && (
          <Animated.View entering={FadeInDown.duration(320).springify().damping(16)}>
            {/* Result panel — gradient + Finn avatar replaces the form-style
                red/green flat panel. Peach (not yellow/red) for wrong, soft
                mint for correct. Finn face is the emotional anchor. */}
            <LinearGradient
              colors={wasCorrect ? ['#dcfce7', '#bbf7d0'] : ['#fff7ed', '#fed7aa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.resultPanel, wasCorrect ? styles.resultCorrectBorder : styles.resultWrongBorder]}
            >
              <View style={styles.resultHeader}>
                {wasCorrect ? (
                  !reduceMotion ? (
                    <LottieView source={SPARKLES_LOTTIE} autoPlay loop style={styles.resultLottieIcon} />
                  ) : (
                    <ExpoImage source={FINN_HAPPY} style={styles.resultFinnIcon} contentFit="contain" accessible={false} />
                  )
                ) : (
                  <ExpoImage source={FINN_EMPATHIC} style={styles.resultFinnIcon} contentFit="contain" accessible={false} />
                )}
                <Text
                  style={[styles.resultHeaderText, { color: wasCorrect ? '#15803d' : '#9a3412' }]}
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
                // "Newspaper-clipping" framing: gold left border + 📰 icon —
                // reads as archived news, not as a textbook reference.
                <View style={styles.historyBox}>
                  <Text style={styles.historyLabel} allowFontScaling={false}>📰 דוגמה מהעבר</Text>
                  <Text style={styles.historyText} allowFontScaling={false}>
                    {item.historicalExample}
                  </Text>
                </View>
              ) : null}
              {wasCorrect && !reduceMotion && (
                // Tiny coin-fly flourish toward where the wealth header sits.
                // Hay-Day style "you earned something" peripheral juice.
                <View pointerEvents="none" style={styles.rewardCoinWrap}>
                  <LottieView source={COIN_LOTTIE} autoPlay loop={false} style={styles.rewardCoin} />
                </View>
              )}
            </LinearGradient>

            <Animated.View entering={FadeIn.delay(180).duration(220)}>
              <Pressable
                onPress={() => { tapHaptic(); onOpenChat(); }}
                style={styles.chatButton}
                accessibilityRole="button"
                accessibilityLabel="שאל את הקפטן שארק"
              >
                <ExpoImage source={FINN_TALKING} style={styles.chatFinnIcon} contentFit="contain" accessible={false} />
                <Text style={styles.chatButtonText} allowFontScaling={false}>
                  שאל את הקפטן שארק
                </Text>
                <MessageCircle size={14} color={STITCH.primary} strokeWidth={2.4} />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(360).duration(240)} style={continueStyle}>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  // Bouncy press snap (Hay Day soft).
                  continuePulse.value = withSequence(
                    withTiming(0.92, { duration: 80 }),
                    withSpring(1, { damping: 8, stiffness: 220 }),
                  );
                  onContinue();
                }}
                accessibilityRole="button"
                accessibilityLabel="המשך"
                style={styles.continueBtn}
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
    </LinearGradient>
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
    justifyContent: 'space-between',
    gap: 8,
  },
  // Small red "LIVE" pill so the page reads as actual news, not a quiz.
  newsStrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  newsStrapText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.6,
    writingDirection: 'rtl',
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
  // Hero composite (replaces flat placeholder). All children absolute-positioned
  // within so they layer over the gradient + Lottie.
  heroWrap: {
    width: '100%',
    height: SCREEN_H * 0.22,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroLottie: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  heroFinn: {
    position: 'absolute',
    bottom: 6,
    left: 8, // RTL: visual end is left; mascot peeks from end of hero
    width: 110,
    height: 110,
  },
  heroSourcePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  heroSourcePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
  },
  heroTicker: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(220,38,38,0.95)',
  },
  heroTickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  heroTickerText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
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
  // chipWrap holds the Animated.View wrapper that scales on press; the
  // Pressable + LinearGradient render inside.
  chipWrap: {
    width: (SCREEN_W - 20 * 2 - 10) / 2,
    borderRadius: 18,
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  chip: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: STITCH.primary,
  },
  chipGradient: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chipEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  chipText: {
    fontSize: 14,
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
    position: 'relative',
    overflow: 'hidden',
  },
  resultCorrectBorder: {
    borderColor: '#86efac',
  },
  resultWrongBorder: {
    borderColor: '#fdba74',
  },
  resultLottieIcon: {
    width: 28,
    height: 28,
  },
  resultFinnIcon: {
    width: 32,
    height: 32,
  },
  rewardCoinWrap: {
    position: 'absolute',
    top: 6,
    left: 6,
    pointerEvents: 'none',
  },
  rewardCoin: {
    width: 36,
    height: 36,
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
    backgroundColor: '#fefce8',
    borderLeftWidth: 4,
    borderLeftColor: '#facc15',
  },
  chatFinnIcon: {
    width: 24,
    height: 24,
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
