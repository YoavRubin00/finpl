import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, Text, Image, StyleSheet, Pressable, Alert, ImageSourcePropType } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  FadeInDown,
  ZoomIn,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useRouter } from 'expo-router';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { ShopItemCard } from './ShopItemCard';
import { ConfirmModal } from './ConfirmModal';
import { IAPModal } from './IAPModal';
import { SHOP_ITEMS, SHOP_CATEGORIES } from './shopItems';
import { GEM_BUNDLES } from './gemBundles';
// coinBundles removed, gold is bought via gem exchange only
import { DailyDealsSection } from './DailyDealsSection';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useTheme } from '../../hooks/useTheme';
import { ProBadge } from '../../components/ui/ProBadge';
import type { ShopCategory, ShopItem, GemBundle, CoinBundle } from './types';

type AnyBundle = GemBundle | CoinBundle;

// ── Section background themes ───────────────────────────────────────────────
const SECTION_COLORS = {
  deals:    { gradient: ['#e0f2fe', '#f0f9ff', '#e0f2fe'] as const, bottom: '#e0f2fe' },
  gems:     { gradient: ['#ecfeff', '#f0f9ff', '#ecfeff'] as const, bottom: '#ecfeff' },
  coins:    { gradient: ['#fffbeb', '#fef3c7', '#fffbeb'] as const, bottom: '#fffbeb' },
  exchange: { gradient: ['#ecfdf5', '#f0fdfa', '#ecfdf5'] as const, bottom: '#ecfdf5' },
  pro:      { gradient: ['#e0f2fe', '#f0f9ff', '#e0f2fe'] as const, bottom: '#e0f2fe' },
  items:    { gradient: ['#f8fafc', '#f0f9ff', '#f8fafc'] as const, bottom: '#f8fafc' },
} as const;

// ── Gem→Coin exchange rates ─────────────────────────────────────────────────
const GEM_EXCHANGE_RATES = [
  { gems: 50, coins: 1000 },
  { gems: 350, coins: 10000 },
  { gems: 2500, coins: 100000, best: true },
];

// ── Entrance stagger ────────────────────────────────────────────────────────
function useStaggerIn(delay: number) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 340 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 120 }));
  }, []);
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ── Pulse glow (enhanced) ───────────────────────────────────────────────────
const SHADOW_OFFSET = { width: 0, height: 4 } as const;

function usePulseGlow(color: string, active = true) {
  const glow = useSharedValue(0.3);
  useEffect(() => {
    if (active) {
      glow.value = withRepeat(
        withSequence(withTiming(1, { duration: 1100 }), withTiming(0.3, { duration: 1100 })),
        -1, true,
      );
    } else {
      cancelAnimation(glow);
      glow.value = 0.3;
    }
    return () => cancelAnimation(glow);
  }, [active]);
  return useAnimatedStyle(() => ({
    shadowColor: color,
    shadowOpacity: interpolate(glow.value, [0.3, 1], [0.4, 0.95]),
    shadowRadius: interpolate(glow.value, [0.3, 1], [10, 32]),
    shadowOffset: SHADOW_OFFSET,
    elevation: interpolate(glow.value, [0.3, 1], [8, 20]),
  }));
}

// ── Wooden Plank Section Header (Clash Royale style) ────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <LinearGradient
        colors={['#0891b2', '#0e7490', '#0891b2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.woodPlank}
      >
        {/* 3D top highlight */}
        <View style={styles.woodHighlight} />
        {/* Nails */}
        <View style={[styles.nail, { left: 10 }]} />
        <View style={[styles.nail, { right: 10 }]} />
        <Text style={styles.plankTitle}>{title}</Text>
      </LinearGradient>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ── Subliminal background Lottie (dimmed, subconscious) ─────────────────────
function SectionBgLottie({ source, active = true }: { source: string | number | Record<string, unknown>; active?: boolean }) {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (!lottieRef.current) return;
    if (active) { lottieRef.current.play(); } else { lottieRef.current.pause(); }
  }, [active]);

  return (
    <View style={styles.bgLottieWrap} pointerEvents="none" accessible={false}>
      <LottieView ref={lottieRef} source={source as string} style={styles.bgLottie} autoPlay={active} loop />
    </View>
  );
}

// ── Transition strip between sections ───────────────────────────────────────
function TransitionStrip({ from, to }: { from: string; to: string }) {
  return <LinearGradient colors={[from, to]} style={styles.transitionStrip} />;
}

