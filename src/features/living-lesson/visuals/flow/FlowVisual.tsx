import React, { useCallback, useId, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import Animated, { runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { Check, TriangleAlert } from "lucide-react-native";
import { LL_COLORS } from "../../tokens";
import { FLOW_ICONS, FLOW_TONES } from "./flowIcons";
import type { ToneColors } from "./flowIcons";
import {
  BADGE_MS,
  COUNT_MS,
  LEAD_MS,
  PULSE_MS,
  backOut,
  clamp01,
  easeInOut,
  easeOut,
  fadeAt,
  legCurve,
  planFlow,
} from "./flowTimeline";
import type { Curve, PlannedLeg, PlannedNode } from "./flowTimeline";
import type { FlowNodeSpec, FlowVisualSpec } from "./flowTypes";
import { FLOW_MAX_NODES } from "./flowTypes";
import { StageFrame } from "./StageFrame";
import { useRoundClock } from "./useRoundClock";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Captain Shark, the in-app transparent loops (assets/webp). He only shows when a diagram asks for him.
const SHARK = {
  happy: require("../../../../../assets/webp/fin-happy.webp") as number,
  empathic: require("../../../../../assets/webp/fin-empathic.webp") as number,
};

/** Ring radius, and the box a node's ring lives in. */
const RING_R = 26;
const RING_BOX = 60;
const RING_STROKE = 4;
const RING_LEN = 2 * Math.PI * RING_R;
const CHIP = 42;
const NODE_W = 96;
const LABEL_H = 16;
const AMOUNT_H = 17;
const TEXT_GAP = 2;
const ROW_GAP = RING_BOX + TEXT_GAP + LABEL_H + AMOUNT_H + 6;
const PAD_X = NODE_W / 2;
const PAD_Y = 10;
const COIN = 18;
/** Above this many paths the soft glow under each one is dropped (low-end Android). */
const GLOW_MAX_LEGS = 5;

interface Props {
  visual: FlowVisualSpec;
  animate: boolean;
  startDelayMs: number;
}

interface Placed {
  spec: FlowNodeSpec;
  plan: PlannedNode;
  x: number;
  y: number;
  tone: ToneColors;
}

/**
 * The living diagram. One shared clock (ms) runs on the UI thread; every
 * path, coin, ring and badge reads it in a worklet, so a running diagram
 * never re-renders React (numbers step at most 14 times per landing).
 * Plays a round, holds, fades, plays once more and settles on the finished
 * frame. Reduced motion: the finished frame, nothing moves.
 */
export function FlowVisual({ visual, animate, startDelayMs }: Props) {
  const { nodes, stages, caption, a11y, example, shark, direction } = visual;
  const rtl = direction !== "ltr";
  const patternId = `ll-dots-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const plan = useMemo(() => planFlow(nodes, stages), [nodes, stages]);
  const shown = useMemo(() => nodes.slice(0, FLOW_MAX_NODES), [nodes]);

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  const maxCol = Math.max(0, ...shown.map((n) => n.col));
  const maxRow = Math.max(0, ...shown.map((n) => n.row));
  const hasAbove = shown.some((n) => n.labelAbove);
  // The upper leg of a loop bows above its nodes: give it room.
  const hasArc = plan.legs.some((leg) => leg.arced);
  const topPad = PAD_Y + (hasAbove ? LABEL_H + AMOUNT_H + TEXT_GAP : 0) + (hasArc ? 18 : 0);
  const height = topPad + maxRow * ROW_GAP + RING_BOX + TEXT_GAP + LABEL_H + AMOUNT_H + PAD_Y;

  const placed = useMemo<Placed[]>(() => {
    if (width <= 0) return [];
    const step = maxCol > 0 ? (width - PAD_X * 2) / maxCol : 0;
    return shown.map((spec) => {
      const logical = maxCol > 0 ? PAD_X + spec.col * step : width / 2;
      return {
        spec,
        plan: plan.nodes[spec.id],
        x: rtl ? width - logical : logical,
        y: topPad + RING_BOX / 2 + spec.row * ROW_GAP,
        tone: FLOW_TONES[spec.tone ?? "cyan"],
      };
    });
  }, [width, shown, plan, maxCol, rtl, topPad]);

  const curves = useMemo(() => {
    const at: Record<string, Placed> = {};
    for (const p of placed) at[p.spec.id] = p;
    const out: Array<{ leg: PlannedLeg; curve: Curve }> = [];
    for (const leg of plan.legs) {
      const from = at[leg.from];
      const to = at[leg.to];
      if (!from || !to) continue;
      out.push({ leg, curve: legCurve(from, to, RING_BOX / 2, leg.route, leg.arced) });
    }
    return out;
  }, [placed, plan]);

  const endMs = plan.endMs;
  const payoff = shown.find((n) => n.id === plan.payoffId);
  const payoffIsGood = payoff?.badge !== "alert";
  const { clock, replay } = useRoundClock({ animate, endMs, startDelayMs, payoffAt: plan.payoffAt, payoffIsGood });

  const payoffPlaced = placed.find((p) => p.spec.id === plan.payoffId);
  const glow = curves.length <= GLOW_MAX_LEGS;

  return (
    <StageFrame
      height={height}
      a11y={a11y}
      caption={caption}
      example={example}
      onStageLayout={onLayout}
      onReplay={animate ? replay : undefined}
      aside={shark ? <SharkReaction mood={shark} at={plan.payoffAt} clock={clock} endMs={endMs} /> : null}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} patternUnits="userSpaceOnUse" width={18} height={18}>
                <Circle cx={3} cy={3} r={1.1} fill="rgba(2,132,199,0.16)" />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${patternId})`} />
            {curves.map(({ leg, curve }) => (
              <Edge key={leg.key} leg={leg} curve={curve} clock={clock} endMs={endMs} glow={glow} />
            ))}
          </Svg>

          {curves.map(({ leg, curve }) => (
            <Token key={leg.key} leg={leg} curve={curve} clock={clock} endMs={endMs} />
          ))}

          {placed.map((p) => (
            <Node key={p.spec.id} placed={p} clock={clock} endMs={endMs} />
          ))}

          {payoffPlaced && payoffIsGood ? (
            <Sparkle x={payoffPlaced.x} y={payoffPlaced.y} at={plan.payoffAt} clock={clock} endMs={endMs} color={payoffPlaced.tone.main} />
          ) : null}
        </>
      ) : null}
    </StageFrame>
  );
}

