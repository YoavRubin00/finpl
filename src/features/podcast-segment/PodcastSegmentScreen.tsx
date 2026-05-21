import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
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
import { Pause, Play, RotateCcw } from 'lucide-react-native';
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

// Trimmed proportions: Daisy frame went 78%→62% of screen width and the
// transcript card grew from 90→124px. Net effect: more transcript context
// visible (3 lines instead of 2), Daisy still hero but doesn't crowd the
// audio/text balance, and the bottom controls breathe.
const TRANSCRIPT_HEIGHT = 124;
const DAISY_W = Math.min(SW * 0.62, 260);
const DAISY_H = Math.round(DAISY_W * 1.3);

function PodcastListenStage({ podcast, onFinished }: ListenStageProps) {
  const { phase, progress, togglePlayPause, replay } = usePodcastPlayer(
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
  const contentHeightRef = useRef<number>(0);

  /** Auto-scroll proportionally to audio progress. We avoid relying on per-word
   *  onLayout (Android doesn't fire onLayout for nested Text children), which
   *  previously left the highlighted word stuck off-screen. */
  useEffect(() => {
    const total = contentHeightRef.current;
    if (total <= TRANSCRIPT_HEIGHT) return;
    const targetY = Math.max(0, (total - TRANSCRIPT_HEIGHT) * progress);
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, [progress]);

  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';
  const isFinished = phase === 'finished';

  // Daisy source: talking WebP ONLY while audio is actually playing. During
  // loading she holds the static mic pose so her mouth doesn't move before
  // she has anything to say (user was seeing the talking animation start
  // before the audio did, breaking sync).
  const daisySource = isPlaying
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

      {/* Ambient bubbles — always animating, independent of audio state.
          Keeps the screen alive even when Daisy pauses talking. */}
      <AmbientBubbles />

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
          onContentSizeChange={(_w, h) => { contentHeightRef.current = h; }}
          scrollEnabled={false}
        >
          <Text style={[styles.transcriptText, RTL]}>
            {words.map((w, i) => (
              <Text
                key={i}
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

      {/* 2 buttons: replay (secondary) + play/pause (primary).
          Dropped the "+5s seek" — for a 22-second podcast the skip
          felt gimmicky and added a third control that visually crowded
          the play/pause hero button. */}
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
      </Animated.View>

      {isPaused ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.pausedBadge}>
          <Text style={styles.pausedBadgeText}>מושהה</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─────────────────────── Ambient bubbles overlay ───────────────────────

// Trimmed from 9 → 5: studio mood preserved, visual noise reduced so the
// eye lands on Daisy + transcript faster.
const BUBBLE_COUNT = 5;
const BUBBLE_CONFIGS = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
  // Pseudo-random but stable across renders
  leftPct: ((i * 173) % 92) + 4,        // 4..96
  size: 6 + ((i * 7) % 5) * 3,          // 6..18
  durationMs: 6500 + ((i * 311) % 4000), // 6.5..10.5 sec
  delayMs: (i * 850) % 5000,             // 0..5s stagger
}));

function AmbientBubbles() {
  const { height: SH } = Dimensions.get('window');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BUBBLE_CONFIGS.map((cfg, idx) => (
        <AmbientBubble key={idx} cfg={cfg} screenH={SH} />
      ))}
    </View>
  );
}

interface BubbleConfig {
  leftPct: number;
  size: number;
  durationMs: number;
  delayMs: number;
}

function AmbientBubble({ cfg, screenH }: { cfg: BubbleConfig; screenH: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    // Always loops, independent of audio state. -1 = infinite, no reverse.
    t.value = withRepeat(
      withSequence(
        withTiming(0, { duration: cfg.delayMs }),
        withTiming(1, { duration: cfg.durationMs, easing: Easing.linear }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [cfg.delayMs, cfg.durationMs, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * screenH * 1.1 }],
    opacity: 0.45 * (1 - Math.abs(0.5 - t.value) * 2 * 0.4), // fade in/out at edges
  }));

  return (
    <Animated.View
      style={[
        bubbleStyles.bubble,
        {
          left: `${cfg.leftPct}%`,
          width: cfg.size,
          height: cfg.size,
          bottom: -cfg.size,
        },
        style,
      ]}
    />
  );
}

const bubbleStyles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderRadius: 999,
  },
});

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
