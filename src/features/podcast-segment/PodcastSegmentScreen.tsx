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
import { Pause, Play, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
        onContinue={() => setPhase('summary')}
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
  /** User-initiated advance — fired by the top-right "דלג" pill OR the
   *  "המשך" CTA that appears in the finished state. Audio finishing does
   *  NOT auto-advance any more; we wait for the user so they have a clear
   *  control moment at the end. */
  onContinue: () => void;
}

// Trimmed proportions: Daisy frame went 78%→62% of screen width and the
// transcript card grew from 90→152px. Net effect: more transcript context
// visible (4 lines instead of 2-3), Daisy still hero but doesn't crowd the
// audio/text balance, and the bottom controls breathe.
const TRANSCRIPT_HEIGHT = 152;
const DAISY_W = Math.min(SW * 0.62, 260);
const DAISY_H = Math.round(DAISY_W * 1.3);

// Apple Podcasts–style speed cycle: tap to advance 1x → 1.2x → 1.5x → 1x.
// Single pill instead of three buttons keeps the chrome minimal on a 22s clip.
const SPEED_OPTIONS = [1, 1.2, 1.5] as const;

function PodcastListenStage({ podcast, onContinue }: ListenStageProps) {
  const insets = useSafeAreaInsets();
  const { phase, progress, rate, togglePlayPause, seekForward, replay, setRate } = usePodcastPlayer(
    podcast.audio.uri,
    () => {
      // Audio naturally finished — celebrate with haptic but DO NOT
      // auto-advance. The user taps "המשך" when ready.
      heavyHaptic();
    },
  );

  const cycleRate = () => {
    const i = SPEED_OPTIONS.indexOf(rate as (typeof SPEED_OPTIONS)[number]);
    const next = SPEED_OPTIONS[(i + 1) % SPEED_OPTIONS.length];
    tapHaptic();
    setRate(next);
  };

  useEffect(() => {
    if (phase === 'playing') mediumHaptic();
  }, [phase]);

  /* Ambient floating motion — strong, layered, ALWAYS running. The WebP
   *  itself only loops once on some devices (its metadata reports loopCount=1
   *  rather than 0), which used to leave Daisy frozen while bubbles continued
   *  smoothly — visually broken. This outer-frame animation keeps her *whole
   *  body* alive even if the underlying WebP stops cycling. We combine 3 axes:
   *    - vertical bob (translateY ±6px, 2.2s)
   *    - breathing scale (0.985 ↔ 1.02, 3.2s)
   *    - slow sway rotation (±1.2°, 4.4s)
   *  Each axis has its own period so the motion never repeats in lockstep —
   *  feels organic instead of mechanical. */
  const floatY = useSharedValue(0);
  const breathScale = useSharedValue(1);
  const swayRot = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.985, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    swayRot.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 4400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1.2, { duration: 4400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(floatY);
      cancelAnimation(breathScale);
      cancelAnimation(swayRot);
    };
  }, [floatY, breathScale, swayRot]);
  const daisyFloatingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: breathScale.value },
      { rotate: `${swayRot.value}deg` },
    ],
  }));

  /* Force-restart the talking WebP loop. Many WebP files declare loopCount=1
   *  (encoder default) and freeze on the last frame after one cycle. By
   *  bumping a counter into the ExpoImage `key` every 4.5s while audio is
   *  actively playing, we remount the image and replay the animation from
   *  frame 0. The 300ms expo-image transition crossfades the remount so it
   *  reads as a smooth loop, not a hard cut. The interval pauses when audio
   *  is paused/loading/finished so we don't burn renders. */
  const [loopTick, setLoopTick] = useState(0);
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setLoopTick((t) => t + 1), 4500);
    return () => clearInterval(id);
  }, [phase]);

  /* Speaking halo — pulse rate matches a natural speech cadence (~480ms per
   * beat) instead of the previous 1800ms studio-pulse. The animation is
   * GATED strictly by the audio phase: when expo-audio reports playing=false
   * (paused/loading/finished) we cancel the shared values so the halo
   * freezes in lockstep with the sound. Two waves offset by 240ms create the
   * stacked ripple effect without the robotic feel of a fixed period.
   */
  const wave0 = useSharedValue(0);
  const wave1 = useSharedValue(0);
  useEffect(() => {
    if (phase === 'playing') {
      const startWave = (sv: typeof wave0, initialDelay: number) => {
        sv.value = 0;
        sv.value = withSequence(
          withTiming(0, { duration: initialDelay }),
          withRepeat(
            withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) }),
            -1,
            false,
          ),
        );
      };
      startWave(wave0, 0);
      startWave(wave1, 240);
    } else {
      cancelAnimation(wave0);
      cancelAnimation(wave1);
      wave0.value = 0;
      wave1.value = 0;
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

  /** Auto-scroll so the currently-spoken word sits in the UPPER third of the
   *  visible window. Previously the linear `progress * (total - viewport)`
   *  mapping put the current word near the BOTTOM of the view by the end of
   *  the podcast — words being spoken were off-screen below. By targeting
   *  the upper third we always show 2-3 lines of upcoming context. */
  useEffect(() => {
    const total = contentHeightRef.current;
    if (total <= TRANSCRIPT_HEIGHT) return;
    const currentWordY = total * progress;
    const desiredOffsetInView = TRANSCRIPT_HEIGHT * 0.3;
    const ideal = currentWordY - desiredOffsetInView;
    const maxScroll = total - TRANSCRIPT_HEIGHT;
    const targetY = Math.max(0, Math.min(maxScroll, ideal));
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

      {/* Top-right "דלג" pill — always available so the user can skip to the
          questions without waiting for the 22-second podcast. Positioned
          clear of the parent lesson progress bar via insets.top + clearance. */}
      <Animated.View
        entering={FadeInDown.duration(360).delay(80)}
        style={[styles.skipPill, { top: insets.top + 56 }]}
      >
        <Pressable
          onPress={() => { tapHaptic(); onContinue(); }}
          accessibilityRole="button"
          accessibilityLabel="דלג לשאלות"
          style={({ pressed }) => [
            styles.skipPillInner,
            pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
          ]}
          hitSlop={8}
        >
          <SkipForward color="#0369a1" size={14} strokeWidth={2.8} />
          <Text style={styles.skipPillText}>דלג</Text>
        </Pressable>
      </Animated.View>


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
        <Animated.View style={[styles.daisyFrame, daisyFloatingStyle]}>
          <ExpoImage
            key={`daisy-${isPlaying ? `talk-${loopTick}` : isFinished ? 'happy' : 'mic'}`}
            source={daisySource}
            style={styles.daisyImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
            autoplay
          />
        </Animated.View>
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
          {/* Plain transcript — the previous per-word highlight depended on
              uniform speech rate (words.length × progress), but Hebrew has
              very uneven word lengths so the "current" word visually drifted
              from what Daisy was actually saying. Auto-scroll still tracks
              audio progress, so the user moves through the text smoothly. */}
          <Text style={[styles.transcriptText, RTL]}>
            {podcast.transcript}
          </Text>
        </ScrollView>
      </Animated.View>

      {/* Bottom controls — phase-dependent.
          During play/pause/loading: Apple-Podcasts-style transport (-5 · ▷ · +5).
          When finished: Continue + Back (Replay) pair, matching the
          flashcard module navigation in LessonFlowScreen. */}
      {isFinished ? (
        <Animated.View
          entering={FadeInUp.duration(320).springify()}
          style={styles.finishedRow}
        >
          <Pressable
            onPress={() => { tapHaptic(); replay(); }}
            accessibilityRole="button"
            accessibilityLabel="נגן שוב"
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
          >
            <ChevronRight color="#0369a1" size={26} strokeWidth={2.8} />
          </Pressable>
          <Pressable
            onPress={() => { tapHaptic(); successHaptic(); onContinue(); }}
            accessibilityRole="button"
            accessibilityLabel="המשך"
            style={({ pressed }) => [
              styles.finishedCTA,
              pressed && { opacity: 0.92, transform: [{ translateY: 2 }] },
            ]}
          >
            <Text style={styles.finishedCTAText}>המשך</Text>
            <ChevronLeft color="#ffffff" size={22} strokeWidth={2.8} />
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(360).delay(120)} style={styles.buttonsRow}>
          {/* Spotify Podcasts transport layout (RTL-flipped):
              [skip-back] [play/pause hero] [skip-forward] | [speed pill]
              In Spotify the speed control sits at the FAR end of the row,
              opposite the symmetric skip pair. Here the leading edge in RTL is
              the right, so the speed pill anchors the LEFT edge — visually
              "outside" the symmetric transport triad. */}
          <Pressable
            onPress={() => { tapHaptic(); seekForward(-5); }}
            accessibilityRole="button"
            accessibilityLabel="חזרה 5 שניות אחורה"
            style={({ pressed }) => [
              styles.btnRound,
              pressed && { opacity: 0.85, transform: [{ translateY: 2 }] },
            ]}
          >
            <Text style={styles.btnRoundText}>5-</Text>
          </Pressable>

          <Pressable
            onPress={() => { tapHaptic(); togglePlayPause(); }}
            disabled={phase === 'loading'}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'השהה' : 'המשך'}
            style={({ pressed }) => [
              styles.btnRoundHero,
              pressed && { opacity: 0.92, transform: [{ scale: 0.96 }] },
              phase === 'loading' && { opacity: 0.5 },
            ]}
          >
            {isPlaying ? (
              <Pause color="#ffffff" size={32} fill="#ffffff" />
            ) : (
              <Play color="#ffffff" size={32} fill="#ffffff" />
            )}
          </Pressable>

          <Pressable
            onPress={() => { tapHaptic(); seekForward(5); }}
            accessibilityRole="button"
            accessibilityLabel="קפיצה 5 שניות קדימה"
            style={({ pressed }) => [
              styles.btnRound,
              pressed && { opacity: 0.85, transform: [{ translateY: 2 }] },
            ]}
          >
            <Text style={styles.btnRoundText}>5+</Text>
          </Pressable>

          {/* Speed control — pinned to the leading edge in RTL (left). Cycles
              1x → 1.2x → 1.5x. >1x states tint solid cyan so the active speed
              is visible from across the screen. */}
          <Pressable
            onPress={cycleRate}
            accessibilityRole="button"
            accessibilityLabel={`מהירות נגינה ${rate}x. הקש להחלפה`}
            style={({ pressed }) => [
              styles.speedPillInner,
              rate > 1 && styles.speedPillInnerActive,
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
            hitSlop={8}
          >
            <Text style={[styles.speedPillText, rate > 1 && styles.speedPillTextActive]}>
              {rate}x
            </Text>
          </Pressable>
        </Animated.View>
      )}

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
  durationMs: 8000 + ((i * 311) % 4000), // 8..12 sec (slower, more graceful)
  delayMs: (i * 850) % 5000,             // 0..5s stagger
  wobbleAmp: 4 + ((i * 17) % 6),         // 4..10px horizontal wobble
  // Independent wobble period (1.5..2.3s) — decoupled from rise duration so
  // every bubble shimmies at a real-time cadence rather than a fraction of its
  // own journey. Faster bubbles don't wobble faster; the motion feels like
  // buoyancy in water, not a synced loop.
  wobblePeriodMs: 1500 + ((i * 137) % 800),
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
  wobbleAmp: number;
  wobblePeriodMs: number;
}

function AmbientBubble({ cfg, screenH }: { cfg: BubbleConfig; screenH: number }) {
  // `t` drives the vertical rise (0 → 1 once per loop, with delayMs head start).
  // `wobblePhase` drives horizontal sway in absolute real time (1500-2300ms
  // per cycle), independent of rise speed. This is the key fix: previously the
  // wobble was Math.sin(t * π * 3), so a slow bubble shimmied slowly and a fast
  // bubble shimmied quickly — both looking robotic. Now every bubble shimmies
  // at its own natural buoyancy-cadence regardless of rise speed.
  const t = useSharedValue(0);
  const wobblePhase = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(0, { duration: cfg.delayMs }),
        // Linear easing — bubbles in water rise at terminal velocity (drag
        // balances buoyancy almost immediately). Easing.out(Easing.quad) was
        // actually backwards: it made bubbles SLOW down near the top, which
        // is the opposite of real fluid dynamics. Linear feels like physics.
        withTiming(1, { duration: cfg.durationMs, easing: Easing.linear }),
      ),
      -1,
      false,
    );
    wobblePhase.value = withRepeat(
      withTiming(2 * Math.PI, {
        duration: cfg.wobblePeriodMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(t);
      cancelAnimation(wobblePhase);
    };
  }, [cfg.delayMs, cfg.durationMs, cfg.wobblePeriodMs, t, wobblePhase]);

  const style = useAnimatedStyle(() => {
    // Horizontal wobble — real-time sine wave, NOT tied to rise progress.
    const wobble = Math.sin(wobblePhase.value) * cfg.wobbleAmp;
    // Distance covers the entire screen height + a buffer so the bubble
    // disappears completely before t=1 → t=0 snaps it back to start.
    const rise = -t.value * (screenH + cfg.size * 4);
    // Opacity envelope: fade in over first 6%, plateau, fade out over the
    // last 10%. Softer ramp-in (was 12%) so bubbles pop into view faster,
    // later fade-out (was 82%) so they don't disappear mid-screen.
    let opacity = 0;
    if (t.value < 0.06) opacity = (t.value / 0.06) * 0.55;
    else if (t.value > 0.90) opacity = ((1 - t.value) / 0.10) * 0.55;
    else opacity = 0.55;
    // Subtle "birth" scale — bubble starts at 0.92, grows to 1.0 over the
    // first 8% of the rise. Mimics surface-tension expansion at release.
    const birthScale = t.value < 0.08
      ? 0.92 + (t.value / 0.08) * 0.08
      : 1;
    return {
      opacity,
      transform: [
        { translateX: wobble },
        { translateY: rise },
        { scale: birthScale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        bubbleStyles.bubble,
        {
          left: `${cfg.leftPct}%`,
          width: cfg.size,
          height: cfg.size,
          bottom: -cfg.size * 3, // fully off-screen at the start
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

  // Transport row — all 3 buttons share the same blue 3D CTA pattern used
  // throughout the app (PodcastIntroCard.startBtn, couple-dilemma.cta,
  // flashcard nav). Circle shape, hero slightly bigger.
  buttonsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  // Hero play/pause: 80x80 blue 3D circle, matches app primary CTA color
  // language but in circular form. White icon inside.
  btnRoundHero: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 6,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  // Side controls: 56x56 blue 3D circles, same color palette as the hero
  // and the rest of the app's CTAs — smaller lip, smaller shadow.
  btnRound: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnRoundText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Top-right "דלג" skip pill — always available during listen so the user
  // can jump to the questions without waiting for the 22s audio.
  skipPill: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
  },
  skipPillInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(14,165,233,0.45)',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#0369a1',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  skipPillText: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '900',
  },

  // Spotify-style speed pill — lives INSIDE the buttonsRow at the leading
  // (left, in RTL) edge, opposite the symmetric -5/play/+5 triad. White pill
  // with cyan border by default; flips to solid cyan when >1x so the
  // accelerated state is obvious without forcing the user to read text.
  speedPillInner: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(14,165,233,0.45)',
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: '#0369a1',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  speedPillInnerActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0284c7',
  },
  speedPillText: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '900',
  },
  speedPillTextActive: {
    color: '#ffffff',
  },

  // Finished-state row: Continue (primary blue) + Back (Replay) — mirrors
  // the flashcard navigation pattern from LessonFlowScreen so the user
  // experiences the same controls everywhere in the module.
  finishedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,165,233,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.45)',
  },
  finishedCTA: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 5,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  finishedCTAText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
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
