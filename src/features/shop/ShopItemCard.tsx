import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

const DIAMOND_LOTTIE = require('../../../assets/lottie/Diamond.json');
import type { ShopItem, ShopCategory } from './types';

const CATEGORY_ACCENTS: Record<ShopCategory, string> = {
  hearts: '#ef4444',
  hints: '#f59e0b',
  protection: '#0891b2',
  cosmetics: '#0891b2',
  premium: '#0891b2',
  avatars: '#ec4899',
};

function getCategoryTint(category: ShopCategory): string {
  const hex = CATEGORY_ACCENTS[category];
  return `${hex}18`;
}

interface ShopItemCardProps {
  item: ShopItem;
  canAfford: boolean;
  onBuyPress: () => void;
  isEquipped?: boolean;
  isOwned?: boolean;
}

export const ShopItemCard = React.memo(function ShopItemCard({ item, canAfford, onBuyPress, isEquipped, isOwned }: ShopItemCardProps) {
  const isGemItem = (item.gemCost ?? 0) > 0;
  const iconBg = getCategoryTint(item.category);

  return (
    <View style={styles.card}>
      {/* Icon */}
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {item.lottieSource ? (
          <LottieIcon source={item.lottieSource} size={36} />
        ) : (
          <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      {/* Buy button — green with gold coin (like Asset Arena) */}
      {isEquipped ? (
        <View style={styles.equippedBtn}>
          <Text style={styles.equippedText}>✓ מצויד</Text>
        </View>
      ) : isOwned ? (
        <AnimatedPressable
          onPress={onBuyPress}
          style={styles.ownedBtn}
        >
          <Text style={styles.ownedText}>החלף</Text>
        </AnimatedPressable>
      ) : (
        <AnimatedPressable
          onPress={canAfford ? onBuyPress : undefined}
          disabled={!canAfford}
          style={[
            styles.priceBuyBtn,
            !canAfford && { opacity: 0.45 },
          ]}
        >
          <Text style={styles.priceBuyText}>
            {isGemItem
              ? `${item.gemCost}`
              : `${item.coinCost.toLocaleString()}`}
          </Text>
          {isGemItem ? (
            <LottieIcon source={DIAMOND_LOTTIE} size={20} />
          ) : (
            <GoldCoinIcon size={16} />
          )}
        </AnimatedPressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 14,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6b7280',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 8,
    minHeight: 32,
  },
  equippedBtn: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    paddingVertical: 8,
  },
  equippedText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16a34a',
  },
  ownedBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    writingDirection: 'rtl' as const,
  },
  priceBuyBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#1e3a8a',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  priceBuyText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    fontVariant: ['tabular-nums'] as const,
  },
});
