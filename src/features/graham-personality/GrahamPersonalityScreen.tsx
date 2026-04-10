/**
 * Graham Investor Personality Test — standalone screen.
 * 8-question wizard → investor profile result card.
 * Uses chapter-4 design system (SIM4/TYPE4/sim4Styles).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, ScrollView, Dimensions, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideInLeft,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { X, ArrowRight } from 'lucide-react-native';

import { LottieIcon } from '../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GlowCard } from '../../components/ui/GlowCard';
import { SimLottieBackground } from '../../components/ui/SimLottieBackground';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { SIM_LOTTIE } from '../shared-sim/simLottieMap';
import {
  FINN_STANDARD,
  FINN_HAPPY,
} from '../retention-loops/finnMascotConfig';
import { SIM4, TYPE4, sim4Styles, RTL, SHADOW_STRONG, SHADOW_LIGHT } from '../chapter-4-content/simulations/simTheme';
import { tapHaptic, successHaptic } from '../../utils/haptics';

import { useGrahamPersonality } from './useGrahamPersonality';
import { PERSONALITY_QUESTIONS, TOTAL_QUESTIONS } from './personalityData';
import type { InvestorProfileId } from './personalityTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ── Props ── */

interface GrahamPersonalityScreenProps {
  onComplete?: (profileId: InvestorProfileId) => void;
}

/* ── Progress Bar ── */

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(((current + 1) / total) * 100, 100);
  return (
    <View style={{ transform: [{ scaleX: -1 }] }}>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={['#0891b2', '#06b6d4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${pct}%` }]}
        >
          <View style={styles.progressShine} />
        </LinearGradient>
      </View>
    </View>
  );
}

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

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={styles.backBtn}>
      <LottieIcon source={SIM_LOTTIE.arrowRight} size={24} />
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

  useEffect(() => {
    successHaptic();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.resultContainer}
      showsVerticalScrollIndicator={false}
    >
      {showConfetti.current && (
        <ConfettiExplosion onComplete={() => { showConfetti.current = false; }} />
      )}

      {/* Finn excited */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.finnContainer}>
        <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 85, height: 85 }} contentFit="contain" />
      </Animated.View>

      {/* Profile Card */}
      <Animated.View entering={FadeInUp.delay(200).duration(500).springify()}>
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

      {/* Continue Button */}
      <Animated.View entering={FadeInUp.delay(400).duration(400).springify()} style={styles.ctaRow}>
        <AnimatedPressable
          onPress={onContinue}
          style={[styles.continueBtn, { backgroundColor: '#0891b2' }]}
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

  const handleSelect = useCallback(
    (optIdx: number) => {
      if (selectedOpt !== null) return;
      tapHaptic();
      setSelectedOpt(optIdx);

      setTimeout(() => {
        selectAnswer(optIdx);
        setSelectedOpt(null);
      }, 300);
    },
    [selectAnswer, selectedOpt],
  );

  const handleBack = useCallback(() => {
    tapHaptic();
    goBack();
    setSelectedOpt(null);
  }, [goBack]);

  const router = useRouter(); // <-- need router for default navigation
  
  const handleContinue = useCallback(() => {
    tapHaptic();
    const result = getResult();
    if (onComplete) {
      onComplete(result.id);
    } else {
      router.back();
    }
  }, [getResult, onComplete, router]);

  // Show result after all answers
  if (isComplete && answers.length >= TOTAL_QUESTIONS) {
    const profile = getResult();
    return (
      <SimLottieBackground
        lottieSources={[SIM_LOTTIE.brain, SIM_LOTTIE.chart]}
        chapterColors={['#f0f9ff', '#e0f2fe'] as const}
      >
        <SafeAreaView style={styles.safe}>
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
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: Top Nav + Progress */}
          <View style={styles.header}>
            <View style={styles.topNav}>
               <AnimatedPressable onPress={() => { tapHaptic(); router.back(); }} style={styles.closeBtn}>
                 <X size={24} color={SIM4.textSecondary} />
               </AnimatedPressable>
            </View>
            <ProgressBar current={currentQuestion} total={TOTAL_QUESTIONS} />
          </View>

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

          {/* Back Button */}
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
    paddingTop: 10,
    paddingBottom: 20,
    gap: 12,
  },
  header: {
    gap: 8,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  progressTrack: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
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
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#7dd3fc',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    marginTop: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284c7',
  },
  resultContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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
    padding: 12,
    marginTop: 2,
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
    paddingHorizontal: 20,
  },
  continueBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#bae6fd',
  },
  continueText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
});
