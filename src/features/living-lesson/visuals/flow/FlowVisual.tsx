import React, { useCallback, useId, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import Animated, { runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { Check, TriangleAlert } from "lucide-react-native";
import { LL_COLORS } from "../../tokens";
import { FLOW_ICONS, FLOW_TONES } from "./flowIcons";
import type { ToneColors } from "./flowIcons";
import { BUMP_SCALE, FRAME_INSET_X, HALO_SCALE, SPARK_SCALE, SWING_PX, chooseFlow, stageBudget } from "./flowLayout";
import type { ChosenFlow, FlowLayout, NodeLayout } from "./flowLayout";
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
} from "./flowTimeline";
import type { Curve, PlannedLeg, PlannedNode } from "./flowTimeline";
import type { FlowNodeSpec, FlowVisualSpec } from "./flowTypes";
import { StageFrame } from "./StageFrame";
import { useRoundClock } from "./useRoundClock";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Captain Shark, the in-app transparent loops (assets/webp). He only shows when a diagram asks for him.
const SHARK = {
  happy: require("../../../../../assets/webp/fin-happy.webp") as number,
  empathic: require("../../../../../assets/webp/fin-empathic.webp") as number,
};

/** Above this many paths the soft glow under each one is dropped (low-end Android). */
const GLOW_MAX_LEGS = 5;
/** Stage height before the first measurement, so the card does not jump much. */
const PLACEHOLDER_H = 150;

interface Props {
  visual: FlowVisualSpec;
  animate: boolean;
  startDelayMs: number;
  /** Most height the whole visual (frame, caption row included) may take. */
  maxHeight?: number;
}

/**
 * The living diagram. Geometry comes from flowLayout.ts, sized from the
 * measured stage width, the height budget and the font scale, with a safe
 * margin on every side. One shared clock (ms) runs on the UI thread; every
 * path, coin, ring and badge reads it in a worklet, so a running diagram
 * never re-renders React (numbers step at most 14 times per landing).
 * Plays a round, holds, fades, plays once more and settles on the finished
 * frame. Reduced motion: the finished frame, nothing moves.
 */
export function FlowVisual({ visual, animate, startDelayMs, maxHeight }: Props) {
  const { caption, example, shark, direction } = visual;
  const rtl = direction !== "ltr";
  const { fontScale } = useWindowDimensions();

  // The visual's own measured width; the stage inside StageFrame is FRAME_INSET_X narrower.
  const [outerW, setOuterW] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setOuterW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  const chosen = useMemo<ChosenFlow | null>(() => {
    if (outerW <= 0) return null;
    const width = outerW - FRAME_INSET_X;
    const budget = stageBudget(maxHeight, { stageWidth: width, caption, example, shark: !!shark, fontScale });
    return chooseFlow(visual, { width, maxHeight: budget, fontScale, rtl });
  }, [outerW, maxHeight, caption, example, shark, fontScale, visual, rtl]);

  return (
    <View style={styles.measure} onLayout={onLayout}>
      {chosen ? (
        // Keyed by the variant: if a resize flips full <-> fewer rows, the diagram (and its clock) starts over.
        <FlowStage key={chosen.variant} visual={visual} chosen={chosen} animate={animate} startDelayMs={startDelayMs} />
      ) : (
        <View style={{ height: PLACEHOLDER_H }} />
      )}
    </View>
  );
}

function FlowStage({ visual, chosen, animate, startDelayMs }: { visual: FlowVisualSpec; chosen: ChosenFlow; animate: boolean; startDelayMs: number }) {
  const { caption, a11y, example, shark } = visual;
  const { nodes, plan, layout } = chosen;
  const patternId = `ll-dots-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const endMs = plan.endMs;
  const payoff = nodes.find((n) => n.id === plan.payoffId);
  const payoffIsGood = payoff?.badge !== "alert";
  const { clock, replay } = useRoundClock({ animate, endMs, startDelayMs, payoffAt: plan.payoffAt, payoffIsGood });

  const height = layout.height;
  const payoffNode = layout.nodes[plan.payoffId];
  const glow = layout.curves.length <= GLOW_MAX_LEGS;

  return (
    <StageFrame
      height={height}
      a11y={a11y}
      caption={caption}
      example={example}
      onReplay={animate ? replay : undefined}
      aside={shark ? <SharkReaction mood={shark} at={plan.payoffAt} clock={clock} endMs={endMs} /> : null}
    >
      {layout ? (
        <>
          <Svg width={layout.width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} patternUnits="userSpaceOnUse" width={18} height={18}>
                <Circle cx={3} cy={3} r={1.1} fill="rgba(2,132,199,0.16)" />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width={layout.width} height={height} fill={`url(#${patternId})`} />
            {layout.curves.map(({ leg, curve }) => (
              <Edge key={leg.key} leg={leg} curve={curve} clock={clock} endMs={endMs} glow={glow} />
            ))}
          </Svg>

          {layout.curves.map(({ leg, curve }) => (
            <Token key={leg.key} leg={leg} curve={curve} layout={layout} clock={clock} endMs={endMs} />
          ))}

          {nodes.map((spec) => {
            const at = layout.nodes[spec.id];
            const planned = plan.nodes[spec.id];
            if (!at || !planned) return null;
            return (
              <Node key={spec.id} spec={spec} at={at} plan={planned} layout={layout} tone={FLOW_TONES[spec.tone ?? "cyan"]} clock={clock} endMs={endMs} />
            );
          })}

          {payoffNode && payoffIsGood && layout.sparkR >= 12 ? (
            <Sparkle
              x={payoffNode.cx}
              y={payoffNode.cy}
              r={layout.sparkR}
              at={plan.payoffAt}
              clock={clock}
              endMs={endMs}
              color={FLOW_TONES[payoff?.tone ?? "cyan"].main}
            />
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

function Token({
  leg,
  curve,
  layout,
  clock,
  endMs,
}: {
  leg: PlannedLeg;
  curve: Curve;
  layout: FlowLayout;
  clock: SharedValue<number>;
  endMs: number;
}) {
  const tone = FLOW_TONES[leg.tone];
  const { startMs, hopMs } = leg;
  const { x0, y0, x1, y1, x2, y2, x3, y3 } = curve;
  const coin = layout.coin;
  const halo = layout.coinHalo * 2;

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
      // Never above 1: the coin's halo is already counted in the path's bounds.
      transform: [{ translateX: x - coin / 2 }, { translateY: y - coin / 2 }, { scale: 0.6 + 0.4 * riding }],
    };
  });

  const haloStyle = { width: halo, height: halo, borderRadius: halo / 2 };

  return (
    <Animated.View style={[styles.token, { width: coin, height: coin }, style]} pointerEvents="none">
      {leg.token === "coin" ? (
        <>
          <View style={[styles.coinHalo, haloStyle]} />
          <View style={[styles.coin, { width: coin, height: coin, borderRadius: coin / 2 }]}>
            <View style={[styles.coinFace, { width: coin - 7, height: coin - 7, borderRadius: (coin - 7) / 2 }]} />
            <View style={styles.coinShine} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.coinHalo, haloStyle, { backgroundColor: tone.main }]} />
          <View style={[styles.dot, { backgroundColor: tone.main }]} />
        </>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// A node: a pressed-3D chip with an icon, a ring that fills around it, a
// halo that breathes when a coin lands, a badge, a label and a number.
// The ring box and the text block are placed separately, straight from the
// layout's rectangles, so what is drawn is what the geometry check measured.
// ---------------------------------------------------------------------------

function Node({
  spec,
  at,
  plan,
  layout,
  tone,
  clock,
  endMs,
}: {
  spec: FlowNodeSpec;
  at: NodeLayout;
  plan: PlannedNode;
  layout: FlowLayout;
  tone: ToneColors;
  clock: SharedValue<number>;
  endMs: number;
}) {
  const Icon = FLOW_ICONS[spec.icon];
  const { arrivals, litAt, doneAt, isSource } = plan;
  const ringTarget = Math.max(0, Math.min(1, spec.ring ?? 1));
  const { ring, ringR, ringStroke, chip, badge } = layout;
  const ringLen = 2 * Math.PI * ringR;
  const swing = spec.swing === true;
  const bumpBy = BUMP_SCALE - 1;
  const haloBy = HALO_SCALE - 1;

  const bodyStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const f = fadeAt(c, endMs);
    const lit = isSource ? 1 : clamp01((c - litAt) / 260) * (1 - f);
    let recent = isSource ? 0 : -1;
    for (let i = 0; i < arrivals.length; i++) {
      if (c >= arrivals[i]) recent = arrivals[i];
    }
    const q = recent >= 0 ? (c - recent) / PULSE_MS : 2;
    const bump = q >= 0 && q < 1 ? Math.sin(q * Math.PI) * bumpBy : 0;
    const sway = swing ? Math.sin(c / 240) * SWING_PX * lit : 0;
    return { opacity: 0.36 + 0.64 * lit, transform: [{ translateY: sway }, { scale: 1 + bump }] };
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
    return { opacity: on ? (1 - q) * 0.5 : 0, transform: [{ scale: on ? 1 + q * haloBy : 1 }] };
  });

  const ringProps = useAnimatedProps(() => {
    const c = clock.value;
    const span = Math.max(1, doneAt - litAt);
    const p = easeOut(clamp01((c - litAt) / span)) * (1 - fadeAt(c, endMs));
    return { strokeDashoffset: ringLen * (1 - ringTarget * p) };
  });

  const badgeStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const tk = clamp01((c - doneAt) / BADGE_MS);
    const live = 1 - fadeAt(c, endMs);
    return { opacity: tk > 0 ? live : 0, transform: [{ scale: tk > 0 ? Math.max(0, backOut(tk)) * live : 0 }] };
  });

  // In the regular layouts a label above its node sits at the bottom of its block.
  const justify = layout.mode === "side" ? "center" : spec.labelAbove ? "flex-end" : "flex-start";

  return (
    <>
      <Animated.View
        style={[styles.ringBox, { left: at.ringRect.x, top: at.ringRect.y, width: ring, height: ring }, bodyStyle]}
        pointerEvents="none"
      >
        <Animated.View style={[styles.halo, { width: ring, height: ring, borderRadius: ring / 2, backgroundColor: tone.main }, haloStyle]} />
        <Svg width={ring} height={ring} style={StyleSheet.absoluteFill}>
          <Circle cx={ring / 2} cy={ring / 2} r={ringR} stroke={tone.main} strokeOpacity={0.16} strokeWidth={ringStroke} fill="none" />
          <AnimatedCircle
            cx={ring / 2}
            cy={ring / 2}
            r={ringR}
            stroke={tone.main}
            strokeWidth={ringStroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${ringLen} ${ringLen}`}
            transform={`rotate(-90 ${ring / 2} ${ring / 2})`}
            animatedProps={ringProps}
          />
        </Svg>
        <View style={[styles.chip, { width: chip, height: chip, borderRadius: chip / 2, backgroundColor: tone.tint, borderColor: tone.lip }]}>
          <View style={[styles.chipShine, { left: chip * 0.17, right: chip * 0.17, height: chip * 0.28 }]} />
          <Icon size={layout.icon} color={tone.deep} strokeWidth={2.2} />
        </View>
        {spec.badge ? (
          <Animated.View
            style={[
              styles.badge,
              { width: badge, height: badge, borderRadius: badge / 2 },
              spec.badge === "check" ? styles.badgeCheck : styles.badgeAlert,
              badgeStyle,
            ]}
          >
            {spec.badge === "check" ? (
              <Check size={badge * 0.55} color="#ffffff" strokeWidth={3.6} />
            ) : (
              <TriangleAlert size={badge * 0.5} color="#ffffff" strokeWidth={3} />
            )}
          </Animated.View>
        ) : null}
      </Animated.View>

      <View
        style={[styles.texts, { left: at.textRect.x, top: at.textRect.y, width: at.textRect.w, height: at.textRect.h, justifyContent: justify }]}
        pointerEvents="none"
      >
        <Text
          style={[styles.label, { fontSize: layout.labelFont, lineHeight: layout.labelLH, textAlign: at.textAlign }]}
          numberOfLines={2}
          ellipsizeMode="tail"
          allowFontScaling={false}
        >
          {at.label}
        </Text>
        {spec.amount ? (
          <FlowAmountText
            amount={spec.amount}
            plan={plan}
            clock={clock}
            color={tone.deep}
            fontSize={layout.amountFont}
            lineHeight={layout.amountLH}
            textAlign={at.textAlign}
          />
        ) : null}
      </View>
    </>
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
  fontSize,
  lineHeight,
  textAlign,
}: {
  amount: NonNullable<FlowNodeSpec["amount"]>;
  plan: PlannedNode;
  clock: SharedValue<number>;
  color: string;
  fontSize: number;
  lineHeight: number;
  textAlign: "center" | "left" | "right";
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
    <Text style={[styles.amount, { color, fontSize, lineHeight, height: lineHeight, textAlign }]} numberOfLines={1} allowFontScaling={false}>
      {text}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// The payoff: one burst of sparks around the node the story ends on.
// One animated view; the eight sparks inside it are static. Its radius comes
// from the layout, which sized it to end inside the safe box.
// ---------------------------------------------------------------------------

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

function Sparkle({
  x,
  y,
  r,
  at,
  clock,
  endMs,
  color,
}: {
  x: number;
  y: number;
  r: number;
  at: number;
  clock: SharedValue<number>;
  endMs: number;
  color: string;
}) {
  const grow = SPARK_SCALE - 0.45;
  const style = useAnimatedStyle(() => {
    const c = clock.value;
    const k = clamp01((c - at) / 760);
    const on = k > 0 && k < 1;
    return {
      opacity: on ? (1 - k) * (1 - fadeAt(c, endMs)) : 0,
      transform: [{ scale: 0.45 + grow * easeOut(k) }, { rotate: `${k * 24}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.sparkle, { left: x - r, top: y - r, width: r * 2, height: r * 2 }, style]} pointerEvents="none">
      {SPARKS.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const size = i % 2 === 0 ? 6 : 4;
        // Sparks sit just inside the radius, so the burst's edge is the radius itself.
        const d = r - size;
        return (
          <View
            key={deg}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: i % 2 === 0 ? 1.5 : size / 2,
              backgroundColor: i % 2 === 0 ? "#facc15" : color,
              left: r + Math.cos(rad) * d - size / 2,
              top: r + Math.sin(rad) * d - size / 2,
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
  // A 44 px box around a 36 px image: the pop's overshoot stays inside the box.
  return (
    <View style={styles.sharkBox} pointerEvents="none">
      <Animated.View style={style}>
        <ExpoImage source={SHARK[mood]} style={styles.sharkImage} contentFit="contain" accessible={false} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  measure: {
    width: "100%",
  },
  ringBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
  },
  chip: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderBottomWidth: 4,
    overflow: "hidden",
  },
  chipShine: {
    position: "absolute",
    top: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
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
  texts: {
    position: "absolute",
    overflow: "hidden",
  },
  label: {
    color: LL_COLORS.textPrimary,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  amount: {
    fontWeight: "900",
    writingDirection: "ltr",
    fontVariant: ["tabular-nums"],
  },
  token: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  coinHalo: {
    position: "absolute",
    backgroundColor: "#facc15",
    opacity: 0.28,
  },
  coin: {
    backgroundColor: "#f59e0b",
    borderWidth: 1.5,
    borderColor: "#b45309",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coinFace: {
    backgroundColor: "#fde047",
  },
  coinShine: {
    position: "absolute",
    top: 2,
    left: 3,
    width: 5,
    height: 3.5,
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
  },
  sharkBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sharkImage: {
    width: 36,
    height: 36,
  },
});
