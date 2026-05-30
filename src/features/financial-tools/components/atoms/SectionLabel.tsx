import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { STITCH } from '../../../../constants/theme';
import { tapHaptic } from '../../../../utils/haptics';

interface SectionLabelProps {
  children: string;
  /** Optional action label rendered on the left side. */
  action?: string;
  /** Called when the action is pressed. */
  onActionPress?: () => void;
}

/**
 * Uppercase section caption — used to break tool screens into "what you give"
 * vs "what you get" zones. Optional small action button on the left
 * (e.g. "ערוך", "כל הכלים").
 */
export function SectionLabel({
  children,
  action,
  onActionPress,
}: SectionLabelProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{children}</Text>
      {action ? (
        <Pressable
          onPress={() => {
            tapHaptic();
            onActionPress?.();
          }}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
        >
          <Text style={styles.actionText}>{action}</Text>
          <ChevronLeft size={14} color={STITCH.primary} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.6,
    writingDirection: 'rtl',
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    color: STITCH.primary,
    writingDirection: 'rtl',
  },
});