// ── Diamond pattern overlay ─────────────────────────────────────────────────
function DiamondPattern() {
  return (
    <View style={styles.diamondGrid} pointerEvents="none" accessible={false}>
      {Array.from({ length: 42 }).map((_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: row * 50 - 12,
              left: col * 72 + (row % 2 === 0 ? 0 : 36) - 28,
              width: 34,
              height: 34,
              transform: [{ rotate: '45deg' }],
              borderWidth: 1.2,
              borderColor: 'rgba(8,145,178,0.08)',
              borderRadius: 3,
            }}
          />
        );
      })}
      {/* Top/bottom depth strips */}
      <LinearGradient
        colors={['rgba(8,145,178,0.06)', 'transparent']}
        style={styles.depthStripTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(8,145,178,0.04)']}
        style={styles.depthStripBottom}
        pointerEvents="none"
      />
    </View>
  );
}

// ── Category emoji map ──────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<ShopCategory, string> = {
  hearts: '❤️',
  hints: '💡',
  protection: '🛡️',
  boosts: '🚀',
  cosmetics: '✨',
  premium: '💎',
  avatars: '👤',
};

// ── Per-tier gem images (cropped from GEMS.jpg) ─────────────────────────────
const GEM_TIER_IMAGES: Record<string, ImageSourcePropType> = {
  'gems-fistful': { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gems/gem-80.png' },
  'gems-pouch':   { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gems/gem-500.png' },
  'gems-bucket':  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gems/gem-1200.png' },
  'gems-barrel':  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gems/gem-2500.png' },
  'gems-wagon':   { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gems/gem-6500.png' },
  'gems-spire':   { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gems/gem-14000.png' },
};

// ── Per-tier gold images (cropped from GOLD.jpg) ─────────────────────────────
const GOLD_TIER_IMAGES: ImageSourcePropType[] = [
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gold/gold-1000.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gold/gold-10000.png' },
  { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/gold/gold-100000.png' },
];

// ── Gem Bundle Card (GEMS.jpg style, 3 per row, icy blue) ──────────────────
function GemBundleCard({ bundle, onPress, index }: { bundle: GemBundle; onPress: () => void; index: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(150)} style={styles2.gemGridItem}>
      <AnimatedPressable
        onPress={() => { tapHaptic(); onPress(); }}
        style={[
          styles2.gemCard,
          bundle.isBestValue && { borderColor: '#22d3ee', borderWidth: 3 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${bundle.name}, ${bundle.priceLabel}`}
      >
        {/* Best value badge */}
        {bundle.isBestValue && (
          <LinearGradient colors={['#0891b2', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>הכי משתלם</Text>
          </LinearGradient>
        )}

        {/* Title */}
        <Text style={styles2.gemCardTitle}>{bundle.name}</Text>

        {/* Diamond icon */}
        <View style={styles2.gemImageArea}>
          <Image
            source={GEM_TIER_IMAGES[bundle.id] as number}
            style={{ width: 96, height: 96, borderRadius: 10 }}
            resizeMode="contain"
            accessible={false}
          />
        </View>

        {/* Bonus */}
        {bundle.bonusLabel && (
          <View style={styles2.gemBonusPill}>
            <Text style={styles2.gemBonusText}>{bundle.bonusLabel}</Text>
          </View>
        )}

        {/* Price button */}
        <LinearGradient
          colors={['#22d3ee', '#0891b2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles2.gemPriceBtn}
        >
          <Text style={styles2.gemPriceBtnText}>{bundle.priceLabel} ➤</Text>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ── ShopScreen ───────────────────────────────────────────────────────────────
export function ShopScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const theme = useTheme();
  const coins = useEconomyStore((s) => s.coins);
  const gems = useEconomyStore((s) => s.gems);
  const spendCoins = useEconomyStore((s) => s.spendCoins);
  const spendGems = useEconomyStore((s) => s.spendGems);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const restoreAllHearts = useSubscriptionStore((s) => s.restoreAllHearts);
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');
  const avatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const ownedAvatars = useAuthStore((s) => s.profile?.ownedAvatars ?? []);
  const setAvatar = useAuthStore((s) => s.setAvatar);
  const addOwnedAvatar = useAuthStore((s) => s.addOwnedAvatar);

  const [activeCategory, setActiveCategory] = useState<ShopCategory>('hearts');
  const [pendingItem, setPendingItem] = useState<ShopItem | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<AnyBundle | null>(null);
  const shopScrollRef = useRef<ScrollView>(null);
  const walkthroughScreen = useTutorialStore((s) => s.walkthroughActiveScreen);

  // Finn splash on enter, static 1.5s or tap to dismiss
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Gentle auto-scroll during walkthrough shop step
  useEffect(() => {
    if (walkthroughScreen !== 'shop') return;
    let y = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        y += 100;
        shopScrollRef.current?.scrollTo({ y, animated: true });
        if (y >= 500) clearInterval(interval);
      }, 2000);
      return () => clearInterval(interval);
    }, 1500);
    return () => clearTimeout(delay);
  }, [walkthroughScreen]);

  const gemsStyle = useStaggerIn(60);
  const exchangeStyle = useStaggerIn(200);
  const proStyle = useStaggerIn(270);
  const itemsStyle = useStaggerIn(340);

  const visibleItems = SHOP_ITEMS.filter((i) => i.category === activeCategory);

  const isAvatarItem = (item: ShopItem) => item.category === 'avatars' && item.id.startsWith('avatar-');
  const canAffordItem = (item: ShopItem) => {
    if ((item.gemCost ?? 0) > 0) return gems >= (item.gemCost ?? 0);
    return coins >= item.coinCost;
  };

  const handleBuyPress = useCallback((item: ShopItem) => {
    if (isAvatarItem(item)) {
      // Use the full id (`avatar-saver`, etc.) — that's how the new avatar
      // system flows through ownedAvatars → profile.avatarId → AvatarImage's
      // SVG lookup. Stripping the prefix orphans the ownership check.
      if (ownedAvatars.includes(item.id)) { setAvatar(item.id); successHaptic(); return; }
    }
    if (!canAffordItem(item)) return;
    setPendingItem(item);
  }, [coins, gems, ownedAvatars, setAvatar]);

  const handleConfirm = useCallback(() => {
    if (!pendingItem) return;
    const isGem = (pendingItem.gemCost ?? 0) > 0;
    const ok = isGem ? spendGems(pendingItem.gemCost ?? 0) : spendCoins(pendingItem.coinCost);
    if (ok) {
      if (pendingItem.id === 'heart-refill-full') restoreAllHearts();
      else if (pendingItem.id === 'heart-refill-1') {
        const s = useSubscriptionStore.getState();
        if (s.hearts < 4) useSubscriptionStore.setState({ hearts: s.hearts + 1 });
      } else if (pendingItem.id === 'streak-freeze') {
        useEconomyStore.getState().addStreakFreezes(1);
        successHaptic();
      } else if (pendingItem.id === 'streak-freeze-bundle') {
        useEconomyStore.getState().addStreakFreezes(3);
        successHaptic();
      } else if (isAvatarItem(pendingItem)) {
        addOwnedAvatar(pendingItem.id); setAvatar(pendingItem.id); successHaptic();
      }
    }
    setPendingItem(null);
  }, [pendingItem, spendCoins, spendGems, restoreAllHearts, addOwnedAvatar, setAvatar]);

  const handleGemExchange = useCallback((gemsNeeded: number, coinsReward: number) => {
    if (gems < gemsNeeded) {
      Alert.alert('אין מספיק ג\'מס', `צריך ${gemsNeeded} 💎 להמרה זו.`);
      return;
    }
    if (spendGems(gemsNeeded)) { addCoins(coinsReward); successHaptic(); }
  }, [gems, spendGems, addCoins]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* ── FINN SPLASH on enter ── */}
      {showSplash && (
        <Pressable onPress={() => setShowSplash(false)} style={styles.finnSplash} accessibilityRole="button" accessibilityLabel="סגור מסך כניסה">
          <Image source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/finn/finn-shop.png' }} style={styles.finnSplashImg} resizeMode="cover" accessible={false} />
        </Pressable>
      )}

      <View style={{ flex: 1 }}>

        {/* ── HEADER: Title + Balance bar + close ── */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.topBarTitle, { color: theme.text }]}>חנות</Text>
          <Pressable onPress={() => router.replace('/(tabs)' as never)} style={[styles.closeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="button" accessibilityLabel="סגור חנות" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView ref={shopScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── PRO VIP BANNER ── */}
          {isPro && (
            <Animated.View entering={FadeInDown.duration(150)} style={styles.vipBanner}>
              <LinearGradient
                colors={['rgba(8,145,178,0.08)', 'rgba(34,211,238,0.06)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.vipBannerGradient}
              >
                <ProBadge size="md" />
                <Text style={styles.vipBannerText}>חבר PRO, הנחה 20% על כל הפריטים</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* ── GEM → COIN EXCHANGE (GOLD.jpg card style) ── */}
          <Animated.View style={exchangeStyle}>
            <LinearGradient colors={[...SECTION_COLORS.exchange.gradient]} style={styles.sectionBlock}>
              <DiamondPattern />
              <SectionBgLottie source={require('../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json')} active={isFocused} />
              <SectionHeader title="המרת ג'מס" subtitle={`יש לך ${gems} 💎`} />
              <View style={styles2.exchangeCardGrid}>
                {GEM_EXCHANGE_RATES.map((rate, i) => {
                  const can = gems >= rate.gems;
                  return (
                    <Animated.View key={rate.gems} entering={FadeInDown.duration(150)} style={styles.goldGridItem}>
                      <AnimatedPressable
                        onPress={() => handleGemExchange(rate.gems, rate.coins)}
                        style={[styles.goldCard, !can && { opacity: 0.5 }]}
                        accessibilityRole="button"
                        accessibilityLabel={`המר ${rate.gems} ג׳מס ל-${rate.coins.toLocaleString()} מטבעות`}
                        accessibilityState={{ disabled: !can }}
                      >
                        {rate.best && (
                          <LinearGradient colors={['#0891b2', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bestBadge}>
                            <Text style={styles.bestBadgeText}>הכי שווה</Text>
                          </LinearGradient>
                        )}
                        <View style={styles.goldImageArea}>
                          <Image
                            source={GOLD_TIER_IMAGES[i] as number}
                            style={{ width: 82, height: 82, borderRadius: 10 }}
                            resizeMode="cover"
                            accessible={false}
                          />
                        </View>
                        {/* Blue diamond price */}
                        <View style={styles.goldPriceRow}>
                          <Text style={styles.goldPriceNum}>{rate.gems}</Text>
                          <Text style={{ fontSize: 14 }}>💎</Text>
                        </View>
                      </AnimatedPressable>
                    </Animated.View>
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

          <TransitionStrip from={SECTION_COLORS.exchange.bottom} to={SECTION_COLORS.gems.gradient[0]} />

          {/* ── GEM BUNDLES ── */}
          <Animated.View style={gemsStyle}>
            <LinearGradient colors={[...SECTION_COLORS.gems.gradient]} style={styles.sectionBlock}>
              <DiamondPattern />
              <SectionBgLottie source={require('../../../assets/lottie/Diamond.json')} active={isFocused} />
              <View style={{ position: 'absolute', left: 16, bottom: 16, opacity: 0.08 }} pointerEvents="none">
                <LottieIcon source={require('../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json')} size={80} autoPlay loop active={isFocused} />
              </View>
              <SectionHeader title="ג'מס פרימיום" subtitle="רכישה אמיתית · מיידי" />
              <View style={styles2.gemBundleGrid}>
                {GEM_BUNDLES.map((b, i) => (
                  <GemBundleCard key={b.id} bundle={b} index={i} onPress={() => setSelectedBundle(b)} />
                ))}
              </View>
            </LinearGradient>
          </Animated.View>

          <TransitionStrip from={SECTION_COLORS.gems.bottom} to={SECTION_COLORS.deals.gradient[0]} />

          {/* ── DAILY DEALS ── */}
          <Animated.View entering={FadeInDown.duration(150)}>
            <LinearGradient colors={[...SECTION_COLORS.deals.gradient]} style={styles.sectionBlock}>
              <DiamondPattern />
              <SectionBgLottie source={require('../../../assets/lottie/wired-flat-100-price-tag-sale-hover-flutter.json')} active={isFocused} />
              <SectionHeader title="דילים יומיים" />
              <DailyDealsSection />
            </LinearGradient>
          </Animated.View>

          <TransitionStrip from={SECTION_COLORS.deals.bottom} to={SECTION_COLORS.items.gradient[0]} />

          {/* ── SHOP ITEMS ── */}
          <Animated.View style={itemsStyle}>
            <LinearGradient colors={[...SECTION_COLORS.items.gradient]} style={styles.sectionBlock}>
              <DiamondPattern />
              <SectionBgLottie source={require('../../../assets/lottie/wired-flat-481-shop-hover-pinch.json')} active={isFocused} />
              <SectionHeader title="פריטים" />

              {/* Category tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
                style={{ direction: 'rtl' }}
              >
                {SHOP_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.key;
                  return (
                    <AnimatedPressable
                      key={cat.key}
                      onPress={() => setActiveCategory(cat.key)}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: active ? '#ffffff' : '#f0f9ff',
                        borderWidth: 1.5,
                        borderColor: active ? '#bae6fd' : '#e2e8f0',
                        shadowColor: active ? '#000' : 'transparent',
                        shadowOpacity: active ? 0.08 : 0,
                        shadowRadius: active ? 4 : 0,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: active ? 3 : 0,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={cat.label}
                      accessibilityState={{ selected: active }}
                    >
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#1e293b' : '#64748b', writingDirection: 'rtl' as const }}>
                          {cat.label}
                        </Text>
                        <Text style={{ fontSize: 14 }}>{CATEGORY_EMOJI[cat.key]}</Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>

              {/* Items grid (3 columns) */}
              <View style={styles.bundleGrid}>
                {visibleItems.map((item, i) => {
                  const isAvatar = isAvatarItem(item);
                  const rawId = item.id.replace('avatar-', '');
                  return (
                    <Animated.View key={item.id} entering={FadeInDown.duration(150)} style={styles.gridItem}>
                      <ShopItemCard
                        item={item}
                        canAfford={canAffordItem(item)}
                        onBuyPress={() => handleBuyPress(item)}
                        isEquipped={isAvatar && avatarId === rawId}
                        isOwned={isAvatar && ownedAvatars.includes(rawId)}
                      />
                    </Animated.View>
                  );
                })}
                {visibleItems.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>אין פריטים בקטגוריה זו</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── PRO CTA ── */}
          {!isPro && (
            <>
              <TransitionStrip from={SECTION_COLORS.items.bottom} to={SECTION_COLORS.pro.gradient[0]} />
              <Animated.View style={proStyle}>
                <LinearGradient colors={[...SECTION_COLORS.pro.gradient]} style={styles.sectionBlock}>
                  <DiamondPattern />
                  <SectionBgLottie source={require('../../../assets/lottie/wired-flat-407-crown-king-lord-hover-roll.json')} active={isFocused} />
                  <SectionHeader title="PRO אקסקלוסיבי" />
                  <Pressable onPress={() => router.push('/pricing' as never)} style={({ pressed }) => [pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="שדרג ל-PRO">
                    <LinearGradient
                      colors={['#0a2540', '#164e63', '#0a2540']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.proCta}
                    >
                      {["✦", "✦", "✦", "✦", "✦"].map((s, i) => (
                        <Text
                          key={i}
                          style={{
                            position: "absolute",
                            color: i % 2 === 0 ? "#facc15" : "#67e8f9",
                            fontSize: i === 2 ? 10 : 7,
                            opacity: 0.6,
                            top: [8, 16, 6, 22, 12][i],
                            left: [12, 60, 130, 200, 260][i],
                          }}
                        >{s}</Text>
                      ))}
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
                          <View style={{ width: 48, height: 48, overflow: "hidden", borderRadius: 14, backgroundColor: "rgba(14,116,144,0.3)", borderWidth: 1, borderColor: "rgba(103,232,249,0.5)", alignItems: "center", justifyContent: "center" }} accessible={false}>
                            <LottieIcon source={require('../../../assets/lottie/Pro Animation 3rd.json')} size={40} autoPlay loop active={isFocused} />
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#facc15", textTransform: "uppercase" }}>שדרגו ל-PRO</Text>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff", marginTop: 2 }}>לבבות אינסופיים + בוסט XP</Text>
                            <Text style={{ fontSize: 11, color: "rgba(103,232,249,0.8)", marginTop: 2 }}>✦ ללא הגבלות ✦ בלעדי לחברים ✦</Text>
                          </View>
                        </View>
                        <View style={{ borderRadius: 20, backgroundColor: "rgba(250,204,21,0.15)", borderWidth: 1.5, borderColor: "rgba(250,204,21,0.5)", paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", color: "#facc15" }}>PRO</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </Animated.View>
            </>
          )}

        </ScrollView>
      </View>

      {pendingItem !== null && (
        <ConfirmModal
          visible
          itemName={pendingItem.name}
          coinCost={pendingItem.coinCost}
          gemCost={pendingItem.gemCost}
          onConfirm={handleConfirm}
          onCancel={() => setPendingItem(null)}
        />
      )}

      <IAPModal
        visible={selectedBundle !== null}
        bundle={selectedBundle}
        onDismiss={() => setSelectedBundle(null)}
        onPurchaseSuccess={() => setSelectedBundle(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  finnSplash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finnSplashImg: {
    width: '100%',
    height: '100%',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 8,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    writingDirection: 'rtl' as const,
    marginRight: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 72,
    justifyContent: 'center',
  },
  balanceVal: {
    fontSize: 13,
    fontWeight: '900',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Section header, wooden plank
  sectionHeader: {
    marginBottom: 14,
    alignItems: 'center',
  },
  woodPlank: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(8,145,178,0.25)',
    position: 'relative',
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  woodHighlight: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(186,230,253,0.35)',
  },
  nail: {
    position: 'absolute',
    top: '50%' as unknown as number,
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7dd3fc',
    borderWidth: 1,
    borderColor: '#0891b2',
  },
  plankTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    writingDirection: 'rtl' as const,
    marginTop: 6,
    textAlign: 'center',
  },

  // Subliminal background Lottie
  bgLottieWrap: {
    position: 'absolute',
    right: 20,
    top: 20,
    opacity: 0.06,
  },
  bgLottie: {
    width: 90,
    height: 90,
  },

  // Section block (full bleed)
  sectionBlock: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    position: 'relative',
    overflow: 'hidden',
  },

  // Diamond pattern
  diamondGrid: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  depthStripTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
  },
  depthStripBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
  },

  // Transition strip
  transitionStrip: {
    height: 40,
    marginHorizontal: -16,
  },

  // Bundle grid
  bundleGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  gridItem: {
    width: '47%' as unknown as number,
  },

  // Bundle cards
  bundleCard: {
    width: '100%' as unknown as number,
    borderRadius: 16,
    borderWidth: 2.5,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  cardImgBox: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  bestBadge: {
    position: 'absolute',
    top: -10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 2,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  bundleQty: {
    fontSize: 14,
    fontWeight: '900',
  },
  bundleLabel: {
    fontSize: 10,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 8,
  },
  bonusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  bonusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  priceBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  priceBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },

  // Exchange
  exchangeList: { gap: 10 },
  exchangeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  exchangeRowBest: {
    borderColor: '#7dd3fc',
    backgroundColor: '#f0f9ff',
  },
  exchangeContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  exchangeArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  exchangeGems: { fontSize: 15, fontWeight: '800', color: '#0891b2' },
  exchangeCoins: { fontSize: 15, fontWeight: '800', color: '#b45309' },
  bestRatePill: {
    marginLeft: 8,
    backgroundColor: '#ecfeff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestRateText: { fontSize: 9, fontWeight: '800', color: '#0891b2' },
  exchangeBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  exchangeBtnText: { fontSize: 13, fontWeight: '900', color: '#000' },

  // PRO CTA
  proCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(250,204,21,0.3)',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.3,
    elevation: 8,
  },
  proCtaTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },

  // VIP banner
  vipBanner: {
    marginBottom: 8,
  },
  vipBannerGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  vipBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0891b2',
    textAlign: 'right',
    writingDirection: 'rtl' as const,
  },

  // Empty state
  emptyState: {
    width: '100%' as unknown as number,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    writingDirection: 'rtl' as const,
  },

  // ── Gold Bundle Cards (Clash Royale style) ──
  goldGridItem: {
    width: '31%' as unknown as number,
  },
  goldCard: {
    width: '100%' as unknown as number,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    padding: 8,
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  goldCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#164e63',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 4,
    marginTop: 4,
  },
  goldImageArea: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: 'rgba(8,145,178,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(8,145,178,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  goldAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0891b2',
    marginBottom: 4,
  },
  goldBonusPill: {
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.3)',
    backgroundColor: 'rgba(8,145,178,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  goldBonusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0891b2',
  },
  goldPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(6,182,212,0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: '100%',
  },
  goldPriceNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0891b2',
  },
  goldBundleGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 4,
  },

});

// Split into second stylesheet to avoid TypeScript inference limit
const styles2 = StyleSheet.create({
  gemGridItem: {
    width: '31%' as unknown as number,
  },
  gemCard: {
    width: '100%' as unknown as number,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(8,145,178,0.4)',
    backgroundColor: '#ecfeff',
    padding: 8,
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  gemCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#164e63',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 4,
    marginTop: 4,
  },
  gemImageArea: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(8,145,178,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(34,211,238,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  gemAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0891b2',
    marginBottom: 4,
  },
  gemBonusPill: {
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.4)',
    backgroundColor: 'rgba(8,145,178,0.1)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  gemBonusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0891b2',
  },
  gemPriceBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    width: '100%',
    alignItems: 'center',
  },
  gemPriceBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  gemBundleGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  exchangeCardGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 4,
  },
});
