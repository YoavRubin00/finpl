import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { STITCH } from '../../../../constants/theme';
import { tapHaptic } from '../../../../utils/haptics';

interface MoneyInputProps {
  label: string;
  /** Stored as string to bind cleanly to TextInput. */
  value: string;
  onChangeText: (v: string) => void;
  /** Optional placeholder when value is empty. */
  placeholder?: string;
  /** Optional helper hint under the input. */
  hint?: string;
  /** Accent for the ₪ suffix + stepper highlight. */
  accentColor?: string;
  /** Stepper increment. Defaults to 100. */
  step?: number;
  /** Min/max guard rails. Stepper won't go beyond. */
  min?: number;
  max?: number;
  /** Accessibility label override. */
  accessibilityLabel?: string;
}

/**
 * Stitch-style money input card. TextInput + ₪ suffix + +/- stepper. RTL.
 * Stepper buttons fire `tapHaptic` and respect optional min/max bounds.
 */
export function MoneyInput({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  accentColor = STITCH.tertiaryGoldBright,
  step = 100,
  min,
  max,
  accessibilityLabel,
}: MoneyInputProps): React.ReactElement {
  const numericValue = Number(value) || 0;

  const adjust = (delta: number) => {
    let next = numericValue + delta;
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    tapHaptic();
    onChangeText(String(next));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.valueWrap}>
          <Text style={[styles.suffix, { color: accentColor }]}>₪</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(v) => onChangeText(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            accessibilityLabel={accessibilityLabel ?? label}
          />
        </View>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => adjust(step)}
            style={styles.stepBtn}
            accessibilityRole="button"
            accessibilityLabel={`הוסף ${step}`}
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
          <Pressable
            onPress={() => adjust(-step)}
            style={styles.stepBtn}
            accessibilityRole="button"
            accessibilityLabel={`הפחת ${step}`}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
        </View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  valueWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
  },
  suffix: {
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: -0.5,
    padding: 0,
  },
  stepperRow: {
    flexDirection: 'row-reverse',
    gap: 4,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: STITCH.surfaceLow,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
  },
  hint: {
    fontSize: 10,
    color: STITCH.onSurfaceVariant,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