// ---------------------------------------------------------------------------
// A path: a faint dotted track, then the neon line that draws itself over it.
// ---------------------------------------------------------------------------

function Edge({
  leg,
  curve,
  clock,
  endMs,
  glow,
}: {
  leg: PlannedLeg;
  curve: Curve;
  clock: SharedValue<number>;
  endMs: number;
  glow: boolean;
}) {
  const tone = FLOW_TONES[leg.tone];
  const { startMs, hopMs } = leg;
  const length = curve.length;

  const liveProps = useAnimatedProps(() => {
    const c = clock.value;
    const draw = easeInOut(clamp01((c - startMs) / hopMs));
    return { strokeDashoffset: length * (1 - draw), opacity: 1 - fadeAt(c, endMs) };
  });
  const glowProps = useAnimatedProps(() => {
    const c = clock.value;
    const draw = easeInOut(clamp01((c - startMs) / hopMs));
    return { strokeDashoffset: length * (1 - draw), opacity: 0.2 * (1 - fadeAt(c, endMs)) };
  });

  return (
    <>
      <Path d={curve.d} stroke={tone.main} strokeOpacity={0.22} strokeWidth={2} strokeLinecap="round" strokeDasharray="1 7" fill="none" />
      {glow ? (
        <AnimatedPath
          d={curve.d}
          stroke={tone.main}
          strokeWidth={9}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={glowProps}
        />
      ) : null}
      <AnimatedPath
        d={curve.d}
        stroke={tone.main}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${length} ${length}`}
        animatedProps={liveProps}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// What rides the path: a gold coin with a rim and a highlight, or a neon dot.
// ---------------------------------------------------------------------------

function Token({ leg, curve, clock, endMs }: { leg: PlannedLeg; curve: Curve; clock: SharedValue<number>; endMs: number }) {
  const tone = FLOW_TONES[leg.tone];
  const { startMs, hopMs } = leg;
  const { x0, y0, x1, y1, x2, y2, x3, y3 } = curve;

  const style = useAnimatedStyle(() => {
    const c = clock.value;
    const k = clamp01((c - startMs) / hopMs);
    const t = easeInOut(k);
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    const riding = k > 0 && k < 1 ? Math.min(1, k * 9, (1 - k) * 9) : 0;
    return {
      opacity: riding * (1 - fadeAt(c, endMs)),
      transform: [{ translateX: x - COIN / 2 }, { translateY: y - COIN / 2 }, { scale: 0.6 + 0.4 * riding }],
    };
  });

  return (
    <Animated.View style={[styles.token, style]} pointerEvents="none">
      {leg.token === "coin" ? (
        <>
          <View style={styles.coinHalo} />
          <View style={styles.coin}>
            <View style={styles.coinFace} />
            <View style={styles.coinShine} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.coinHalo, { backgroundColor: tone.main }]} />
          <View style={[styles.dot, { backgroundColor: tone.main }]} />
        </>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// A node: a pressed-3D chip with an icon, a ring that fills around it, a
// halo that breathes when a coin lands, a badge, a label and a number.
// ---------------------------------------------------------------------------

function Node({ placed, clock, endMs }: { placed: Placed; clock: SharedValue<number>; endMs: number }) {
  const { spec, plan, x, y, tone } = placed;
  const Icon = FLOW_ICONS[spec.icon];
  const { arrivals, litAt, doneAt, isSource } = plan;
  const ringTarget = Math.max(0, Math.min(1, spec.ring ?? 1));
  const above = spec.labelAbove === true;

  const bodyStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const f = fadeAt(c, endMs);
    const lit = isSource ? 1 : clamp01((c - litAt) / 260) * (1 - f);
    let recent = isSource ? 0 : -1;
    for (let i = 0; i < arrivals.length; i++) {
      if (c >= arrivals[i]) recent = arrivals[i];
    }
    const q = recent >= 0 ? (c - recent) / PULSE_MS : 2;
    const bump = q >= 0 && q < 1 ? Math.sin(q * Math.PI) * 0.09 : 0;
    return { opacity: 0.36 + 0.64 * lit, transform: [{ scale: 1 + bump }] };
  });

  const haloStyle = useAnimatedStyle(() => {
    const c = clock.value;
    let recent = isSource ? 0 : -1;
    for (let i = 0; i < arrivals.length; i++) {
      if (c >= arrivals[i]) recent = arrivals[i];
    }
    const span = isSource && recent === 0 ? LEAD_MS : PULSE_MS;
    const q = recent >= 0 ? (c - recent) / span : 2;
    const on = q >= 0 && q < 1;
    return { opacity: on ? (1 - q) * 0.5 : 0, transform: [{ scale: on ? 1 + q * 0.5 : 1 }] };
  });

  const ringProps = useAnimatedProps(() => {
    const c = clock.value;
    const span = Math.max(1, doneAt - litAt);
    const p = easeOut(clamp01((c - litAt) / span)) * (1 - fadeAt(c, endMs));
    return { strokeDashoffset: RING_LEN * (1 - ringTarget * p) };
  });

  const badgeStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const tk = clamp01((c - doneAt) / BADGE_MS);
    const live = 1 - fadeAt(c, endMs);
    return { opacity: tk > 0 ? live : 0, transform: [{ scale: tk > 0 ? Math.max(0, backOut(tk)) * live : 0 }] };
  });

  const texts = (
    <>
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {spec.label}
      </Text>
      {spec.amount ? (
        <FlowAmountText amount={spec.amount} plan={plan} clock={clock} color={tone.deep} />
      ) : (
        <View style={styles.amountSpacer} />
      )}
    </>
  );

  return (
    <View
      style={[styles.node, { left: x - NODE_W / 2, top: y - RING_BOX / 2 - (above ? LABEL_H + AMOUNT_H + TEXT_GAP : 0) }]}
      pointerEvents="none"
    >
      {above ? <View style={styles.textsAbove}>{texts}</View> : null}

      <Animated.View style={[styles.ringBox, bodyStyle]}>
        <Animated.View style={[styles.halo, { backgroundColor: tone.main }, haloStyle]} />
        <Svg width={RING_BOX} height={RING_BOX} style={StyleSheet.absoluteFill}>
          <Circle cx={RING_BOX / 2} cy={RING_BOX / 2} r={RING_R} stroke={tone.main} strokeOpacity={0.16} strokeWidth={RING_STROKE} fill="none" />
          <AnimatedCircle
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_R}
            stroke={tone.main}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${RING_LEN} ${RING_LEN}`}
            transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}
            animatedProps={ringProps}
          />
        </Svg>
        <View style={[styles.chip, { backgroundColor: tone.tint, borderColor: tone.lip }]}>
          <View style={styles.chipShine} />
          <Icon size={21} color={tone.deep} strokeWidth={2.2} />
        </View>
        {spec.badge ? (
          <Animated.View style={[styles.badge, spec.badge === "check" ? styles.badgeCheck : styles.badgeAlert, badgeStyle]}>
            {spec.badge === "check" ? <Check size={11} color="#ffffff" strokeWidth={3.6} /> : <TriangleAlert size={10} color="#ffffff" strokeWidth={3} />}
          </Animated.View>
        ) : null}
      </Animated.View>

      {above ? null : <View style={styles.textsBelow}>{texts}</View>}
    </View>
  );
}

