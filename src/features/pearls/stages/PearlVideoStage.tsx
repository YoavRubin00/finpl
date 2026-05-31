import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { LifestyleVideoSpec } from '../../inter-module-break/lifestyleVideoConfig';
import { FINN_DANCING } from '../../retention-loops/finnMascotConfig';
import { tapHaptic } from '../../../utils/haptics';

interface PearlVideoStageProps {
  isActive: boolean;
  video: LifestyleVideoSpec;
  onContinue: () => void;
}

const SCREEN_H = Dimensions.get('window').height;

/**
 * Video stage inside a Pearl — plays a Captain Shark lifestyle clip and
 * surfaces a "Continue" button once the clip finishes (or any time, via
 * tap-to-skip in the corner). Mirrors the FeedVideoItem playback config so
 * buffering behaves the same as in the main feed.
 */
export function PearlVideoStage({ isActive, video, onContinue }: PearlVideoStageProps): React.ReactElement {
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  const player = useVideoPlayer(video.videoUri, (p) => {
    p.loop = false;
    p.muted = false;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 1,
    };
  });

  // Play / pause tied to active flag (FlatList pager visibility). Avoids
  // background audio when the user swipes to the next stage.
  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  // Detect end-of-clip — expo-video fires statusChange to 'idle' when a
  // non-looping clip reaches its tail. We also expose a manual "Continue"
  // so a user who doesn't want to wait can skip ahead any time.
  useEffect(() => {
    const sub = player.addListener('statusChange', (e) => {
      if (e.status === 'idle' && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
      }
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Skip pill — top-right corner, floats above the video so it's always
          reachable while the clip plays. Mid-flow only; once the clip
          finishes the bottom scrim takes over with the "המשך" CTA. */}
      {!finished ? (
        <Pressable
          onPress={() => { tapHaptic(); onContinue(); }}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="דלג על הקליפ"
          hitSlop={10}
        >
          <Text style={styles.skipText} allowFontScaling={false}>דלג ›</Text>
        </Pressable>
      ) : null}

      {/* Gradient/scrim at bottom so the caption + CTA stay legible over
          bright video frames. Using a solid translucent bar keeps it
          dependency-free (no LinearGradient gymnastics needed here). */}
      <View style={styles.bottomScrim} pointerEvents="box-none">
        <Text style={styles.caption} allowFontScaling={false}>
          {video.caption}
        </Text>

        {finished ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.finishRow}>
            <ExpoImage source={FINN_DANCING} style={styles.finn} contentFit="contain" accessible={false} />
            <Pressable
              onPress={() => { tapHaptic(); onContinue(); }}
              style={styles.continueBtn}
              accessibilityRole="button"
              accessibilityLabel="המשך לשלב הבא"
            >
              <Text style={styles.continueText} allowFontScaling={false}>המשך ←</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    minHeight: SCREEN_H * 0.6,
    overflow: 'hidden',
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 16,
  },
  caption: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  finishRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  finn: { width: 56, height: 56 },
  continueBtn: {
    flex: 1,
    backgroundColor: '#0891b2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderBottomWidth: 3,
    borderBottomColor: '#0e7490',
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  skipBtn: {
    // Top-right floating pill, sits above the video. Right-edge placement
    // matches the PearlSheet close-X above it — same touch zone, immediate
    // to find for RTL Hebrew users.
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    zIndex: 10,
  },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '800', writingDirection: 'rtl' as const },
});
