import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, Lock, TrendingUp } from 'lucide-react-native';
import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { tapHaptic } from '../../../utils/haptics';
import {
  type Asset,
  TRACK_LABEL,
  effectiveReturnPct,
  findTypeMeta,
} from '../assetCatalog';

interface AssetRowProps {
  asset: Asset;
  onPress: (asset: Asset) => void;
}

/**
 * Single asset row in the net-worth list. Shows emoji + name + track + value
 * on the right (RTL), with a small projected-growth badge underneath. Tap
 * opens the edit modal pre-filled with this asset's data.
 */
function AssetRowInner({ asset, onPress }: AssetRowProps): React.ReactElement {
  const meta = findTypeMeta(asset.type);
  const returnPct = effectiveReturnPct(asset);
  const annualGrowth = (asset.value * returnPct) / 100;

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress(asset);
      }}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${asset.name}, ${formatShekel(asset.value)}`}
    >
      <View style={styles.iconTile}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.value} numberOfLines={1}>
            {formatShekel(asset.value)}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {asset.name}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {annualGrowth > 0 ? (
            <View style={styles.growthPill}>
              <TrendingUp size={10} color="#15803d" strokeWidth={2.6} />
              <Text style={styles.growthText}>
                +{formatShekel(annualGrowth)} · {returnPct.toFixed(1)}%
              </Text>
            </View>
          ) : (
            <View style={styles.growthPillFlat}>
              <Text style={styles.growthTextFlat}>ללא צמיחה צפויה</Text>
            </View>
          )}
          {!asset.liquid ? (
            <View style={styles.lockPill}>
              <Lock size={10} color={STITCH.onSurfaceVariant} strokeWidth={2.6} />
              <Text style={styles.lockText}>לא נזיל</Text>
            </View>
          ) : null}
          {asset.track && meta.hasTrack ? (
            <Text style={styles.trackText}>· {TRACK_LABEL[asset.track]}</Text>
          ) : null}
        </View>
      </View>

      <ChevronLeft size={18} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
    </Pressable>
  );
}

export const AssetRow = React.memo(AssetRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: STITCH.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  body: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.3,
    writingDirection: 'rtl',
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  growthPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  growthText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    writingDirection: 'rtl',
  },
  growthPillFlat: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: STITCH.surfaceLow,
  },
  growthTextFlat: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  lockPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: STITCH.surfaceLow,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  trackText: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
});
