import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { getShopSvgIcon } from '../../components/svg/shop/ShopIcons';
import { getAvatarSvgIcon } from '../../components/svg/avatars/AvatarMascots';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

const DIAMOND_LOTTIE = require('../../../assets/lottie/Diamond.json');
import type { ShopItem } from './types';

// Optional tier ribbon shown at the top-right (RTL) of premium-tier items.
// Returns label + colors, or null for plain items. Mirrors Brawl Stars / Coin
// Master "rare/epic/legendary" pill above the icon.
function getTierLabel(itemId: string): { label: string; bg: string; border: string; text: string } | null {
  switch (itemId) {
    case 'boost-mega-1h':
    case 'streak-revival-elite':
    case 'boost-weekend':
    case 'avatar-strategist':
    case 'avatar-explorer':
    case 'avatar-defender':
      return { label: 'אגדי', bg: '#0c4a6e', border: '#22d3ee', text: '#67e8f9' };
    case 'streak-shield-month':
    case 'heart-refill-full':
      return { label: 'מומלץ', bg: '#075985', border: '#0ea5e9', text: '#bae6fd' };
    case 'streak-shield-week':
    case 'boost-xp-2x-1h':
    case 'boost-coins-2x-1h':
      return { label: 'חדש', bg: '#134e4a', border: '#22d3ee', text: '#a7f3d0' };
    default:
      return null;
  }
}

// Duration / scope label shown on the bottom-right of the card. Returns null
// for instant-use items (heart refill, hint, freeze).
function getDurationLabel(itemId: string): string | null {
  switch (itemId) {
    case 'boost-xp-2x-1h':
    case 'boost-coins-2x-1h':
    case 'boost-mega-1h':
      return '1:00';
    case 'boost-weekend':
      return 'סופ״ש';
    case 'streak-shield-week':
      return '7 ימים';
    case 'streak-shield-month':
      return '30 ימים';
    case 'streak-revival-elite':
      return 'חד-פעמי';
    default:
      return null;
  }
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
  const tier = getTierLabel(item.id);
  const duration = getDurationLabel(item.id);

  return (
    <View style={styles.cardWrap}>
      {/* Dark navy gradient card — matches Mega Boost design system */}
      <LinearGradient
        colors={['#0e3a5f', '#0a1f38', '#081827']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.card}
      >
        {/* Top tier ribbon (RTL: anchored to top-right) */}
        {tier && (
          <View style={[styles.ribbon, { backgroundColor: tier.bg, borderColor: tier.border }]}>
            <Text style={[styles.ribbonText, { color: tier.text }]} allowFontScaling={false}>
              {tier.label}
            </Text>
          </View>
        )}

        {/* Centered icon */}
        <View style={styles.iconBox}>
          {item.imageUrl ? (
            <View style={{ width: 88, height: 88, borderRadius: 44, overflow: 'hidden' }}>
              <ExpoImage
                source={{ uri: item.imageUrl }}
                style={{ width: 88 * 1.1, height: 88 * 1.1, marginLeft: -(88 * 0.05), marginTop: -(88 * 0.05) }}
                contentFit="cover"
                accessibilityLabel={item.name}
              />
            </View>
          ) : (() => {
            // Render priority for the icon slot:
            //   1. Avatar mascot SVG (10 Pip variants for category='avatars')
            //   2. Shop item SVG (boosts/shields/hearts/hints/freezes)
            //   3. Lottie (animated fallback)
            //   4. Emoji (last resort, never hits for items we ship SVGs for)
            const AvatarIcon = getAvatarSvgIcon(item.id);
            if (AvatarIcon) return <AvatarIcon size={88} />;
            const SvgIcon = getShopSvgIcon(item.id);
            if (SvgIcon) return <SvgIcon size={72} />;
            if (item.lottieSource) return <LottieIcon source={item.lottieSource} size={64} />;
            return <Text style={{ fontSize: 48 }}>{item.emoji}</Text>;
          })()}
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={1} allowFontScaling={false}>
          {item.name}
        </Text>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Bottom row: price pill + duration chip */}
        <View style={styles.bottomRow}>
          {isEquipped ? (
            <View style={styles.equippedBtn}>
              <Text style={styles.equippedText}>✓ מצויד</Text>
            </View>
          ) : isOwned ? (
            <AnimatedPressable onPress={onBuyPress} style={styles.ownedBtn}>
              <Text style={styles.ownedText}>החלף</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              onPress={canAfford ? onBuyPress : undefined}
              disabled={!canAfford}
              style={[styles.pricePill, !canAfford && { opacity: 0.5 }]}
            >
              {hasProDiscount && (
                <Text style={styles.priceStrike}>{item.coinCost.toLocaleString()}</Text>
              )}
              <Text style={styles.priceText} allowFontScaling={false}>
                {isGemItem
                  ? `${item.gemCost}`
                  : `${(effectiveCoinCost ?? item.coinCost).toLocaleString()}`}
              </Text>
              {isGemItem ? (
                <LottieIcon source={DIAMOND_LOTTIE} size={28} />
              ) : (
                <GoldCoinIcon size={20} />
              )}
            </AnimatedPressable>
          )}

          {/* Duration chip — only for time-bound items */}
          {duration && !isEquipped && !isOwned && (
            <View style={styles.durationChip}>
              <Text style={styles.durationText} allowFontScaling={false}>{duration}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.18)',
    paddingTop: 32,
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center' as const,
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 8,
    insetInlineEnd: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    writingDirection: 'rtl' as const,
  },
  iconBox: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fef3c7',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 11,
    lineHeight: 16,
    color: '#94a8c2',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 12,
    minHeight: 32,
  },
  bottomRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pricePill: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#14532d',
    borderWidth: 1,
    borderColor: '#22c55e',
    shadowColor: '#16a34a',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: 0.2,
  },
  priceStrike: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'line-through' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 41, 70, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148, 168, 194, 0.25)',
    minWidth: 56,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    fontVariant: ['tabular-nums'] as const,
  },
  equippedBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    paddingVertical: 10,
  },
  equippedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#86efac',
  },
  ownedBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(148, 168, 194, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(148, 168, 194, 0.4)',
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    writingDirection: 'rtl' as const,
  },
});
