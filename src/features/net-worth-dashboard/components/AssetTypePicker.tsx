import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { ASSET_TYPES, type AssetType } from '../assetCatalog';

interface AssetTypePickerProps {
  value: AssetType;
  onChange: (next: AssetType) => void;
}

/**
 * Grid of asset-type tiles. Compact 2-column layout for 10 types.
 * Shows emoji + label; selected tile gets accent border + pink-tinted bg.
 */
export function AssetTypePicker({
  value,
  onChange,
}: AssetTypePickerProps): React.ReactElement {
  return (
    <View style={styles.grid}>
      {ASSET_TYPES.map((meta) => {
        const selected = meta.key === value;
        return (
          <Pressable
            key={meta.key}
            onPress={() => {
              tapHaptic();
              onChange(meta.key);
            }}
            style={[styles.tile, selected && styles.tileSelected]}
            accessibilityRole="button"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected }}
          >
            <Text style={styles.emoji}>{meta.emoji}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const ACCENT = '#ec4899';

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 76,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: STITCH.surfaceLow,
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileSelected: {
    backgroundColor: '#fce7f3',
    borderColor: ACCENT,
  },
  emoji: { fontSize: 22 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  labelSelected: { color: ACCENT },
});
