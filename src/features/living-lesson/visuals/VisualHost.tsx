import React, { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { VISUAL_DELAY_MS, VISUAL_SPRING } from "../tokens";
import { CounterVisual } from "./CounterVisual";
import { CompareBarsVisual } from "./CompareBarsVisual";
import { GrowLineVisual } from "./GrowLineVisual";
import { CoinStackVisual } from "./CoinStackVisual";
import { SplitFlowVisual } from "./SplitFlowVisual";
import { TimelineVisual } from "./TimelineVisual";
import { LottieVisual } from "./LottieVisual";
import { ImageVisual } from "./ImageVisual";

interface VisualHostProps {
  visual: FlashcardVisual;
  /** false under reduced-motion — everything renders settled, no entrance or internal animation. */
  animate?: boolean;
  /** ms after mount before this visual's own entrance starts (lets the segment's text land first). */
  delayMs?: number;
}

/** Maps a FlashcardVisual's `kind` to its rendering primitive, and wraps it in one shared entrance beat. */
export function VisualHost({ visual, animate = true, delayMs = VISUAL_DELAY_MS }: VisualHostProps) {
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    progress.value = animate ? withDelay(delayMs, withSpring(1, VISUAL_SPRING)) : 1;
    // Entrance runs once per mount — this visual pops in exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 18 },
      { scale: 0.92 + 0.08 * progress.value },
    ],
  }));

  // Internal chart animations (bars racing, lines drawing, numbers counting)
  // wait until the visual card has basically landed before they start.
  const innerStartDelay = animate ? delayMs + 220 : 0;

  return (
    <Animated.View style={[{ width: "100%" }, entranceStyle]}>
      {renderPrimitive(visual, animate, innerStartDelay)}
    </Animated.View>
  );
}

function renderPrimitive(visual: FlashcardVisual, animate: boolean, startDelayMs: number): React.ReactElement {
  switch (visual.kind) {
    case "lottie":
      return <LottieVisual visual={visual} animate={animate} />;
    case "counter":
      return <CounterVisual visual={visual} animate={animate} startDelayMs={startDelayMs} />;
    case "compare-bars":
      return <CompareBarsVisual visual={visual} animate={animate} startDelayMs={startDelayMs} />;
    case "grow-line":
      return <GrowLineVisual visual={visual} animate={animate} startDelayMs={startDelayMs} />;
    case "coin-stack":
      return <CoinStackVisual visual={visual} animate={animate} startDelayMs={startDelayMs} />;
    case "split-flow":
      return <SplitFlowVisual visual={visual} animate={animate} startDelayMs={startDelayMs} />;
    case "timeline":
      return <TimelineVisual visual={visual} animate={animate} startDelayMs={startDelayMs} />;
    case "image":
      return <ImageVisual visual={visual} animate={animate} />;
    default: {
      const exhaustiveCheck: never = visual;
      return exhaustiveCheck;
    }
  }
}
