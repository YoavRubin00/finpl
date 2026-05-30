import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

export type AccordionAccent = 'investor' | 'financial' | 'neutral';

interface AccentTokens {
  gradient: [string, string];
  border: string;
  title: string;
  countBg: string;
  countText: string;
  chevronBg: string;
  chevronStroke: string;
}

const ACCENTS: Record<AccordionAccent, AccentTokens> = {
  // Darker brand blue — for "כלים למשקיעים" (heavier, professional feel)
  investor: {
    gradient: ['#0f4c93', '#1f6cc1'],
    border: '#0b3f7d',
    title: '#ffffff',
    countBg: 'rgba(255,255,255,0.18)',
    countText: '#e6f0ff',
    chevronBg: 'rgba(255,255,255,0.18)',
    chevronStroke: '#ffffff',
  },
  // Lighter sky blue — for "כלים פיננסיים" (everyday, approachable)
  financial: {
    gradient: ['#e6f4fb', '#bfe1f1'],
    border: '#8fc7e1',
    title: '#053a5e',
    countBg: 'rgba(0,91,177,0.14)',
    countText: '#053a5e',
    chevronBg: 'rgba(0,91,177,0.12)',
    chevronStroke: '#053a5e',
  },
  neutral: {
    gradient: [STITCH.surfaceLowest, STITCH.surfaceLowest],
    border: STITCH.surfaceHighest,
    title: STITCH.onSurface,
    countBg: STITCH.surfaceLow,
    countText: STITCH.onSurfaceVariant,
    chevronBg: STITCH.surfaceLow,
    chevronStroke: STITCH.onSurfaceVariant,
  },
};

interface AccordionSectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  accent?: AccordionAccent;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  count,
  defaultOpen = false,
  accent = 'neutral',
  children,
}: AccordionSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const chevron = useSharedValue(defaultOpen ? 1 : 0);
  const tokens = ACCENTS[accent];

  useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [chevron, open]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  const handleToggle = useCallback(() => {
    tapHaptic();
    setOpen((prev) => !prev);
  }, []);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${count} כלים`}
        hitSlop={6}
        style={({ pressed }) => [styles.headerOuter, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={tokens.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { borderColor: tokens.border }]}
        >
          <View style={styles.headerRight}>
            <Text style={[styles.title, { color: tokens.title }]}>{title}</Text>
            <View style={[styles.countChip, { backgroundColor: tokens.countBg }]}>
              <Text style={[styles.countText, { color: tokens.countText }]}>
                {count} כלים
              </Text>
            </View>
          </View>

          {/* Fixed-size circular anchor for the chevron so the icon never
              visually shifts between sections regardless of title length or
              accent variant. The rotation animates inside this anchor. */}
          <View style={[styles.chevronBadge, { backgroundColor: tokens.chevronBg }]}>
            <Animated.View style={chevronStyle}>
              <ChevronDown size={18} color={tokens.chevronStroke} strokeWidth={2.8} />
            </Animated.View>
          </View>
        </LinearGradient>
      </Pressable>

      {open ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  headerOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0b1735',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minHeight: 32, // Lock header row height so chevron badge stays vertically centered
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  countChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  chevronBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 12,
  },
});