/** How many decimals the amount's values carry (0, 1 or 2), so 6.5% never rounds to 7%. */
function decimalsOf(values: number[]): number {
  let max = 0;
  for (const v of values) {
    const s = String(v);
    const dot = s.indexOf(".");
    if (dot >= 0) max = Math.max(max, Math.min(2, s.length - dot - 1));
  }
  return max;
}

function FlowAmountText({
  amount,
  plan,
  clock,
  color,
}: {
  amount: NonNullable<FlowNodeSpec["amount"]>;
  plan: PlannedNode;
  clock: SharedValue<number>;
  color: string;
}) {
  const { values, prefix = "", suffix = "" } = amount;
  const { arrivals, isSource } = plan;
  const base = isSource || arrivals.length === 0 || amount.fromStart ? 0 : -1;
  const decimals = decimalsOf(values);
  const scale = Math.pow(10, decimals);
  const last = values.length - 1;

  // The value as an integer in 10^decimals units; -1 means "nothing yet".
  const valueAt = (c: number): number => {
    "worklet";
    let landed = 0;
    let recent = -1;
    for (let i = 0; i < arrivals.length; i++) {
      if (c >= arrivals[i]) {
        landed += 1;
        recent = arrivals[i];
      }
    }
    const idx = Math.min(last, base + landed);
    if (idx < 0) return -1;
    const cur = values[idx];
    const prev = idx > 0 ? values[idx - 1] : base === 0 ? cur : 0;
    const p = recent < 0 ? 1 : clamp01((c - recent) / COUNT_MS);
    // 14 steps per count: the number visibly races, React re-renders stay few.
    const q = Math.round(easeOut(p) * 14) / 14;
    return Math.round((prev + (cur - prev) * q) * scale);
  };

  const [shown, setShown] = useState<number>(() => valueAt(clock.value));

  useAnimatedReaction(
    () => valueAt(clock.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setShown)(current);
    },
  );

  let text = "";
  if (shown >= 0) {
    const n = shown / scale;
    const body = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString("he-IL");
    text = `${prefix}${body}${suffix}`;
  }

  return (
    <Text style={[styles.amount, { color }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// The payoff: one burst of sparks around the node the story ends on.
// One animated view; the eight sparks inside it are static.
// ---------------------------------------------------------------------------

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];
const SPARK_R = 40;

function Sparkle({ x, y, at, clock, endMs, color }: { x: number; y: number; at: number; clock: SharedValue<number>; endMs: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const c = clock.value;
    const k = clamp01((c - at) / 760);
    const on = k > 0 && k < 1;
    return {
      opacity: on ? (1 - k) * (1 - fadeAt(c, endMs)) : 0,
      transform: [{ scale: 0.45 + 0.75 * easeOut(k) }, { rotate: `${k * 24}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.sparkle, { left: x - SPARK_R, top: y - SPARK_R }, style]} pointerEvents="none">
      {SPARKS.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const size = i % 2 === 0 ? 6 : 4;
        return (
          <View
            key={deg}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: i % 2 === 0 ? 1.5 : size / 2,
              backgroundColor: i % 2 === 0 ? "#facc15" : color,
              left: SPARK_R + Math.cos(rad) * SPARK_R - size / 2,
              top: SPARK_R + Math.sin(rad) * SPARK_R - size / 2,
              transform: [{ rotate: "45deg" }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

function SharkReaction({ mood, at, clock, endMs }: { mood: "happy" | "empathic"; at: number; clock: SharedValue<number>; endMs: number }) {
  const style = useAnimatedStyle(() => {
    const c = clock.value;
    const k = clamp01((c - at) / 460);
    const live = 1 - fadeAt(c, endMs);
    return { opacity: k > 0 ? live : 0, transform: [{ scale: k > 0 ? Math.max(0, backOut(k)) : 0 }] };
  });
  return (
    <Animated.View style={[styles.shark, style]} pointerEvents="none">
      <ExpoImage source={SHARK[mood]} style={styles.sharkImage} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: "absolute",
    width: NODE_W,
    alignItems: "center",
  },
  ringBox: {
    width: RING_BOX,
    height: RING_BOX,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: RING_BOX,
    height: RING_BOX,
    borderRadius: RING_BOX / 2,
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderBottomWidth: 4,
    overflow: "hidden",
  },
  chipShine: {
    position: "absolute",
    top: 3,
    left: 7,
    right: 7,
    height: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  badge: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  badgeCheck: {
    backgroundColor: "#16a34a",
  },
  badgeAlert: {
    backgroundColor: "#dc2626",
  },
  textsBelow: {
    marginTop: TEXT_GAP,
    alignItems: "center",
    width: NODE_W,
  },
  textsAbove: {
    marginBottom: TEXT_GAP,
    alignItems: "center",
    width: NODE_W,
  },
  label: {
    height: LABEL_H,
    lineHeight: LABEL_H,
    color: LL_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl",
  },
  amount: {
    height: AMOUNT_H,
    lineHeight: AMOUNT_H,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
  amountSpacer: {
    height: AMOUNT_H,
  },
  token: {
    position: "absolute",
    left: 0,
    top: 0,
    width: COIN,
    height: COIN,
    alignItems: "center",
    justifyContent: "center",
  },
  coinHalo: {
    position: "absolute",
    width: COIN + 12,
    height: COIN + 12,
    borderRadius: (COIN + 12) / 2,
    backgroundColor: "#facc15",
    opacity: 0.28,
  },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    backgroundColor: "#f59e0b",
    borderWidth: 1.5,
    borderColor: "#b45309",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coinFace: {
    width: COIN - 7,
    height: COIN - 7,
    borderRadius: (COIN - 7) / 2,
    backgroundColor: "#fde047",
  },
  coinShine: {
    position: "absolute",
    top: 2,
    left: 3,
    width: 6,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
    transform: [{ rotate: "-30deg" }],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  sparkle: {
    position: "absolute",
    width: SPARK_R * 2,
    height: SPARK_R * 2,
  },
  shark: {
    width: 40,
    height: 40,
  },
  sharkImage: {
    width: 40,
    height: 40,
  },
});
