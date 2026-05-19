import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Pause, Play, RotateCcw, FastForward } from 'lucide-react-native';
import {
  tapHaptic,
  heavyHaptic,
  successHaptic,
  mediumHaptic,
} from '../../utils/haptics';
import { DAISY_ASSETS, DAISY_TALKING_WEBP } from './daisy-assets';
import { usePodcastPlayer } from './usePodcastPlayer';
import { PodcastQuestionCard } from './PodcastQuestionCard';
import { PodcastIntroCard } from './PodcastIntroCard';
import { PodcastSummaryCard } from './PodcastSummaryCard';
import { PODCAST_DRAFTS } from './podcast-scripts';
import type { PodcastSegment } from '../chapter-1-content/types';

const { width: SW } = Dimensions.get('window');
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

type Phase = 'intro' | 'listening' | 'summary' | 'question-1' | 'question-2';

interface Props {
  podcast: PodcastSegment;
  onComplete: (result: { correctCount: number }) => void;
}

export const PodcastSegmentScreen = React.memo(function PodcastSegmentScreen({
  podcast,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const correctCountRef = useRef(0);

  if (phase === 'intro') {
    const idx = PODCAST_DRAFTS.findIndex((p) => p.id === podcast.id);
    return (
      <PodcastIntroCard
        podcast={podcast}
        episodeNumber={idx >= 0 ? idx + 1 : 1}
        totalEpisodes={PODCAST_DRAFTS.length}
        onStart={() => setPhase('listening')}
      />
    );
  }
  if (phase === 'listening') {
    return (
      <PodcastListenStage
        podcast={podcast}
        onFinished={() => setTimeout(() => setPhase('summary'), 600)}
      />
    );
  }
  if (phase === 'summary') {
    return (
      <PodcastSummaryCard
        podcast={podcast}
        onContinue={() => setPhase('question-1')}
      />
    );
  }
  if (phase === 'question-1') {
    return (
      <PodcastQuestionCard
        key={podcast.comprehensionQuiz.id}
        question={podcast.comprehensionQuiz}
        questionNumber={1}
        onAnswered={(correct) => { if (correct) correctCountRef.current += 1; }}
        onContinue={() => setPhase('question-2')}
      />
    );
  }
  return (
    <PodcastQuestionCard
      key={podcast.dilemmaQuiz.id}
      question={podcast.dilemmaQuiz}
      questionNumber={2}
      onAnswered={(correct) => { if (correct) correctCountRef.current += 1; }}
      onContinue={() => {
        successHaptic();
        onComplete({ correctCount: correctCountRef.current });
      }}
    />
  );
});

// ────────────────────────── Listen stage ──────────────────────────

interface ListenStageProps {
  podcast: PodcastSegment;
  onFinished: () => void;
}

const TRANSCRIPT_HEIGHT = 90;
const DAISY_W = Math.min(SW * 0.78, 320);
const DAISY_H = Math.round(DAISY_W * 1.4);

function PodcastListenStage({ podcast, onFinished }: ListenStageProps) {
  const { phase, progress, togglePlayPause, replay, seekForward } = usePodcastPlayer(
    podcast.audio.uri,
    () => {
      heavyHaptic();
      onFinished();
    },
  );

  useEffect(() => {
    if (phase === 'playing') mediumHaptic();
  }, [phase]);

  /* sound waves halo */
  const wave0 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  useEffect(() => {
    if (phase === 'playing') {
      const start = (sv: typeof wave0, delay: number) => {
        sv.value = 0;
        sv.value = withRepeat(
          withSequence(
            withTiming(0, { duration: delay }),
            withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
          ),
          -1,
          false,
        );
      };
      start(wave0, 0);
      start(wave1, 900);
    } else {
      cancelAnimation(wave0);
      cancelAnimation(wave1);
    }
    return () => {
      cancelAnimation(wave0);
      cancelAnimation(wave1);
    };
  }, [phase, wave0, wave1]);
  const wave0Style = useAnimatedStyle(() => ({
    opacity: (1 - wave0.value) * 0.55,
    transform: [{ scale: 0.9 + wave0.value * 0.7 }],
  }));
  const wave1Style = useAnimatedStyle(() => ({
    opacity: (1 - wave1.value) * 0.4,
    transform: [{ scale: 0.9 + wave1.value * 0.9 }],
  }));

  /* progress bar */
  const progressAnim = useSharedValue(0);
  useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 220 });
  }, [progress, progressAnim]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%` as `${number}%`,
  }));

  /* word-by-word transcript — derived from actual audio progress (not a fixed interval)
     so the highlighted word stays in sync with what Daisy is currently saying. */
  const words = useMemo(() => podcast.transcript.split(/\s+/), [podcast.transcript]);
  const revealedWords = useMemo(
    () => Math.min(words.length, Math.floor(progress * words.length)),
    [progress, words.length],
  );
  const scrollRef = useRef<ScrollView>(null);
  const wordPositionsRef = useRef<number[]>([]);

  /** Auto-scroll: keep the most recently revealed word centered in the visible window. */
  useEffect(() => {
    if (revealedWords < 4) return; // small text — no scrolling needed yet
    const y = wordPositionsRef.current[revealedWords - 1] ?? 0;
    const targetY = Math.max(0, y - TRANSCRIPT_HEIGHT * 0.45);
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, [revealedWords]);

  const captureWordY = (i: number) => (e: NativeSyntheticEvent<{ layout: { y: number } }>) => {
    wordPositionsRef.current[i] = e.nativeEvent.layout.y;
  };

  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';
  const isFinished = phase === 'finished';

  // Daisy source: WebP during playing/loading, happy on finished, mic at paused
  const daisySource =
    isPlaying || phase === 'loading'
      ? DAISY_TALKING_WEBP
      : isFinished
        ? DAISY_ASSETS.happy
        : DAISY_ASSETS.mic;

  return (
    <View style={styles.stage}>
      {/* Studio-room ambient gradient: cyan top, soft coral middle, warmer pink bottom
          — echoes the WebP's interior so the user feels INSIDE the room */}
      <LinearGradient
        colors={['#bae6fd', '#fce7e7', '#fbcfe8']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Podcast progress — sits at top, right below module's general progress bar */}
      <Animated.View
        entering={FadeInDown.duration(280).springify()}
        style={styles.progressTrack}
      >
        <Animated.View style={[styles.progressFill, progressStyle]}>
          <LinearGradient
            colors={['#0891b2', '#0ea5e9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      {/* Daisy stage — rounded "window" into the podcast studio so we feel inside it */}
      <View style={styles.daisyStage}>
        <Animated.View style={[styles.wave, wave0Style]} />
        <Animated.View style={[styles.wave, wave1Style]} />
        <View style={styles.daisyFrame}>
          <ExpoImage
            source={daisySource}
            style={styles.daisyImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            autoplay
          />
        </View>
      </View>

      {/* Transcript (auto-scrolling) */}
      <Animated.View
        entering={FadeInUp.duration(380).delay(80)}
        style={styles.transcriptCard}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.transcriptContent}
          scrollEnabled={false}
        >
          <Text style={[styles.transcriptText, RTL]}>
            {words.map((w, i) => (
              <Text
                key={i}
                onLayout={captureWordY(i)}
                style={
                  i < revealedWords - 1
                    ? styles.transcriptWordPast
                    : i === revealedWords - 1
                      ? styles.transcriptWordCurrent
                      : styles.transcriptWordFuture
                }
              >
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Text>
        </ScrollView>
      </Animated.View>

      {/* 3 buttons: restart · play/pause · seek -5s */}
      <Animated.View entering={FadeIn.duration(360).delay(120)} style={styles.buttonsRow}>
        <Pressable
          onPress={() => { tapHaptic(); replay(); }}
          accessibilityRole="button"
          accessibilityLabel="התחל מחדש"
          style={({ pressed }) => [
            styles.btnGhost,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <RotateCcw color="#0369a1" size={18} strokeWidth={2.6} />
          <Text style={styles.btnGhostText}>מחדש</Text>
        </Pressable>

        <Pressable
          onPress={() => { tapHaptic(); togglePlayPause(); }}
          disabled={phase === 'loading'}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'השהה' : isFinished ? 'נגן שוב' : 'המשך'}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            phase === 'loading' && { opacity: 0.5 },
          ]}
        >
          {isPlaying ? (
            <Pause color="#ffffff" size={22} fill="#ffffff" />
          ) : (
            <Play color="#ffffff" size={22} fill="#ffffff" />
          )}
          <Text style={styles.btnPrimaryText}>
            {isPlaying ? 'השהה' : isFinished ? 'נגן שוב' : 'המשך'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => { tapHaptic(); seekForward(5); }}
          accessibilityRole="button"
          accessibilityLabel="קפיצה 5 שניות קדימה"
          style={({ pressed }) => [
            styles.btnGhost,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <FastForward color="#0369a1" size={18} strokeWidth={2.6} />
          <Text style={styles.btnGhostText}>5 שניות</Text>
        </Pressable>
      </Animated.View>

      {isPaused ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.pausedBadge}>
          <Text style={styles.pausedBadgeText}>מושהה</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: '#fce7e7',
  },

  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
    flexDirection: 'row-reverse', // RTL: fill grows from right edge
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  daisyStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  daisyFrame: {
    width: DAISY_W,
    height: DAISY_H,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#0891b2',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  daisyImage: {
    width: '100%',
    height: '100%',
  },
  wave: {
    position: 'absolute',
    width: DAISY_W * 1.08,
    height: DAISY_W * 1.08,
    borderRadius: DAISY_W,
    borderColor: '#fbb6c5',
    borderWidth: 1.2,
    opacity: 0.45,
  },

  transcriptCard: {
    height: TRANSCRIPT_HEIGHT,
    backgroundColor: '#ffffff',
    borderColor: 'rgba(14,165,233,0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  transcriptContent: { paddingVertical: 2 },
  transcriptText: {
    fontSize: 15,
    lineHeight: 24,
  },
  transcriptWordPast: { color: '#94a3b8', fontWeight: '500' },
  transcriptWordCurrent: { color: '#0369a1', fontWeight: '800' },
  transcriptWordFuture: { color: '#e2e8f0', fontWeight: '500' },

  buttonsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    flex: 1.6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  btnGhost: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderColor: 'rgba(14,165,233,0.35)',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
  },
  btnGhostText: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '800',
  },

  pausedBadge: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pausedBadgeText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});
