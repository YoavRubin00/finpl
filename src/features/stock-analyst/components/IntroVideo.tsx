import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SkipForward } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';

/**
 * Full-screen intro video that plays once when the user opens the Stock
 * Analyst tool. Compressed to ~340KB / 540p / H.264 with `faststart` so
 * the first frame paints in well under a second on a decent connection.
 *
 * Provides a "Skip" button that fires `onDone` immediately, and the same
 * `onDone` runs automatically when playback finishes naturally.
 */

// Served from Vercel Blob on every platform. `assets/videos/` is intentionally
// excluded from the native bundle (.easignore + .gitattributes export-ignore) —
// the app-wide convention is "heavy media streams from the CDN". expo-video
// plays the ~340KB clip directly; the first frame paints fast and the 8s
// safety-net below covers any network hiccup.
const VIDEO_SOURCE = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/videos/captain-shark-intro.mp4';

interface Props {
  onDone: () => void;
}

export function IntroVideo({ onDone }: Props): React.ReactElement {
  const [fadeOut, setFadeOut] = useState(false);
  const doneFiredRef = useRef(false);

  const fireDone = () => {
    if (doneFiredRef.current) return;
    doneFiredRef.current = true;
    setFadeOut(true);
    // Brief fade-out grace so the transition isn't a hard cut.
    setTimeout(() => onDone(), 220);
  };

  const player = useVideoPlayer(
    VIDEO_SOURCE,
    (p) => {
      p.loop = false;
      p.muted = false;
      p.play();
    },
  );

  // Fire `onDone` when the video reaches the end.
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => fireDone());
    return () => {
      try { sub.remove(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net — if the video never fires (e.g. silent failure on web),
  // auto-advance after 8 seconds. The clip itself is only ~5 seconds.
  useEffect(() => {
    const t = setTimeout(() => fireDone(), 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#020617',
        opacity: fadeOut ? 0 : 1,
        zIndex: 10,
      }}
    >
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Skip button — top-right corner */}
      <Pressable
        onPress={() => { tapHaptic(); fireDone(); }}
        accessibilityRole="button"
        accessibilityLabel="דלג על הסרטון"
        style={{
          position: 'absolute',
          top: 50,
          right: 16,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(15,23,42,0.7)',
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <SkipForward size={14} color="#f1f5f9" />
        <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '800' }}>דלג</Text>
      </Pressable>
    </View>
  );
}
