import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { DRAW_SPRING, LL_COLORS } from "../tokens";
import { VisualFrame } from "./VisualFrame";

type GrowLineData = Extract<FlashcardVisual, { kind: "grow-line" }>;

interface Props {
  visual: GrowLineData;
  animate: boolean;
  startDelayMs: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VIEW_W = 300;
const VIEW_H = 116;
const PAD_X = 14;
const PAD_Y = 14;

interface Pt { x: number; y: number }

/** Catmull-Rom → cubic-bezier, so the growth curve reads as a curve, not a jagged polyline. */
function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Polyline-distance estimate, padded so the dash array never falls short of the real curve. */
function estimateLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len * 1.15 + 1;
}

/**
 * A line that draws itself — growth curves, exponential take-off. Chart
 * convention (not app chrome) so it stays LTR like every finance chart
 * (TASE/Google-Finance included) even inside an RTL screen: time reads
 * left→right, same as digits do inside Hebrew paragraphs.
 */
export function GrowLineVisual({ visual, animate, startDelayMs }: Props) {
  const { points, highlightLastPoint, caption } = visual;

  const { pathD, length, lastPoint } = useMemo(() => {
    if (points.length === 0) {
      return { pathD: "", length: 1, lastPoint: { x: 0, y: 0 } };
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const usableW = VIEW_W - PAD_X * 2;
    const usableH = VIEW_H - PAD_Y * 2;
    const pts: Pt[] = points.map((v, i) => ({
      x: PAD_X + (points.length === 1 ? usableW / 2 : (i / (points.length - 1)) * usableW),
      y: PAD_Y + (1 - (v - min) / range) * usableH,
    }));
    return { pathD: smoothPath(pts), length: estimateLength(pts), lastPoint: pts[pts.length - 1] };
  }, [points]);

  const progress = useSharedValue(animate ? 0 : 1);
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(startDelayMs, withSpring(1, DRAW_SPRING));
    if (highlightLastPoint) {
      pulse.value = withDelay(
        startDelayMs + 500,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathD]);

  const drawProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  const haloProps = useAnimatedProps(() => ({
    r: 5 + pulse.value * 4,
    opacity: 0.9 - pulse.value * 0.75,
  }));

  const dotOpacityProps = useAnimatedProps(() => ({
    opacity: progress.value,
  }));

  return (
    <VisualFrame caption={caption} minHeight={VIEW_H + 4}>
      <View style={styles.svgWrap}>
        <Svg width="100%" height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
          <AnimatedPath
            d={pathD}
            stroke={LL_COLORS.brandCyanBright}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${length} ${length}`}
            animatedProps={drawProps}
          />
          {highlightLastPoint ? (
            <>
              <AnimatedCircle cx={lastPoint.x} cy={lastPoint.y} fill={LL_COLORS.emphasis} animatedProps={haloProps} />
              <AnimatedCircle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={LL_COLORS.emphasis} animatedProps={dotOpacityProps} />
            </>
          ) : null}
        </Svg>
      </View>
    </VisualFrame>
  );
}

const styles = StyleSheet.create({
  svgWrap: {
    width: "100%",
  },
});
