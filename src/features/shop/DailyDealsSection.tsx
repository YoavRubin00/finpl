import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { useRouter } from 'expo-router';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { generateDailyDeals } from './dailyDeals';
import { ConfirmModal } from './ConfirmModal';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { successHaptic } from '../../utils/haptics';
import type { DailyDeal } from './types';

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DailyDealsSection() {
  const router = useRouter();
  const spendCoins = useEconomyStore((s) => s.spendCoins);
  const spendGems = useEconomyStore((s) => s.spendGems);
  const isPro = useSubscriptionStore((s) => s.isPro());
  const [dateKey, setDateKey] = useState(getTodayISO);
  const [remaining, setRemaining] = useState(msUntilMidnight);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [pendingDeal, setPendingDeal] = useState<DailyDeal | null>(null);

  const deals = useMemo(() => generateDailyDeals(dateKey), [dateKey]);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      const ms = msUntilMidnight();
      setRemaining(ms);
      const today = getTodayISO();
      if (today !== dateKey) {
        setDateKey(today);
        setPurchasedIds(new Set());
      }
    }, 1000);
    return () => clearInterval(id);
  }, [dateKey]);

  const addGems = useEconomyStore((s) => s.addGems);

  const handleClaimFreeGems = useCallback(() => {
    addGems(5);
    successHaptic();
  }, [addGems]);

  const handleConfirm = useCallback(() => {
    if (!pendingDeal) return;
    const isGem = pendingDeal.currency === 'gems';
    const ok = isGem
      ? spendGems(pendingDeal.discountedCost)
      : spendCoins(pendingDeal.discountedCost);

    if (!ok) {
      setPendingDeal(null);
      Alert.alert(
        isGem ? 'אין מספיק ג\'מים' : 'אין מספיק מטבעות',
        isGem
          ? 'אפשר לרכוש ג\'מים בחנות 💎'
          : 'אפשר לרכוש זהב בחנות ₪',
      );
      return;
    }

    const itemId = pendingDeal.item.id;
    if (itemId === 'heart-refill-full') {
      useSubscriptionStore.getState().restoreAllHearts();
    } else if (itemId === 'heart-refill-1') {
      const s = useSubscriptionStore.getState();
      if (s.hearts < 4) useSubscriptionStore.setState({ hearts: s.hearts + 1 });
    }

    successHaptic();
    setPurchasedIds((prev) => new Set(prev).add(pendingDeal.id));
    setPendingDeal(null);
  }, [pendingDeal, spendCoins, spendGems]);

  return (
    <View>
      {/* Countdown */}
      <Text style={styles.countdown}>מתחדש בעוד {formatCountdown(remaining)}</Text>

      {/* 2x2 grid */}
      <View style={styles.grid}>
        {deals.map((deal) => {
          const purchased = purchasedIds.has(deal.id);
          const isGem = deal.currency === 'gems';
          const isFreeGems = deal.item.id === 'free-daily-gems';

          return (
            <View key={deal.id} style={[styles.card, isFreeGems && styles.freeGemsCard]}>
              {/* Discount badge */}
              <View style={[styles.discountBadge, isFreeGems && styles.freeGemsBadge]}>
                <Text style={styles.discountText}>{isFreeGems ? 'חינם!' : `-${deal.discountPercent}%`}</Text>
              </View>

              {/* Item icon */}
              {deal.item.imageUrl ? (
                <ExpoImage
                  source={{ uri: deal.item.imageUrl }}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                  contentFit="cover"
                />
              ) : deal.item.lottieSource ? (
                <LottieIcon source={deal.item.lottieSource} size={40} />
              ) : (
                <Text style={styles.emoji}>{deal.item.emoji}</Text>
              )}

              {/* Name */}
              <Text style={[styles.itemName, isFreeGems && styles.freeGemsName]} numberOfLines={1}>{deal.item.name}</Text>

              {/* Price display for gem deals only (shown above PRO button) */}
              {!isFreeGems && !purchased && isGem && (
                <View style={styles.priceBlock}>
                  <Text style={styles.originalPrice}>{deal.originalCost.toLocaleString()}</Text>
                  <Text style={styles.discountedPrice}>💎 {deal.discountedCost}</Text>
                </View>
              )}

              {/* Buy / Purchased / PRO / Free */}
              {purchased ? (
                <View style={styles.purchasedBtn}>
                  <Text style={styles.purchasedText}>{isFreeGems ? 'נאסף ✓' : 'נרכש ✓'}</Text>
                </View>
              ) : isFreeGems ? (
                <Pressable
                  onPress={() => {
                    handleClaimFreeGems();
                    setPurchasedIds((prev) => new Set(prev).add(deal.id));
                  }}
                  style={({ pressed }) => [styles.freeClaimBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                  accessibilityRole="button"
                  accessibilityLabel="אסוף 5 יהלומים חינם"
                >
                  <Text style={styles.freeClaimText}>💎 אסוף 5</Text>
                </Pressable>
              ) : isGem && !isPro ? (
                <Pressable
                  onPress={() => router.push('/pricing' as never)}
                  style={({ pressed }) => [styles.proBadgeBtn, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel="שדרג ל-PRO"
                >
                  <Text style={styles.proBadgeText}>PRO ✦</Text>
                </Pressable>
              ) : isGem && isPro ? (
                <View style={styles.proIncludedBtn}>
                  <Text style={styles.proIncludedText}>כלול ב-PRO ✓</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => setPendingDeal(deal)}
                  style={({ pressed }) => [styles.priceBuyBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                  accessibilityRole="button"
                  accessibilityLabel={`קנה ${deal.item.name} ב-${deal.discountedCost.toLocaleString()} מטבעות`}
                >
                  <Text style={styles.originalPriceBtn}>{deal.originalCost.toLocaleString()}</Text>
                  <View style={styles.discountedRow}>
                    <GoldCoinIcon size={16} />
                    <Text style={styles.discountedPriceBtn}>{deal.discountedCost.toLocaleString()}</Text>
                  </View>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {pendingDeal !== null && (
        <ConfirmModal
          visible
          itemName={pendingDeal.item.name}
          coinCost={pendingDeal.currency === 'coins' ? pendingDeal.discountedCost : 0}
          gemCost={pendingDeal.currency === 'gems' ? pendingDeal.discountedCost : undefined}
          onConfirm={handleConfirm}
          onCancel={() => setPendingDeal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: {
    fontSize: 12,
    color: '#0891b2',
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48.5%' as unknown as number,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  emoji: {
    fontSize: 32,
    marginTop: 8,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 6,
  },
  priceBlock: {
    alignItems: 'center',
    marginBottom: 6,
    gap: 2,
  },
  originalPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountedPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#d97706',
  },
  priceBuyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    width: '100%',
    borderBottomWidth: 3,
    borderBottomColor: '#0e7490',
    shadowColor: '#0891b2',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    gap: 2,
  },
  originalPriceBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'line-through',
  },
  discountedPriceBtn: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fbbf24',
  },
  purchasedBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  purchasedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    writingDirection: 'rtl' as const,
  },
  proBadgeBtn: {
    backgroundColor: '#0891b2',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  proBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  proIncludedBtn: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  proIncludedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891b2',
    writingDirection: 'rtl' as const,
  },
  freeGemsCard: {
    borderColor: '#0891b2',
    borderWidth: 2,
    backgroundColor: '#ecfeff',
  },
  freeGemsBadge: {
    backgroundColor: '#0891b2',
  },
  freeGemsName: {
    color: '#0891b2',
  },
  freeGemsAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0891b2',
  },
  freeClaimBtn: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0891b2',
    borderBottomWidth: 3,
    borderBottomColor: '#0369a1',
    shadowColor: '#0891b2',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  freeClaimText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0369a1',
    writingDirection: 'rtl' as const,
  },
});
