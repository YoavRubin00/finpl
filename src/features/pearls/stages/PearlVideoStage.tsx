import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { LifestyleVideoSpec } from '../../inter-module-break/lifestyleVideoConfig';
import { FINN_DANCING } from '../../retention-loops/finnMascotConfig';
import { tapHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';

interface PearlVideoStageProps {
  isActive: boolean;
  video: LifestyleVideoSpec;
  onContinue: () => void;
}

/**
 * Video stage inside a Pearl — plays a Captain Shark lifestyle clip and
 * surfaces a "Continue" button once the clip finishes (or any time, via
 * tap-to-skip in the corner). Mirrors the FeedVideoItem playback config so
 * buffering behaves the same as in the main feed.
 */
export function PearlVideoStage({ isActive, video, onContinue }: PearlVideoStageProps): React.ReactElement {
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  // True while expo-video is fetching the first playable frames. We surface a
  // spinner overlay during that window — without it, slow networks land the
  // user on a flat black `videoFrame` for 1-2s (TestFlight bug 2026-06-01).
  // Flipped off either when the player goes 'readyToPlay'/'playing' or as a
  // 6s safety fallback so we never trap a user behind a dead spinner.
  const [isBuffering, setIsBuffering] = useState(true);
  const { playSound } = useSoundEffect();

  const player = useVideoPlayer(video.videoUri, (p) => {
    p.loop = false;
    p.muted = false;
    // 15s of forward buffer (was 5s) so a 30–60s lifestyle clip rarely
    // rebuffers mid-playback. `waitsToMinimizeStalling: false` + a low
    // `minBufferForPlayback` keep first-frame latency tight — combined
    // with the sheet-open warmup in PearlSheet, the OS cache typically
    // already holds the first chunks by the time the player asks for them.
    p.bufferOptions = {
      preferredForwardBufferDuration: 15,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
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
  // statusChange also reflects the 'loading' state, which we mirror back
  // into the buffering overlay so a mid-clip rebuffer re-shows the spinner.
  useEffect(() => {
    const sub = player.addListener('statusChange', (e) => {
      if (e.status === 'idle' && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
      }
      if (e.status === 'loading') {
        setIsBuffering(true);
      }
      if (e.status === 'error') {
        // Drop the spinner on error — the user can hit "דלג" to advance.
        setIsBuffering(false);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Flip the buffering overlay OFF as soon as the player reports playback
  // has actually started. `playingChange` fires with isPlaying=true once the
  // first frame is ready, which is the right signal — the 'idle'/'loading'
  // statuses don't cleanly indicate "ready to play" on their own.
  useEffect(() => {
    const sub = player.addListener('playingChange', (e) => {
      if (e.isPlaying) {
        setIsBuffering(false);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Safety fallback — if neither event ever fires (network dead, codec
  // mismatch on the CDN side, etc.), drop the spinner after 6s so the user
  // is never trapped behind a permanent overlay. They can still hit "דלג"
  // via the skip pill.
  useEffect(() => {
    const t = setTimeout(() => setIsBuffering(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Web-only: expo-video's web shim doesn't reliably translate
  // `nativeControls={false}` into the HTML5 <video> `controls={false}`
  // attribute on iOS Safari — Safari then renders its own overlay (play /
  // skip-10 / mute / timeline) that breaks out of the rounded frame.
  // Force-strip controls + harden playsinline so the clip stays in-frame.
  // On native (iOS/Android) this useEffect is a no-op.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Access `document` via globalThis to bypass the tsconfig (no DOM lib for
    // native). Cast keeps the call site tight and avoids per-line ts-expect-error.
    type WebVideoEl = {
      controls: boolean;
      removeAttribute: (name: string) => void;
      setAttribute: (name: string, value: string) => void;
    };
    type WebDoc = { querySelectorAll: (selector: string) => ArrayLike<WebVideoEl> };
    const doc = (globalThis as { document?: WebDoc }).document;
    if (!doc) return;
    const apply = () => {
      const videos = Array.from(doc.querySelectorAll('video'));
      videos.forEach((v) => {
        v.controls = false;
        v.removeAttribute('controls');
        v.setAttribute('playsinline', 'true');
        v.setAttribute('webkit-playsinline', 'true');
        v.setAttribute('disablepictureinpicture', 'true');
        v.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');
      });
    };
    apply();
    // expo-video mounts the <video> async on web; retry once after a tick
    // so we catch the element if it's not in the DOM on first pass.
    const t = setTimeout(apply, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.outer}>
      <View style={styles.videoFrame}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Buffering overlay — shows on top of the black videoFrame until
            expo-video reports the player is ready / playing. Auto-dismisses
            via the 6s safety timeout above so a dead network can't trap
            users behind a permanent spinner. */}
        {isBuffering && !finished ? (
          <View style={styles.bufferOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={styles.bufferText} allowFontScaling={false}>
              טוען סרטון…
            </Text>
          </View>
        ) : null}

        {/* Skip pill — top-right corner, floats above the video so it's
            always reachable while the clip plays. Mid-flow only; once the
            clip finishes the bottom scrim takes over with the "המשך" CTA. */}
        {!finished ? (
          <Pressable
            onPress={() => { tapHaptic(); playSound('btn_click_soft_1'); onContinue(); }}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="דלג על הקליפ"
            hitSlop={10}
          >
            <Text style={styles.skipText} allowFontScaling={false}>דלג ›</Text>
          </Pressable>
        ) : null}

        {/* Translucent bar at bottom so the caption + CTA stay legible
            over bright video frames. */}
        <View style={styles.bottomScrim} pointerEvents="box-none">
          <Text style={styles.caption} allowFontScaling={false}>
            {video.caption}
          </Text>

          {finished ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.finishRow}>
              <ExpoImage source={FINN_DANCING} style={styles.finn} contentFit="contain" accessible={false} />
              <Pressable
                onPress={() => { tapHaptic(); playSound('btn_click_soft_2'); onContinue(); }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  videoFrame: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: 9 / 16,
    maxHeight: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
    position: 'relative',
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
    // Bottom-left floating pill (Netflix Skip Intro pattern). Sits above
    // the video at the bottom edge, giving the content the first 5 seconds
    // of attention before offering an exit.
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    zIndex: 10,
  },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '800', writingDirection: 'rtl' as const },
  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 12,
  },
  bufferText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl' as const,
  },
});
