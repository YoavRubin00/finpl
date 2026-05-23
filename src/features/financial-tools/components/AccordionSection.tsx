import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

interface AccordionSectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  count,
  defaultOpen = false,
  children,
}: AccordionSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const chevron = useSharedValue(defaultOpen ? 1 : 0);

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
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        hitSlop={6}
      >
        <View style={styles.headerRight}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.countChip}>
            <Text style={styles.countText}>{count} כלים</Text>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={22} color={STITCH.onSurfaceVariant} strokeWidth={2.6} />
        </Animated.View>
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
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerPressed: {
    opacity: 0.85,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  countChip: {
    backgroundColor: STITCH.surfaceLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  body: {
    gap: 12,
  },
});
