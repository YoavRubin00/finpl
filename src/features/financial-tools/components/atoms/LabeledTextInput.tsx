import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { STITCH } from '../../../../constants/theme';

interface LabeledTextInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Sets minimum visible rows for multiline. */
  rows?: number;
  /** Max characters; trimmed on input. */
  maxLength?: number;
  accentColor?: string;
  accessibilityLabel?: string;
}

/**
 * Stitch-style labeled text input. Hebrew RTL by default. Supports multiline
 * for notes/free-form descriptions. Use for `name`, `notes`, and other text
 * fields where `MoneyInput` and `PercentInput` don't fit.
 */
export function LabeledTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  rows = 3,
  maxLength,
  accentColor = STITCH.tertiaryGoldBright,
  accessibilityLabel,
}: LabeledTextInputProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && { minHeight: rows * 22, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel ?? label}
        selectionColor={accentColor}
      />
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
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  input: {
    fontSize: 15,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    padding: 0,
    minHeight: 24,
  },
});
