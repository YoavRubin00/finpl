import React, { useEffect, useState } from "react";
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

import { getApiBase } from "../../../db/apiBase";
import type { LiveMarketData } from "../../live-news/liveMarketTypes";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GAUGE_WIDTH = 240;
const GAUGE_HEIGHT = 132;
const GAUGE_CENTER_X = GAUGE_WIDTH / 2;
const GAUGE_CENTER_Y = GAUGE_HEIGHT - 12;
const GAUGE_RADIUS = 100;

interface BullBearGaugeProps {
  /** Question text shown above the gauge. */
  question?: string;
}

interface Sentiment {
  bull: number;
  neutral: number;
  bear: number;
  needle: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

// Neutral fallback while the live fetch is in flight or offline.
const NEUTRAL: Sentiment = { bull: 50, neutral: 25, bear: 25, needle: 0.5 };

/**
 * Data-honesty status for the footer: the "נתונים חיים" claim is only made
 * AFTER a successful derive from real market movers — never over the
 * hardcoded neutral placeholder (loading / offline / empty feed).
 */
type GaugeStatus = "loading" | "live" | "failed";

/**
 * Derive market sentiment from the REAL daily change of the big market movers
 * (ת"א 125 + ת"א 35 + ביטקוין) — NOT from seed votes. score = mean of the
 * clamped daily change-%s; a positive tape leans bullish, a red tape bearish.
 * Returns null when no usable mover exists — the caller must NOT claim live data.
 */
function deriveSentiment(data: LiveMarketData): Sentiment | null {
  const wanted = ['ת"א 125', 'ת"א 35', "ביטקוין"];
  const changes = wanted
    .map((label) => data.rates.find((r) => r.label === label))
    .filter((r): r is NonNullable<typeof r> => !!r && Number.isFinite(r.changePct))
    .map((r) => clamp(r.changePct, -3, 3));

  if (changes.length === 0) return null;

  const score = changes.reduce((a, c) => a + c, 0) / changes.length;
  const bull = clamp(Math.round(50 + score * 12), 5, 95);
  const rest = 100 - bull;
  const bearShare = clamp(0.5 - score * 0.15, 0.15, 0.85);
  const bear = Math.round(rest * bearShare);
  const neutral = Math.max(0, rest - bear);
  const needle = clamp((bull - bear + 100) / 200, 0, 1);
  return { bull, neutral, bear, needle };
}

/**
 * Semi-circular Bull/Bear sentiment gauge, driven by LIVE market data.
 * Bearish (red) on the LEFT, Neutral (gray) in the MIDDLE, Bullish (green)
 * on the RIGHT. The %-legend sits in its own column BELOW the arc so nothing
 * overlaps at any width. Honors reduced-motion: needle jumps with no spring.
 */
export function BullBearGauge({
  question = "האם השוק יעלה החודש?",
}: BullBearGaugeProps) {
  const reduceMotion = useReducedMotion();
  const animatedNeedle = useSharedValue(0.5);
  const [sentiment, setSentiment] = useState<Sentiment>(NEUTRAL);
  const [status, setStatus] = useState<GaugeStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/market/live`);
        if (!res.ok) {
          if (!cancelled) setStatus("failed");
          return;
        }
        const data = (await res.json()) as LiveMarketData;
        const derived = Array.isArray(data.rates) ? deriveSentiment(data) : null;
        if (cancelled) return;
        if (derived) {
          setSentiment(derived);
          setStatus("live");
        } else {
          // Feed answered but held no usable mover — the neutral placeholder
          // stays and the footer must not claim live data.
          setStatus("failed");
        }
      } catch {
        /* offline — neutral fallback stays, footer says so honestly */
        if (!cancelled) setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      animatedNeedle.value = sentiment.needle;
    } else {
      animatedNeedle.value = withSpring(sentiment.needle, {
        damping: 14,
        stiffness: 90,
        mass: 1,
      });
    }
  }, [sentiment.needle, reduceMotion, animatedNeedle]);

  // Needle end point: project from center to (radius * 0.92) at angle θ.
  // θ ranges from π (180°, full left = bear) to 0 (0°, full right = bull).
  const needleAnimatedProps = useAnimatedProps(() => {
    const angle = interpolate(animatedNeedle.value, [0, 1], [Math.PI, 0]);
    const r = GAUGE_RADIUS * 0.92;
    const x = GAUGE_CENTER_X + r * Math.cos(angle);
    const y = GAUGE_CENTER_Y - r * Math.sin(angle);
    return { cx: x, cy: y };
  });

  const arcPath = describeArc(GAUGE_CENTER_X, GAUGE_CENTER_Y, GAUGE_RADIUS, 180, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>מד הסנטימנט</Text>
      <Text style={styles.question} maxFontSizeMultiplier={1.15}>
        {question}
      </Text>

      {/* Arc — centered on its own row */}
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

        {/* דובי / שורי poles sit directly under the arc ends. */}
        <View style={styles.gaugeLabelRow}>
          <Text style={[styles.gaugeLabel, { color: "#dc2626" }]}>דובי</Text>
          <Text style={[styles.gaugeLabel, { color: "#10b981" }]}>שורי</Text>
        </View>
      </View>

      {/* Legend — its OWN column below the arc; nothing overlaps. */}
      <View style={styles.legendCol}>
        <LegendRow glyph="🐂" label="שורי" percent={sentiment.bull} barColor="#10b981" />
        <LegendRow glyph="😐" label="ניטרלי" percent={sentiment.neutral} barColor="#94a3b8" />
        <LegendRow glyph="🐻" label="דובי" percent={sentiment.bear} barColor="#dc2626" />
      </View>

      {/* "נתונים חיים" only once a real derive landed — never over the
          neutral placeholder. */}
      <Text style={styles.footer}>
        {status === "live"
          ? "מבוסס על תנועת השוק היום · נתונים חיים"
          : status === "loading"
            ? "טוען נתוני שוק…"
            : "אין נתונים חיים כרגע"}
      </Text>
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
  const widthPct = clamp(percent, 0, 100);
  return (
    <View style={styles.legendRow}>
      <Text style={styles.legendGlyph}>{glyph}</Text>
      <Text style={styles.legendLabel} maxFontSizeMultiplier={1.1} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.legendBarTrack}>
        <View
          style={[
            styles.legendBarFill,
            { width: `${widthPct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={styles.legendPercent} maxFontSizeMultiplier={1.1} numberOfLines={1}>
        {Math.round(percent)}%
      </Text>
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
    marginBottom: 8,
  },
  gaugeContainer: {
    alignItems: "center",
    alignSelf: "center",
    width: GAUGE_WIDTH,
    maxWidth: "100%",
  },
  gaugeLabelRow: {
    flexDirection: "row",
    width: GAUGE_WIDTH,
    maxWidth: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginTop: 2,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  legendCol: {
    gap: 10,
    marginTop: 14,
  },
  legendRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
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
    width: 52,
    textAlign: "right",
    writingDirection: "rtl",
    flexShrink: 0,
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
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
    width: 40,
    textAlign: "left",
    flexShrink: 0,
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
