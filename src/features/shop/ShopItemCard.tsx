import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
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
  effectiveCoinCost?: number;
}

export const ShopItemCard = React.memo(function ShopItemCard({ item, canAfford, onBuyPress, isEquipped, isOwned, effectiveCoinCost }: ShopItemCardProps) {
  const isGemItem = (item.gemCost ?? 0) > 0;
  const hasProDiscount = !isGemItem && effectiveCoinCost !== undefined && effectiveCoinCost < item.coinCost;
  const iconBg = getCategoryTint(item.category);

  return (
    <View style={styles.card}>
      {/* Icon */}
      <View style={[styles.iconBox, { backgroundColor: iconBg, overflow: 'hidden' }]}>
        {item.imageUrl ? (
          <View style={{ width: 76, height: 76, borderRadius: 38, overflow: 'hidden' }}>
            <ExpoImage
              source={{ uri: item.imageUrl }}
              style={{ width: 76 * 1.1, height: 76 * 1.1, marginLeft: -(76 * 0.05), marginTop: -(76 * 0.05) }}
              contentFit="cover"
              accessibilityLabel={item.name}
            />
          </View>
        ) : item.lottieSource ? (
          <LottieIcon source={item.lottieSource} size={48} />
        ) : (
          <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name}>{item.name}</Text>

      {/* Description */}
      <Text style={styles.description}>{item.description}</Text>

      {/* Buy button, green with gold coin (like Asset Arena) */}
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
          style={[styles.priceBuyBtn, !canAfford && { opacity: 0.45 }]}
        >
          {hasProDiscount && (
            <Text style={styles.priceBuyStrike}>{item.coinCost.toLocaleString()}</Text>
          )}
          <Text style={styles.priceBuyText}>
            {isGemItem
              ? `${item.gemCost}`
              : `${(effectiveCoinCost ?? item.coinCost).toLocaleString()}`}
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
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 16,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 5,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 10,
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
  priceBuyStrike: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'line-through' as const,
    fontVariant: ['tabular-nums'] as const,
  },
});
