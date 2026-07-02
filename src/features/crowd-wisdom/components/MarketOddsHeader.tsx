import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getApiBase } from '../../../db/apiBase';
import type { CrowdWisdomQuestion } from '../types';

// Polymarket-style market header: the leading choice's implied probability is
// the "price", with a probability-over-time chart built from the REAL bet
// ledger (no synthetic movement — a quiet market shows a flat line).

interface HistoryPoint {
  t: string;
  probs: Record<string, number>;
}

interface HistoryResponse {
  ok: boolean;
  betCount: number;
  current: Record<string, number>;
  series: HistoryPoint[];
}

interface MarketOddsHeaderProps {
  question: CrowdWisdomQuestion;
}

const CHART_W = 280;
const CHART_H = 56;

function buildPolyline(series: HistoryPoint[], choiceId: string): string {
  if (series.length === 0) return '';
  const stepX = series.length > 1 ? CHART_W / (series.length - 1) : CHART_W;
  return series
    .map((p, i) => {
      const prob = p.probs[choiceId] ?? 50;
      const x = series.length > 1 ? i * stepX : CHART_W / 2;
      const y = CHART_H - (prob / 100) * CHART_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function MarketOddsHeader({ question }: MarketOddsHeaderProps): React.ReactElement | null {
  const [data, setData] = useState<HistoryResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = getApiBase();
        const choices = question.choices.map((c) => c.id).join(',');
        const res = await fetch(
          `${base}/api/crowd-bets/history?questionId=${encodeURIComponent(question.id)}&choices=${encodeURIComponent(choices)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as HistoryResponse;
        if (!cancelled && json.ok) setData(json);
      } catch {
        /* market view is optional — hide when offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question.id]);

  if (!data) return null;

  // Leading choice = the market's "price".
  const entries = question.choices.map((c) => ({
    choice: c,
    prob: data.current[c.id] ?? 0,
  }));
  const leader = [...entries].sort((a, b) => b.prob - a.prob)[0];
  if (!leader) return null;

  const opening = data.series[0]?.probs[leader.choice.id] ?? 50;
  const delta = parseFloat((leader.prob - opening).toFixed(1));

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap}>
      {/* Price line */}
      <View style={styles.priceRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaderLabel} numberOfLines={1}>
            {leader.choice.glyph ? `${leader.choice.glyph} ` : ''}{leader.choice.label}
          </Text>
          <Text style={styles.marketMeta}>
            {data.betCount > 0 ? `שוק חי · ${data.betCount} הימורים` : 'שוק חדש — עוד אין הימורים'}
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={[styles.priceText, { color: leader.choice.accentColor }]}>
            {Math.round(leader.prob)}%
          </Text>
          {data.betCount > 0 && delta !== 0 && (
            <Text style={[styles.deltaText, { color: delta > 0 ? '#15803d' : '#b91c1c' }]}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
            </Text>
          )}
        </View>
      </View>

      {/* Probability-over-time chart */}
      <View style={styles.chartWrap}>
        <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
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
          <Polyline
            points={buildPolyline(data.series, leader.choice.id)}
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

      {/* All-choice price chips */}
      <View style={styles.chipsRow}>
        {entries.map(({ choice, prob }) => (
          <View key={choice.id} style={[styles.chip, { borderColor: `${choice.accentColor}55` }]}>
            <Text style={[styles.chipProb, { color: choice.accentColor }]}>{Math.round(prob)}%</Text>
            <Text style={styles.chipLabel} numberOfLines={1}>
              {choice.label}
            </Text>
          </View>
        ))}
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
    gap: 10,
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
  chipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: 150,
  },
  chipProb: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
});
