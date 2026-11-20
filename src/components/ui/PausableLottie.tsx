import React, { useEffect, useRef } from 'react';
import LottieView, { type LottieViewProps } from 'lottie-react-native';

type PausableLottieProps = Omit<LottieViewProps, 'autoPlay'> & {
  /** Play only while true; pausing keeps the current frame on screen. */
  playing: boolean;
};

/**
 * A plain LottieView (same render mode as before, unlike LottieIcon which forces
 * SOFTWARE) that plays only while `playing`. For looping decorations on
 * always-mounted screens (the learn map) so they stop when the screen is not
 * focused or the app is in the background.
 */
export function PausableLottie({ playing, ...props }: PausableLottieProps): React.ReactElement {
  const ref = useRef<LottieView>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    // The first state is handled by `autoPlay` when the view mounts.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    try {
      if (playing) ref.current?.play();
      else ref.current?.pause();
    } catch { /* view gone: nothing to pause */ }
  }, [playing]);
  return <LottieView ref={ref} {...props} autoPlay={playing} />;
}
