import { ComponentProps } from "react";
import LottieView from "lottie-react-native";
import { useReducedMotion } from "react-native-reanimated";

type LottieProps = ComponentProps<typeof LottieView>;

/**
 * Wraps LottieView, freezes looping animations when the user
 * prefers reduced motion (iOS/Android accessibility setting).
 *
 * Drop-in replacement: `<SafeLottie ...same props as LottieView />`
 */
export function SafeLottie(props: LottieProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion && props.loop) {
    return (
      <LottieView
        {...props}
        autoPlay={false}
        loop={false}
        progress={0}
      />
    );
  }

  return <LottieView {...props} />;
}
