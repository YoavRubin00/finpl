import React, { useEffect, useRef } from 'react';
import { Image as ExpoImage, type ImageProps } from 'expo-image';

type PausableImageProps = Omit<ImageProps, 'autoplay'> & {
  /** Play the animated image (animated WebP / GIF) only while true. */
  playing: boolean;
};

/**
 * expo-image for an ANIMATED source whose playback follows `playing`.
 *
 * 40 of the 45 WebP mascots are animated (up to 177 frames) and expo-image
 * plays them forever by default, including on a blurred tab, under a pushed
 * screen and with the app in the background (heat audit 13.11).
 *
 * The `autoplay` prop alone does not pause an image that is already playing:
 * Android reads it only when the image finishes loading, and iOS only on its
 * next prop update. So on every change we also call stop/startAnimating.
 * A paused image keeps showing its current frame; a static source is unaffected.
 */
export function PausableImage({ playing, ...props }: PausableImageProps): React.ReactElement {
  const ref = useRef<ExpoImage>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    // The first state is handled by `autoplay` when the image loads.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const image = ref.current;
    if (!image) return;
    const call = playing ? image.startAnimating() : image.stopAnimating();
    Promise.resolve(call).catch(() => { /* view gone or not loaded yet: nothing to pause */ });
  }, [playing]);
  return <ExpoImage ref={ref} {...props} autoplay={playing} />;
}
