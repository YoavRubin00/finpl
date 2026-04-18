import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { LiquidButton } from '../../../../components/ui/LiquidButton';

interface Props {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/**
 * Feed-screen primary CTA. Wraps the same <LiquidButton> used by the
 * learning-screen "המשך" button so the feed CTAs feel identical to lessons:
 * solid blue-500 body, 3px blue-700 bottom border for 3D depth, white liquid
 * ripple on press, and — critically — label/icon vertically centered on
 * Android via LiquidButton's `alignItems: 'center'` content wrapper.
 */
export function FeedStartButton({ label, onPress, accessibilityLabel, disabled = false }: Props) {
  return (
    <View style={styles.wrap}>
      <LiquidButton
        onPress={onPress}
        color="#3b82f6"
        disabled={disabled}
        style={styles.btn}
      >
        <Text
          style={styles.label}
          numberOfLines={1}
          allowFontScaling={false}
          accessibilityLabel={accessibilityLabel ?? label}
        >
          {label}
        </Text>
        <Play size={20} color="#ffffff" fill="#ffffff" />
      </LiquidButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 14,
    marginBottom: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#1d4ed8',
  },
  label: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    writingDirection: 'rtl',
    textAlign: 'center',
    includeFontPadding: false,
  },
});