/**
 * AchievementPill — 6 semantic state variants for badges across the app.
 *
 * Source: `assets/DESIGN/Design System_files/badges.jsx`. Converted to RN.
 *
 * Variants:
 *   • streak  — orange flame, "{count} ימים"
 *   • pro     — gold crown, "PRO"
 *   • new     — green sparkle, "חדש"
 *   • locked  — grey lock, "נעול"
 *   • elite   — purple gem, "ELITE"
 *   • chapter — blue book, "פרק {count}"
 *
 * Usage:
 *   <AchievementPill kind="pro" />
 *   <AchievementPill kind="streak" count={47} />
 *   <AchievementPill kind="chapter" count={3} />
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Lock } from 'lucide-react-native';

export type AchievementPillKind = 'streak' | 'pro' | 'new' | 'locked' | 'elite' | 'chapter';

interface Props {
  kind: AchievementPillKind;
  /** For 'streak' (days) and 'chapter' (number). Ignored otherwise. */
  count?: number;
}

interface VariantConfig {
  bgColors: readonly [string, string];   // gradient stops
  borderColor: string;
  textColor: string;
  labelFor: (count?: number) => string;
  icon?: 'crown' | 'lock' | 'flame' | 'sparkle' | 'gem' | 'book';
  hasShadow?: boolean;
}

const VARIANTS: Record<AchievementPillKind, VariantConfig> = {
  streak: {
    bgColors: ['#fed7aa', '#fdba74'],
    borderColor: '#f97316',
    textColor: '#9a3412',
    labelFor: (count) => `${count ?? 0} ימים`,
    icon: 'flame',
  },
  pro: {
    bgColors: ['#facc15', '#f59e0b'],
    borderColor: '#ca8a04',
    textColor: '#1a1035',
    labelFor: () => 'PRO',
    icon: 'crown',
    hasShadow: true,
  },
  new: {
    bgColors: ['#dcfce7', '#dcfce7'],   // solid green-tint (gradient stops same)
    borderColor: '#16a34a',
    textColor: '#14532d',
    labelFor: () => 'חדש',
    icon: 'sparkle',
  },
  locked: {
    bgColors: ['#f2f4f6', '#f2f4f6'],
    borderColor: '#c0c7d4',
    textColor: '#707783',
    labelFor: () => 'נעול',
    icon: 'lock',
  },
  elite: {
    bgColors: ['#a78bfa', '#7c3aed'],
    borderColor: '#5b21b6',
    textColor: '#ffffff',
    labelFor: () => 'ELITE',
    icon: 'gem',
    hasShadow: true,
  },
  chapter: {
    bgColors: ['#93c5fd', '#3b82f6'],
    borderColor: '#1d4ed8',
    textColor: '#ffffff',
    labelFor: (count) => `פרק ${count ?? 0}`,
    icon: 'book',
  },
};

function IconForVariant({ icon, color }: { icon: VariantConfig['icon']; color: string }) {
  if (icon === 'crown') return <Crown size={12} color={color} />;
  if (icon === 'lock') return <Lock size={11} color={color} />;
  // Emoji-as-icon for the rest — they render reliably across iOS/Android and
  // match the source design exactly (the source used emoji too).
  if (icon === 'flame') return <Text style={[styles.emojiIcon, { color }]}>🔥</Text>;
  if (icon === 'sparkle') return <Text style={[styles.emojiIcon, { color }]}>✨</Text>;
  if (icon === 'gem') return <Text style={[styles.emojiIcon, { color }]}>💎</Text>;
  if (icon === 'book') return <Text style={[styles.emojiIcon, { color }]}>📘</Text>;
  return null;
}

export function AchievementPill({ kind, count }: Props) {
  const v = VARIANTS[kind];
  const label = v.labelFor(count);
  const isGradient = v.bgColors[0] !== v.bgColors[1];

  const PillBody = (
    <View style={[
      styles.pill,
      { borderColor: v.borderColor },
      v.hasShadow && styles.shadow,
    ]}>
      <IconForVariant icon={v.icon} color={v.textColor} />
      <Text
        style={[
          styles.label,
          { color: v.textColor },
          (kind === 'pro' || kind === 'elite') && styles.labelTracking,
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );

  // Use gradient when we have a 2-color spec; solid wrapper otherwise.
  if (isGradient) {
    return (
      <LinearGradient
        colors={v.bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pillWrap, v.hasShadow && styles.shadow]}
      >
        <View style={[styles.pill, { borderColor: v.borderColor }]}>
          <IconForVariant icon={v.icon} color={v.textColor} />
          <Text
            style={[
              styles.label,
              { color: v.textColor },
              (kind === 'pro' || kind === 'elite') && styles.labelTracking,
            ]}
            allowFontScaling={false}
          >
            {label}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.pillWrap, { backgroundColor: v.bgColors[0] }]}>
      {PillBody}
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  emojiIcon: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'] as const,
  },
  labelTracking: {
    letterSpacing: 0.6,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
