import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { tapHaptic } from '../../../../utils/haptics';

type CalcVariant = 'green' | 'orange' | 'blue' | 'red' | 'gold' | 'purple' | 'indigo' | 'pink';

interface CalculateButtonProps {
  label: string;
  /** Optional second line (smaller, dimmer). */
  sublabel?: string;
  onPress: () => void;
  variant?: CalcVariant;
  disabled?: boolean;
  /** Override the default `<Sparkles />` icon. */
  iconLeft?: React.ReactNode;
  accessibilityLabel?: string;
}

/**
 * Premium Duolingo-style CTA — flat color + 3px bottom-border shadow,
 * presses with spring scale + haptic. Wraps the Stitch hub's
 * "duo" button language used elsewhere via `SupercellButton`.
 *
 * Variants extend the base SupercellButton palette with `purple`, `indigo`,
 * `pink` for tool-specific accents.
 */
export function CalculateButton({
  label,
  sublabel,
  onPress,
  variant = 'green',
  disabled = false,
  iconLeft,
  accessibilityLabel,
}: CalculateButtonProps): React.ReactElement {
  const scale = useSharedValue(1);
  const colors = VARIANT_COLORS[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    tapHaptic();
    onPress();
  };

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 280 });
        }}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={[
          styles.btn,
          { backgroundColor: colors.bg, borderBottomColor: colors.shadow },
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.iconWrap}>
          {iconLeft ?? <Sparkles size={18} color="#ffffff" strokeWidth={2.6} />}
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{label}</Text>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </View>
        <ChevronLeft size={20} color="#ffffff" strokeWidth={2.8} />
      </Pressable>
    </Animated.View>
  );
}

const VARIANT_COLORS: Record<CalcVariant, { bg: string; shadow: string }> = {
  green:  { bg: '#22c55e', shadow: '#15803d' },
  orange: { bg: '#fb923c', shadow: '#c2410c' },
  blue:   { bg: '#005bb1', shadow: '#003a73' },
  red:    { bg: '#ef4444', shadow: '#b91c1c' },
  gold:   { bg: '#e9c400', shadow: '#a16207' },
  purple: { bg: '#7c3aed', shadow: '#4c1d95' },
  indigo: { bg: '#6366f1', shadow: '#3730a3' },
  pink:   { bg: '#ec4899', shadow: '#9d174d' },
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomWidth: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sublabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 1,
  },
});
