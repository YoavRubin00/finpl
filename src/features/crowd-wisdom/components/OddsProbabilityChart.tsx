import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Line } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Target } from 'lucide-react-native';

import type { CrowdWisdomChoice } from '../types';

// Betting-site (Polymarket-style) market view, built ONLY from the real bet
// ledger returned by /api/crowd-bets/history:
//   • betCount  — how many REAL bets exist (the honesty gate).
//   • current   — implied probability per choice (pool share, %).
//   • series    — implied probability over time, one point per real bet.
// When betCount === 0 the pool is pure virtual seed (a uniform 1/N line), so we
// DO NOT draw a fabricated distribution — we show an honest first-mover state
// and only render the graph once real bets exist.

export interface OddsHistoryPoint {
  t: string;
  probs: Record<string, number>;
}

interface OddsProbabilityChartProps {
  choices: CrowdWisdomChoice[];
  betCount: number;
  /** Implied probability (%) per choiceId, from the real pool. */
  current: Record<string, number>;
  /** Probability-over-time series reconstructed from the real ledger. */
  series: OddsHistoryPoint[];
}

const CHART_W = 300;
const CHART_H = 64;

function linePoints(series: OddsHistoryPoint[], choiceId: string): string {
  if (series.length === 0) return '';
  const n = series.length;
  const stepX = n > 1 ? CHART_W / (n - 1) : CHART_W;
  return series
    .map((p, i) => {
      const prob = p.probs[choiceId] ?? 50;
      const x = n > 1 ? i * stepX : CHART_W / 2;
      const y = CHART_H - (prob / 100) * CHART_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Closes the leader line down to the baseline for a filled area. */
function areaPoints(series: OddsHistoryPoint[], choiceId: string): string {
  const line = linePoints(series, choiceId);
  if (!line) return '';
  return `${line} ${CHART_W},${CHART_H} 0,${CHART_H}`;
}

export function OddsProbabilityChart({
  choices,
  betCount,
  current,
  series,
}: OddsProbabilityChartProps): React.ReactElement {
  // Honest first-mover state — no real crowd yet, so no graph.
  if (betCount <= 0) {
    return (
      <Animated.View entering={FadeIn.duration(280)} style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Target size={18} color="#7c3aed" strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.2}>
            עדיין אין תחזיות בשוק הזה
          </Text>
          <Text style={styles.emptySub} maxFontSizeMultiplier={1.2}>
            היו הראשונים לחזות — המכפיל ייקבע לפי הקהל
          </Text>
        </View>
      </Animated.View>
    );
  }

  const entries = choices
    .map((choice) => ({ choice, prob: current[choice.id] ?? 0 }))
    .sort((a, b) => b.prob - a.prob);
  const leader = entries[0];

  const opening = series[0]?.probs[leader.choice.id] ?? 50;
  const delta = parseFloat((leader.prob - opening).toFixed(1));

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap}>
      {/* Price line — the leading outcome is the market "price". */}
      <View style={styles.priceRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaderLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {leader.choice.glyph ? `${leader.choice.glyph} ` : ''}
            {leader.choice.label}
          </Text>
          <Text style={styles.marketMeta} maxFontSizeMultiplier={1.2}>
            שוק חי · {betCount.toLocaleString('he-IL')} תחזיות
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text
            style={[styles.priceText, { color: leader.choice.accentColor }]}
            maxFontSizeMultiplier={1.2}
          >
            {Math.round(leader.prob)}%
          </Text>
          {delta !== 0 && (
            <Text
              style={[styles.deltaText, { color: delta > 0 ? '#15803d' : '#b91c1c' }]}
              maxFontSizeMultiplier={1.2}
            >
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
            </Text>
          )}
        </View>
      </View>

      {/* Probability-over-time chart — real ledger, no synthetic movement. */}
      <View style={styles.chartWrap}>
        <Svg
          width="100%"
          height={CHART_H}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
        >
          {/* 50% reference line */}
          <Line
            x1={0}
            y1={CHART_H / 2}
            x2={CHART_W}
            y2={CHART_H / 2}
            stroke="#e2e8f0"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          {/* Faint lines for the non-leading outcomes */}
          {entries.slice(1).map(({ choice }) => (
            <Polyline
              key={choice.id}
              points={linePoints(series, choice.id)}
              fill="none"
              stroke={choice.accentColor}
              strokeOpacity={0.35}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* Leader area fill + bold line */}
          <Polygon
            points={areaPoints(series, leader.choice.id)}
            fill={leader.choice.accentColor}
            fillOpacity={0.12}
          />
          <Polyline
            points={linePoints(series, leader.choice.id)}
            fill="none"
            stroke={leader.choice.accentColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.axisRow}>
          <Text style={styles.axisText}>עכשיו</Text>
          <Text style={styles.axisText}>סיכוי לאורך זמן</Text>
          <Text style={styles.axisText}>פתיחה</Text>
        </View>
      </View>

      {/* Per-outcome probability bars, Polymarket-style. */}
      <View style={styles.bars}>
        {entries.map(({ choice, prob }) => {
          const pct = Math.max(0, Math.min(100, prob));
          return (
            <View key={choice.id} style={styles.barRow}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {choice.glyph ? `${choice.glyph} ` : ''}
                  {choice.label}
                </Text>
                <Text
                  style={[styles.barPct, { color: choice.accentColor }]}
                  maxFontSizeMultiplier={1.2}
                >
                  {Math.round(prob)}%
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max(2, pct)}%`, backgroundColor: choice.accentColor },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  emptyWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#5b21b6',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  emptySub: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7c3aed',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 1,
    flexShrink: 1,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  leaderLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  marketMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 1,
  },
  priceBlock: {
    alignItems: 'center',
  },
  priceText: {
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 30,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  chartWrap: {
    gap: 2,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  bars: {
    gap: 9,
  },
  barRow: {
    gap: 5,
  },
  barLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  barPct: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    borderRadius: 999,
  },
});
