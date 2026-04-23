import { View, Text, Pressable, Modal, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import type { TradableAsset } from './tradingHubTypes';
import { CALM } from '../../constants/theme';
import { StockIcon } from './StockIcon';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const TYPE_LABELS: Record<TradableAsset['type'], string> = {
  stock: 'מניה',
  index: 'מדד',
  commodity: 'סחורה',
  crypto: 'קריפטו',
};

const TYPE_COLORS: Record<TradableAsset['type'], string> = {
  stock: '#3b82f6',
  index: '#8b5cf6',
  commodity: '#eab308',
  crypto: '#f97316',
};

interface AssetInfoSheetProps {
  visible: boolean;
  asset: TradableAsset | null;
  onClose: () => void;
}

export function AssetInfoSheet({ visible, asset, onClose }: AssetInfoSheetProps) {
  if (!asset) return null;

  const typeColor = TYPE_COLORS[asset.type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: Dimensions.get('window').height * 0.85 }]} onPress={() => {}}>
          {/* Close button — right side for RTL */}
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={18} color={CALM.textSecondary} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 8 }}>
          <Animated.View entering={FadeInDown.duration(350)}>
            {/* Asset icon */}
            <View style={styles.iconRow}>
              <View style={[styles.iconCircle, { borderColor: typeColor + '30' }]}>
                <StockIcon assetId={asset.id} size={56} />
              </View>
            </View>

            {/* Name + ticker */}
            <Text style={styles.assetName}>{asset.name}</Text>
            <Text style={styles.ticker}>{asset.id}</Text>

            {/* Type badge */}
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { borderColor: typeColor + '40', backgroundColor: typeColor + '12' }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {TYPE_LABELS[asset.type]}
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionTitle}>מה זה?</Text>
              <Text style={styles.descriptionText}>{asset.descriptionHebrew}</Text>
            </View>

            {/* Close CTA */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeCtaBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.closeCtaText}>הבנתי, בואו נסחר!</Text>
            </Pressable>
          </Animated.View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: CALM.surface,
    borderWidth: 1,
    borderColor: CALM.border,
    padding: 24,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CALM.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CALM.surfaceMuted,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetName: {
    fontSize: 22,
    fontWeight: '900',
    color: CALM.textPrimary,
    textAlign: 'center',
  },
  ticker: {
    fontSize: 13,
    fontWeight: '700',
    color: CALM.textTertiary,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 1,
  },
  badgeRow: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionCard: {
    backgroundColor: CALM.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CALM.border,
    padding: 18,
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: CALM.accent,
    marginBottom: 8,
    ...RTL,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: CALM.textSecondary,
    ...RTL,
  },
  closeCtaBtn: {
    borderRadius: 16,
    backgroundColor: CALM.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCtaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
