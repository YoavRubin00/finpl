/**
 * Graham Investor Personality Test, standalone screen.
 * 8-question wizard → investor profile result card.
 * Uses chapter-4 design system (SIM4/TYPE4/sim4Styles).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInLeft,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { LottieIcon } from '../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GlowCard } from '../../components/ui/GlowCard';
import { SimLottieBackground } from '../../components/ui/SimLottieBackground';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { SheetCloseButton } from '../../components/ui/SheetCloseButton';
import { SIM_LOTTIE } from '../shared-sim/simLottieMap';
import {
  FINN_STANDARD,
  FINN_HAPPY,
} from '../retention-loops/finnMascotConfig';
import { SIM4, RTL } from '../chapter-4-content/simulations/simTheme';
import { STITCH } from '../../constants/theme';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';

import { useGrahamPersonality } from './useGrahamPersonality';
import { PERSONALITY_QUESTIONS, TOTAL_QUESTIONS } from './personalityData';
import type { InvestorProfileId } from './personalityTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ── Props ── */

interface GrahamPersonalityScreenProps {
  onComplete?: (profileId: InvestorProfileId) => void;
}

/* ── Top Header Bar ── */
// Unified header: title + SheetCloseButton + progress bar below.
// Mirrors DailyNewsChallengeSheet topBar pattern (titleRow + progressRow).

interface TopHeaderProps {
  current: number;
  total: number;
  onClose: () => void;
}

function TopHeader({ current, total, onClose }: TopHeaderProps) {
  const insets = useSafeAreaInsets();
  const pct = Math.min(((current + 1) / total) * 100, 100);
  return (
    <View style={[headerStyles.topBar, { paddingTop: insets.top + 4 }]}>
      <View style={headerStyles.titleRow}>
        <SheetCloseButton onPress={onClose} accessibilityLabel="סגור שאלון" />
        <Text style={headerStyles.title} allowFontScaling={false} numberOfLines={1}>
          איזה משקיע אתה?
        </Text>
        <Text style={headerStyles.counter} allowFontScaling={false}>
          {current + 1}/{total}
        </Text>
      </View>
      <View style={headerStyles.progressRow}>
        {/* scaleX -1 so fill grows RTL (right→left) */}
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#2563eb', '#0ea5e9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            >
              <View style={styles.progressShine} />
            </LinearGradient>
          </View>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  topBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
    paddingBottom: 8,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.2,
  },
  counter: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    textAlign: 'left',
  },
  progressRow: {
    paddingHorizontal: 16,
  },
});

/* ── Option Button ── */

interface OptionButtonProps {
  text: string;
  index: number;
  selected: boolean;
  onPress: () => void;
}

function OptionButton({ text, index, selected, onPress }: OptionButtonProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(350).springify()}>
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.optionBtn,
          selected && { borderColor: '#0284c7', backgroundColor: '#0284c7' },
        ]}
      >
        <Text
          style={[
            styles.optionText,
            RTL,
            selected && { color: '#ffffff', fontWeight: '800' },
          ]}
        >
          {text}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ── Back Button ── */
// Secondary style: light blue ghost pill, matches LessonFlowScreen's
// secondary/back affordance (bg #e0f2fe, border #7dd3fc, text #0284c7).

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.backBtn}
      accessibilityRole="button"
      accessibilityLabel="חזרה לשאלה הקודמת"
    >
      <LottieIcon source={SIM_LOTTIE.arrowRight} size={22} />
      <Text style={[styles.backText, RTL]}>חזרה</Text>
    </AnimatedPressable>
  );
}

/* ── Result Screen ── */

interface ResultScreenProps {
  onContinue: () => void;
  profileId: InvestorProfileId;
  title: string;
  subtitle: string;
  description: string;
  advice: string;
  emoji: string;
  color: string;
}

function ResultScreen({
  onContinue,
  profileId,
  title,
  subtitle,
  description,
  advice,
  emoji,
  color,
}: ResultScreenProps) {
  const showConfetti = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    successHaptic();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.resultContainer,
        // Safe-area bottom so content + CTA never hide behind home-indicator / nav-bar
        { paddingBottom: Math.max(insets.bottom + 16, 32) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {showConfetti.current && (
        <ConfettiExplosion onComplete={() => { showConfetti.current = false; }} />
      )}

      {/* Finn excited */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.finnContainer}>
        <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 85, height: 85 }} contentFit="contain" />
      </Animated.View>

      {/* Profile Card — no maxHeight; ScrollView handles overflow */}
      <Animated.View entering={FadeInUp.delay(200).duration(500).springify()} style={{ width: '100%' }}>
        <GlowCard chapterGlow={color} style={styles.resultCard}>
          <View style={styles.resultCardInner}>
            <Text style={styles.resultEmoji}>{emoji}</Text>
            <Text style={[styles.resultTitle, RTL, { color }]}>{title}</Text>
            <Text style={[styles.resultSubtitle, RTL]}>{subtitle}</Text>
            <View style={[styles.divider, { backgroundColor: color + '33' }]} />
            <Text style={[styles.resultDescription, RTL]}>{description}</Text>
            <View style={[styles.adviceBox, { borderColor: color + '44', backgroundColor: color + '11' }]}>
              <Text style={[styles.adviceText, RTL]}>{advice}</Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Continue Button — matches LessonFlowScreen primary CTA:
          #2563eb fill, borderBottomWidth 3, #1d4ed8 bottom border, radius 16 */}
      <Animated.View entering={FadeInUp.delay(400).duration(400).springify()} style={styles.ctaRow}>
        <AnimatedPressable
          onPress={onContinue}
          style={styles.continueBtn}
          accessibilityRole="button"
          accessibilityLabel="המשך"
        >
          <Text style={styles.continueText}>המשך</Text>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ── Main Screen ── */

