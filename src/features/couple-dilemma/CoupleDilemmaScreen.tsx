import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCoupleNarration } from './useCoupleNarration';
import { CoupleDilemmaSwipeCard } from './CoupleDilemmaSwipeCard';
import { CoupleDilemmaFeedback } from './CoupleDilemmaFeedback';
import { resolveCoupleDilemmaAssetUri } from './couple-dilemma-prefetch';
import type {
  CoupleDilemmaOption,
  CoupleDilemmaSegment,
} from '../chapter-1-content/types';

interface Props {
  dilemma: CoupleDilemmaSegment;
  onComplete: (result: { chosenId: 'a' | 'b'; isWise: boolean }) => void;
}

type Phase = 'intro-video' | 'swipe-choice' | 'feedback';

/**
 * Couple-dilemma micro-experience: 5s Captain Shark + Daisy video + Daisy
 * narration → swipe choice → short feedback → continue.
 *
 * Mirrors the VideoSharkDilemmaCard / LessonFlowScreen patterns:
 *   - VideoView is mounted full-screen; the same player instance is used in
 *     all three phases so the frozen frame stays visible behind the swipe card.
 *   - Audio narration plays in parallel with the (muted) video.
 *   - A wall-clock fallback (4.8s) flips to the swipe stage even if the video
 *     gets stuck on its poster frame.
 */
export function CoupleDilemmaScreen({ dilemma, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('intro-video');
  const [chosen, setChosen] = useState<CoupleDilemmaOption | null>(null);
  // `videoStarted` flips true once the player advances past frame 0 — used to
  // gate audio narration so Daisy never starts talking before her video is
  // visible. (Was a noticeable issue on slow connections where audio loaded
  // first while the mp4 was still buffering.)
  const [videoStarted, setVideoStarted] = useState(false);
  const transitionedRef = useRef(false);

  // Prefer the pre-downloaded local file (warmed by LessonFlowScreen) and fall
  // back to streaming the remote URI if the prefetch didn't finish in time.
  const resolvedVideoUri = resolveCoupleDilemmaAssetUri(dilemma.videoUri);
  const resolvedAudioUri = resolveCoupleDilemmaAssetUri(dilemma.narrationAudioUri);

  const player = useVideoPlayer(resolvedVideoUri, (p) => {
    p.loop = false;
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 8,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
    };
    p.play();
  });

  // Audio narration is gated until the video has shown at least one frame.
  useCoupleNarration(resolvedAudioUri, undefined, { enabled: videoStarted });

  // Move to swipe stage at ~4.5s into the video, with a wall-clock fallback at
  // 4.8s so the screen always advances even if expo-video's currentTime is flaky.
  useEffect(() => {
    if (phase !== 'intro-video') return;
    const toSwipe = () => {
      if (transitionedRef.current) return;
      transitionedRef.current = true;
      try { player.pause(); } catch { /* ignore */ }
      setPhase('swipe-choice');
    };
    const id = setInterval(() => {
      try {
        const t = player.currentTime;
        if (t > 0.1) setVideoStarted(true);
        if (t >= 4.5) toSwipe();
      } catch {
        /* ignore — player may not be ready */
      }
    }, 100);
    const fallback = setTimeout(toSwipe, 4800);
    return () => {
      clearInterval(id);
      clearTimeout(fallback);
    };
  }, [phase, player]);

  const handleChoose = useCallback((option: CoupleDilemmaOption) => {
    setChosen(option);
    setPhase('feedback');
  }, []);

  const handleContinue = useCallback(() => {
    if (!chosen) return;
    onComplete({ chosenId: chosen.id, isWise: chosen.isWise });
  }, [chosen, onComplete]);

  return (
    <View style={styles.root}>
      {/* Video — always mounted, full screen, behind every other layer */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Caption overlay during the intro video only */}
      {phase === 'intro-video' && (
        <Animated.View
          entering={FadeInDown.duration(360).delay(700)}
          exiting={FadeOut.duration(180)}
          style={[styles.captionWrap, { marginTop: insets.top + 18 }]}
          pointerEvents="none"
        >
          <View style={styles.captionPill}>
            <Text style={styles.captionText}>{dilemma.caption}</Text>
          </View>
        </Animated.View>
      )}

      {/* Decorative top fade so the caption reads well over bright frames */}
      {phase === 'intro-video' && (
        <Animated.View
          entering={FadeIn.duration(380)}
          style={styles.topFade}
          pointerEvents="none"
        />
      )}

      {phase === 'swipe-choice' && (
        <CoupleDilemmaSwipeCard dilemma={dilemma} onChoose={handleChoose} />
      )}

      {phase === 'feedback' && chosen && (
        <CoupleDilemmaFeedback chosen={chosen} onContinue={handleContinue} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  captionWrap: {
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  captionPill: {
    backgroundColor: 'rgba(7,14,24,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  captionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(7,14,24,0.0)',
  },
});
