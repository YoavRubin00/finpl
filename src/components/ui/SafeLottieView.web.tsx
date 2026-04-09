/**
 * SafeLottieView — Web replacement for lottie-react-native
 *
 * Uses @lottiefiles/dotlottie-react directly (avoiding the circular
 * dependency that occurs when importing lottie-react-native through Metro).
 * Extracts width/height from the RN `style` prop and constrains the canvas.
 */
import React, { useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Image, type ViewStyle } from "react-native";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-web";

interface SafeLottieViewProps {
  style?: ViewStyle | ViewStyle[];
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  source?: unknown;
  [key: string]: unknown;
}

/** Replicates lottie-react-native's parsePossibleSources */
function resolveSource(source: unknown): { data?: string; src?: string } {
  if (!source) return {};
  if (typeof source === "string") return { src: source };
  if (typeof source === "number") {
    // require() asset — resolve via RN Image
    return { src: Image.resolveAssetSource(source).uri };
  }
  if (typeof source === "object") {
    const obj = source as Record<string, unknown>;
    if (obj.uri && typeof obj.uri === "string") {
      return { src: obj.uri };
    }
    // Raw JSON animation object
    return { data: JSON.stringify(source) };
  }
  return {};
}

const SafeLottieView = React.forwardRef<unknown, SafeLottieViewProps>(
  (props, ref) => {
    const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);

    const dotLottieRefCallback = useCallback((instance: DotLottie | null): void => {
      setDotLottie(instance);
    }, []);

    // Apply speed when instance is ready
    useEffect(() => {
      if (dotLottie && props.speed != null) {
        dotLottie.setSpeed(props.speed as number);
      }
    }, [dotLottie, props.speed]);

    // Expose LottieView-compatible ref methods
    useImperativeHandle(ref, () => ({
      play: (start?: number, end?: number) => {
        if (!dotLottie) return;
        if (start !== undefined && end !== undefined) {
          if (start === end) {
            dotLottie.setFrame(end);
            dotLottie.play();
          } else {
            dotLottie.setSegment(start, end);
          }
        } else if (start !== undefined) {
          dotLottie.setFrame(start);
          dotLottie.play();
        } else {
          dotLottie.play();
        }
      },
      pause: () => dotLottie?.pause(),
      reset: () => dotLottie?.setFrame(0),
      resume: () => dotLottie?.play(),
    }), [dotLottie]);

    const flatStyle: ViewStyle = Array.isArray(props.style)
      ? Object.assign({}, ...props.style)
      : (props.style as ViewStyle) ?? {};

    const w = flatStyle.width ?? 0;
    const h = flatStyle.height ?? 0;
    const widthPx = typeof w === "number" ? `${w}px` : String(w);
    const heightPx = typeof h === "number" ? `${h}px` : String(h);

    const { data, src } = resolveSource(props.source);

    return (
      <div
        style={{
          width: widthPx,
          height: heightPx,
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <DotLottieReact
          dotLottieRefCallback={dotLottieRefCallback}
          data={data}
          src={src}
          style={{
            width: widthPx,
            height: heightPx,
            overflow: "hidden",
            display: "block",
          }}
          autoplay={props.autoPlay as boolean | undefined}
          loop={props.loop as boolean | undefined}
          speed={props.speed as number | undefined}
        />
      </div>
    );
  }
);

SafeLottieView.displayName = "SafeLottieView";
export default SafeLottieView;