export function GrahamPersonalityScreen({ onComplete }: GrahamPersonalityScreenProps) {
  const {
    currentQuestion,
    answers,
    isComplete,
    selectAnswer,
    goBack,
    getResult,
    reset,
  } = useGrahamPersonality();

  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const { playSound } = useSoundEffect();
  const insets = useSafeAreaInsets();

  const router = useRouter();

  const handleClose = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_1');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/learn');
    }
  }, [router, playSound]);

  const handleSelect = useCallback(
    (optIdx: number) => {
      if (selectedOpt !== null) return;
      tapHaptic();
      playSound('btn_click_soft_2');
      setSelectedOpt(optIdx);

      setTimeout(() => {
        selectAnswer(optIdx);
        setSelectedOpt(null);
      }, 300);
    },
    [selectAnswer, selectedOpt, playSound],
  );

  const handleBack = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_1');
    goBack();
    setSelectedOpt(null);
  }, [goBack, playSound]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    playSound('btn_click_heavy');
    const result = getResult();
    if (onComplete) {
      onComplete(result.id);
    } else {
      router.back();
    }
  }, [getResult, onComplete, router, playSound]);

  // Show result after all answers
  if (isComplete && answers.length >= TOTAL_QUESTIONS) {
    const profile = getResult();
    return (
      <SimLottieBackground
        lottieSources={[SIM_LOTTIE.brain, SIM_LOTTIE.chart]}
        chapterColors={['#f0f9ff', '#e0f2fe'] as const}
      >
        {/* Result: no SafeAreaView edges top/bottom — TopHeader handles top
            inset explicitly; ResultScreen ScrollView handles bottom via insets */}
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          {/* Unified header for result screen too (close + title) */}
          <TopHeader
            current={TOTAL_QUESTIONS - 1}
            total={TOTAL_QUESTIONS}
            onClose={handleContinue}
          />
          <ResultScreen
            onContinue={handleContinue}
            profileId={profile.id}
            title={profile.title}
            subtitle={profile.subtitle}
            description={profile.description}
            advice={profile.advice}
            emoji={profile.emoji}
            color={profile.color}
          />
        </SafeAreaView>
      </SimLottieBackground>
    );
  }

  const question = PERSONALITY_QUESTIONS[currentQuestion];

  return (
    <SimLottieBackground
      lottieSources={[SIM_LOTTIE.brain, SIM_LOTTIE.chart]}
      chapterColors={['#f0f9ff', '#e0f2fe'] as const}
    >
      {/* edges left/right only — TopHeader handles top inset explicitly,
          ScrollView handles bottom via paddingBottom with insets */}
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        {/* Unified header bar — title + X close + progress */}
        <TopHeader
          current={currentQuestion}
          total={TOTAL_QUESTIONS}
          onClose={handleClose}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 16, 32) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Card */}
          <Animated.View
            key={question.id}
            entering={SlideInLeft.duration(300).springify()}
          >
            <GlowCard chapterGlow={'#06b6d4'} pressable={false} style={styles.questionCard}>
              <View style={styles.questionInner}>
                <Text style={[styles.questionText, RTL]} numberOfLines={2} adjustsFontSizeToFit>{question.question}</Text>
                <View style={styles.finnSmall}>
                  <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 100, height: 100 }} contentFit="contain" />
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((opt, idx) => (
              <OptionButton
                key={`${question.id}-${idx}`}
                text={opt.text}
                index={idx}
                selected={selectedOpt !== null ? selectedOpt === idx : answers[currentQuestion] === idx}
                onPress={() => handleSelect(idx)}
              />
            ))}
          </View>

          {/* Back Button — secondary style, matches LessonFlowScreen ghost pill */}
          {currentQuestion > 0 && (
            <Animated.View entering={FadeInUp.duration(250)}>
              <BackButton onPress={handleBack} />
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SimLottieBackground>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    // paddingBottom is set inline (insets.bottom + 16) so safe-area is respected
    gap: 12,
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressShine: {
    position: 'absolute',
    top: 2,
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
  },
  questionCard: {
    borderRadius: 20,
  },
  questionInner: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM4.textPrimary,
    lineHeight: 26,
    textAlign: 'center',
  },
  finnSmall: {
    alignItems: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM4.textPrimary,
    lineHeight: 22,
  },
  // Back button — secondary ghost pill, mirrors LessonFlowScreen secondary CTA
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#7dd3fc',
    marginTop: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284c7',
  },
  // Result screen
  resultContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    // paddingBottom is set inline per ResultScreen (insets.bottom + 16)
    gap: 12,
    alignItems: 'center',
  },
  finnContainer: {
    alignItems: 'center',
  },
  resultCard: {
    borderRadius: 24,
    width: SCREEN_WIDTH - 40,
  },
  resultCardInner: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  resultEmoji: {
    fontSize: 40,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM4.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1.5,
    width: '80%',
    borderRadius: 1,
    marginVertical: 4,
  },
  resultDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM4.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  adviceBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 2,
    width: '100%',
  },
  adviceText: {
    fontSize: 13,
    fontWeight: '600',
    color: SIM4.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ctaRow: {
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 4,
  },
  // Continue button — matches LessonFlowScreen primary CTA:
  // bg #2563eb, borderRadius 16, paddingVertical 14, borderBottomWidth 3, #1d4ed8 bottom
  continueBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#1d4ed8',
  },
  continueText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
});
