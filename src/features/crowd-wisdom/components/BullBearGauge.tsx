import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  useReducedMotion,
  interpolate,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GAUGE_WIDTH = 240;
const GAUGE_HEIGHT = 140;
const GAUGE_CENTER_X = GAUGE_WIDTH / 2;
const GAUGE_CENTER_Y = GAUGE_HEIGHT - 12;
const GAUGE_RADIUS = 100;

interface BullBearGaugeProps {
  /** Bullish / neutral / bearish percentages (sum should equal ~100). */
  bullishPercent: number;
  neutralPercent: number;
  bearishPercent: number;
  /** Needle position in [0, 1] — 0 = fully bearish, 1 = fully bullish. */
  needlePosition: number;
  /** Question text shown above the gauge. */
  question: string;
  /** Footer subtitle (e.g. "על בסיס 8,240 הצבעות · מתעדכן כל שעה"). */
  footer?: string;
}

/**
 * Semi-circular Bull/Bear sentiment gauge.
 * Bearish (red) on the LEFT, Neutral (gray) in the MIDDLE, Bullish (green)
 * on the RIGHT. In RTL the visual orientation matches the text: "שורי" label
 * sits on the right side of the gauge where the green arc lives, "דובי" on
 * the left where the red arc lives.
 *
 * Honors reduced-motion: needle jumps to final value with no spring.
 */
export function BullBearGauge({
  bullishPercent,
  neutralPercent,
  bearishPercent,
  needlePosition,
  question,
  footer,
}: BullBearGaugeProps) {
  const reduceMotion = useReducedMotion();
  const animatedNeedle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      animatedNeedle.value = needlePosition;
    } else {
      animatedNeedle.value = withSpring(needlePosition, {
        damping: 14,
        stiffness: 90,
        mass: 1,
      });
    }
  }, [needlePosition, reduceMotion, animatedNeedle]);

  // Needle end point: project from center to (radius * 0.92) at angle θ.
  // θ ranges from π (180°, full left = bear) to 0 (0°, full right = bull).
  const needleAnimatedProps = useAnimatedProps(() => {
    const angle = interpolate(animatedNeedle.value, [0, 1], [Math.PI, 0]);
    const r = GAUGE_RADIUS * 0.92;
    const x = GAUGE_CENTER_X + r * Math.cos(angle);
    const y = GAUGE_CENTER_Y - r * Math.sin(angle);
    return { cx: x, cy: y };
  });

  // Static needle base + tick arcs.
  const arcPath = describeArc(GAUGE_CENTER_X, GAUGE_CENTER_Y, GAUGE_RADIUS, 180, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>מד הסנטימנט</Text>
      <Text style={styles.question}>{question}</Text>

      <View style={styles.gaugeRow}>
        <View style={styles.legendCol}>
          <LegendRow glyph="🐂" label="שורי" percent={bullishPercent} barColor="#10b981" />
          <LegendRow glyph="😐" label="ניטרלי" percent={neutralPercent} barColor="#94a3b8" />
          <LegendRow glyph="🐻" label="דובי" percent={bearishPercent} barColor="#dc2626" />
        </View>

        <View style={styles.gaugeContainer}>
          <Svg width={GAUGE_WIDTH} height={GAUGE_HEIGHT} viewBox={`0 0 ${GAUGE_WIDTH} ${GAUGE_HEIGHT}`}>
            <Defs>
              <SvgLinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#dc2626" />
                <Stop offset="45%" stopColor="#94a3b8" />
                <Stop offset="55%" stopColor="#94a3b8" />
                <Stop offset="100%" stopColor="#10b981" />
              </SvgLinearGradient>
            </Defs>

            {/* Background arc */}
            <Path
              d={arcPath}
              stroke="url(#gaugeGradient)"
              strokeWidth={22}
              strokeLinecap="round"
              fill="none"
            />

            {/* Pivot dot */}
            <Circle cx={GAUGE_CENTER_X} cy={GAUGE_CENTER_Y} r={8} fill="#1e293b" />

            {/* Needle head — animated */}
            <AnimatedCircle
              r={9}
              fill="#1e293b"
              stroke="#ffffff"
              strokeWidth={3}
              animatedProps={needleAnimatedProps}
            />
          </Svg>

          <View style={styles.gaugeLabelRow}>
            <Text style={[styles.gaugeLabel, { color: "#dc2626" }]}>דובי</Text>
            <Text style={[styles.gaugeLabel, { color: "#10b981" }]}>שורי</Text>
          </View>
        </View>
      </View>

      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

interface LegendRowProps {
  glyph: string;
  label: string;
  percent: number;
  barColor: string;
}

function LegendRow({ glyph, label, percent, barColor }: LegendRowProps) {
  const widthPct = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.legendRow}>
      <Text style={styles.legendGlyph}>{glyph}</Text>
      <Text style={styles.legendLabel}>{label}</Text>
      <View style={styles.legendBarTrack}>
        <View
          style={[
            styles.legendBarFill,
            { width: `${widthPct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={styles.legendPercent}>{Math.round(percent)}%</Text>
    </View>
  );
}

/** Describes an SVG arc path from startAngleDeg to endAngleDeg (CCW). */
function describeArc(cx: number, cy: number, r: number, startAngleDeg: number, endAngleDeg: number): string {
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = (endAngleDeg * Math.PI) / 180;
  const startX = cx + r * Math.cos(startRad);
  const startY = cy - r * Math.sin(startRad);
  const endX = cx + r * Math.cos(endRad);
  const endY = cy - r * Math.sin(endRad);
  const largeArc = Math.abs(startAngleDeg - endAngleDeg) > 180 ? 1 : 0;
  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7c3aed",
    writingDirection: "rtl",
    textAlign: "right",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  question: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 14,
  },
  gaugeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  legendCol: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  legendGlyph: {
    fontSize: 16,
    width: 22,
    textAlign: "center",
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    minWidth: 42,
    textAlign: "right",
    writingDirection: "rtl",
  },
  legendBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  legendBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  legendPercent: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1e293b",
    minWidth: 32,
    textAlign: "left",
  },
  gaugeContainer: {
    alignItems: "center",
    width: GAUGE_WIDTH,
  },
  gaugeLabelRow: {
    flexDirection: "row",
    width: GAUGE_WIDTH,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginTop: -10,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  footer: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
  },
});