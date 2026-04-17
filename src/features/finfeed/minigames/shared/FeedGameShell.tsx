import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInUp, useReducedMotion } from 'react-native-reanimated';
import { GoldCoinIcon } from '../../../../components/ui/GoldCoinIcon';

export type FeedGameAccent = 'blue' | 'purple' | 'amber' | 'rose' | 'dark';
export type FeedGameVariant = 'light' | 'dark';

interface Props {
  gameTitle: string;
  gameSubtitle?: string;
  xpReward: number;
  coinReward: number;
  accent?: FeedGameAccent;
  variant?: FeedGameVariant;
  children: React.ReactNode;
}

const ACCENT_MAP: Record<FeedGameAccent, { line: string; chipBg: string; chipBorder: string; chipText: string }> = {
  blue:   { line: '#0ea5e9', chipBg: 'rgba(14,165,233,0.12)',  chipBorder: 'rgba(14,165,233,0.28)',  chipText: '#075985' },
  purple: { line: '#8b5cf6', chipBg: 'rgba(139,92,246,0.12)',  chipBorder: 'rgba(139,92,246,0.28)',  chipText: '#5b21b6' },
  amber:  { line: '#f59e0b', chipBg: 'rgba(245,158,11,0.14)',  chipBorder: 'rgba(245,158,11,0.32)',  chipText: '#92400e' },
  rose:   { line: '#f43f5e', chipBg: 'rgba(244,63,94,0.12)',   chipBorder: 'rgba(244,63,94,0.28)',   chipText: '#9f1239' },
  dark:   { line: '#64748b', chipBg: 'rgba(100,116,139,0.12)', chipBorder: 'rgba(100,116,139,0.28)', chipText: '#1e293b' },
};

const VARIANT_MAP: Record<FeedGameVariant, { cardBg: string; titleColor: string; subtitleColor: string }> = {
  light: { cardBg: '#ffffff', titleColor: '#0f172a', subtitleColor: '#64748b' },
  dark:  { cardBg: '#0f172a', titleColor: '#f8fafc', subtitleColor: '#94a3b8' },
};

export function FeedGameShell({
  gameTitle,
  gameSubtitle,
  xpReward,
  coinReward,
  accent = 'blue',
  variant = 'light',
  children,
}: Props) {
  const reducedMotion = useReducedMotion();
  const a = ACCENT_MAP[accent];
  const v = VARIANT_MAP[variant];

  const entering = reducedMotion
    ? FadeIn.duration(220)
    : SlideInUp.springify().damping(18).stiffness(140);

  return (
    <View style={styles.outer}>
      <Text style={[styles.topTitle, { color: '#0f172a' }]} accessibilityRole="header">
        {gameTitle}
      </Text>

      <Animated.View
        entering={entering}
        style={[
          styles.card,
          {
            backgroundColor: v.cardBg,
            shadowColor: variant === 'dark' ? '#000' : '#0f172a',
          },
        ]}
      >
        <View style={[styles.accentLine, { backgroundColor: a.line }]} />

        <View style={styles.headerRow}>
          <View
            style={[styles.rewardChip, { backgroundColor: a.chipBg, borderColor: a.chipBorder }]}
            accessibilityLabel={`תגמול: ${xpReward} נקודות ניסיון ו-${coinReward} מטבעות`}
          >
            <Text style={[styles.rewardText, { color: a.chipText }]}>+{xpReward} XP</Text>
            <Text style={[styles.rewardDot, { color: a.chipText }]}>·</Text>
            <Text style={[styles.rewardText, { color: a.chipText }]}>+{coinReward}</Text>
            <GoldCoinIcon size={14} />
          </View>

          {gameSubtitle && (
            <Text style={[styles.subtitle, { color: v.subtitleColor }]} numberOfLines={1}>
              {gameSubtitle}
            </Text>
          )}
        </View>

        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingHorizontal: 4,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  rewardChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  rewardDot: {
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.55,
  },
  subtitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  body: {
    flex: 1,
  },
});
