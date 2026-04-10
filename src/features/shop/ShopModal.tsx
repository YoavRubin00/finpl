import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Coins, Diamond, X, ArrowRight, ChevronRight } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { ShopItemCard } from "./ShopItemCard";
import { ConfirmModal } from "./ConfirmModal";
import { IAPModal } from "./IAPModal";
import { SHOP_ITEMS, SHOP_CATEGORIES } from "./shopItems";
import { GEM_BUNDLES } from "./gemBundles";
import { useEntranceAnimation, fadeInUp } from "../../utils/animations";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useShopModalStore } from "../../stores/useShopModalStore";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import type { ShopCategory, ShopItem, GemBundle } from "./types";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const ITEM_STAGGER = 70;

// Gem → Coin exchange rates
const GEM_EXCHANGE_RATES = [
  { gems: 10, coins: 500 },
  { gems: 25, coins: 1400 },
  { gems: 50, coins: 3000, best: true as const },
];

function AnimatedShopItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const style = useEntranceAnimation(fadeInUp, { delay: index * ITEM_STAGGER });
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function ShopModal() {
  const router = useRouter();
  const visible = useShopModalStore((s) => s.visible);
  const close = useShopModalStore((s) => s.close);

  const coins = useEconomyStore((s) => s.coins);
  const gems = useEconomyStore((s) => s.gems);
  const spendCoins = useEconomyStore((s) => s.spendCoins);
  const spendGems = useEconomyStore((s) => s.spendGems);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const restoreAllHearts = useSubscriptionStore((s) => s.restoreAllHearts);
  const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");

  const [activeCategory, setActiveCategory] = useState<ShopCategory>("avatars");
  const [pendingItem, setPendingItem] = useState<ShopItem | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<GemBundle | null>(null);

  const visibleItems = SHOP_ITEMS.filter((i) => i.category === activeCategory);
  const isAvatarCategory = activeCategory === "avatars";

  const canAffordItem = useCallback(
    (item: ShopItem): boolean => {
      if ((item.gemCost ?? 0) > 0) return gems >= (item.gemCost ?? 0);
      return coins >= item.coinCost;
    },
    [coins, gems],
  );

  const handleBuyPress = useCallback(
    (item: ShopItem) => {
      if (!canAffordItem(item)) return;
      setPendingItem(item);
    },
    [canAffordItem],
  );

  const handleConfirm = useCallback(() => {
    if (!pendingItem) return;

    const isGemItem = (pendingItem.gemCost ?? 0) > 0;
    const success = isGemItem
      ? spendGems(pendingItem.gemCost ?? 0)
      : spendCoins(pendingItem.coinCost);

    if (success) {
      if (pendingItem.id === "heart-refill-full") {
        restoreAllHearts();
      } else if (pendingItem.id === "heart-refill-1") {
        const store = useSubscriptionStore.getState();
        const current = store.hearts;
        if (current < 5) {
          useSubscriptionStore.setState({ hearts: current + 1 });
        }
      }
    }
    setPendingItem(null);
  }, [pendingItem, spendCoins, spendGems, restoreAllHearts]);

  const handleCancel = useCallback(() => {
    setPendingItem(null);
  }, []);

  const handleClose = useCallback(() => {
    tapHaptic();
    setPendingItem(null);
    setSelectedBundle(null);
    close();
  }, [close]);

  const handleGemExchange = useCallback((gemsNeeded: number, coinsReward: number) => {
    if (gems < gemsNeeded) {
      Alert.alert("אין מספיק ג'מס", `צריך ${gemsNeeded} 💎 להמרה זו.`);
      return;
    }
    if (spendGems(gemsNeeded)) {
      addCoins(coinsReward);
      successHaptic();
    }
  }, [gems, spendGems, addCoins]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <SafeAreaView style={ms.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={ms.header}>
          <Pressable onPress={handleClose} style={ms.closeBtn} accessibilityLabel="סגור" accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color="#6b7280" />
          </Pressable>
          <Text style={[ms.title, RTL]}>חנות</Text>
          <View style={ms.balancesRow}>
            <View style={ms.gemBadge}>
              <Diamond size={14} color="#0891b2" />
              <Text style={ms.gemText}>{gems.toLocaleString()}</Text>
            </View>
            <View style={ms.coinBadge}>
              <Coins size={14} color="#ca8a04" />
              <Text style={ms.coinText}>{coins.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
          style={{ flexGrow: 0 }}
        >
          {[...SHOP_CATEGORIES].reverse().map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <AnimatedPressable
                key={cat.key}
                onPress={() => setActiveCategory(cat.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={cat.label}
                style={[
                  {
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: isActive ? "#0891b2" : "#ffffff",
                    borderWidth: 1,
                    borderColor: isActive ? "#0891b2" : "#e5e7eb",
                  },
                ]}
              >
                <Text
                  style={[
                    RTL,
                    {
                      fontSize: 12,
                      fontWeight: "600",
                      color: isActive ? "#ffffff" : "#6b7280",
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Category Items — TOP ── */}
          {isAvatarCategory && (
            <View style={ms.devBanner}>
              <Text style={ms.devBannerText}>🚧 אווטארים בפיתוח — בקרוב!</Text>
            </View>
          )}

          {visibleItems.map((item, index) => (
            <AnimatedShopItem key={item.id} index={index}>
              {isAvatarCategory ? (
                <View style={{ opacity: 0.45 }} pointerEvents="none">
                  <ShopItemCard
                    item={item}
                    canAfford={false}
                    onBuyPress={() => {}}
                  />
                </View>
              ) : (
                <ShopItemCard
                  item={item}
                  canAfford={canAffordItem(item)}
                  onBuyPress={() => handleBuyPress(item)}
                />
              )}
            </AnimatedShopItem>
          ))}

          <View style={ms.divider} />

          {/* ── Gem Bundles (Real Money → Gems) ── */}
          <View style={ms.gemHeroSection}>
            <View accessible={false}>
              <LottieView
                source={require("../../../assets/lottie/Diamond.json")}
                style={ms.diamondLottie}
                autoPlay
                loop
              />
            </View>
            <Text style={[ms.gemHeroTitle, RTL]}>רכישת ג'מס</Text>
            <Text style={[ms.gemHeroSub, RTL]}>כסף אמיתי → ג'מס</Text>
          </View>

          {/* Promo mega bundle */}
          {GEM_BUNDLES.filter((b) => b.isPromo).map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setSelectedBundle(b)}
              style={({ pressed }) => [ms.promoCard, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`חבילת ג'מס מיוחדת: ${b.gems} ג'מס`}
            >
              <View style={ms.promoRibbon}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <View accessible={false}>
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                      style={{ width: 16, height: 16 }}
                      autoPlay
                      loop
                    />
                  </View>
                  <Text style={ms.promoRibbonText}>מבצע מיוחד!</Text>
                </View>
              </View>
              <View style={ms.promoInner}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 36 }}>{b.emoji}</Text>
                  <Text style={ms.promoGems}>{b.gems.toLocaleString()} ג'מס</Text>
                  <Text style={ms.promoBonus}>{b.bonusLabel}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={ms.promoOldPrice}>₪249.90</Text>
                  <Text style={ms.promoPrice}>{b.priceLabel}</Text>
                  <Text style={ms.promoSave}>חסכון 40%!</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {/* Regular bundles */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            style={{ flexGrow: 0, marginBottom: 16, marginTop: 12 }}
          >
            {[...GEM_BUNDLES].filter((b) => !b.isPromo).reverse().map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setSelectedBundle(b)}
                style={({ pressed }) => [
                  ms.bundleCard,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`חבילת ${b.gems} ג'מס - ${b.priceLabel}`}
              >
                <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
                <Text style={ms.bundleGems}>{b.gems} ג'מס</Text>
                {b.bonusLabel && <Text style={ms.bundleBonus}>{b.bonusLabel}</Text>}
                <Text style={ms.bundlePrice}>{b.priceLabel}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={ms.divider} />

          {/* ── Gem → Coin Exchange ── */}
          <View style={ms.sectionHeader}>
            <Text style={[ms.sectionTitle, RTL]}>🔄 המרת ג'מס למטבעות</Text>
            <Text style={[ms.sectionSub, RTL]}>יש לך {gems} 💎</Text>
          </View>
          {GEM_EXCHANGE_RATES.map((rate) => {
            const can = gems >= rate.gems;
            return (
              <Pressable
                key={rate.gems}
                onPress={() => handleGemExchange(rate.gems, rate.coins)}
                style={({ pressed }) => [
                  ms.exchangeRow,
                  rate.best && ms.exchangeRowBest,
                  !can && { opacity: 0.4 },
                  pressed && { opacity: 0.75 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`המר ${rate.gems} ג'מס ל-${rate.coins} מטבעות`}
              >
                <View style={ms.exchangeLeft}>
                  <Text style={ms.exchangeGems}>💎 {rate.gems}</Text>
                  <ArrowRight size={14} color="#64748b" style={{ marginHorizontal: 6 }} />
                  <Text style={ms.exchangeCoins}> {rate.coins.toLocaleString()}</Text>
                  {rate.best && (
                    <View style={ms.bestRatePill}>
                      <Text style={ms.bestRateText}>💰 שווי מקסימלי</Text>
                    </View>
                  )}
                </View>
                <View style={[ms.exchangeBtn, !can && { backgroundColor: "#e5e7eb" }]}>
                  <Text style={[ms.exchangeBtnText, !can && { color: "#64748b" }]}>
                    {can ? "המר" : "חסר"}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* ── PRO Banner — Bottom ── */}
          {!isPro && (
            <Pressable
              onPress={() => { close(); router.push("/pricing" as never); }}
              style={({ pressed }) => [ms.proBottomBanner, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="שדרג ל-PRO — גישה מלאה"
            >
              <View accessible={false}>
                <LottieView
                  source={require("../../../assets/lottie/Crown.json")}
                  style={{ width: 24, height: 24 }}
                  autoPlay
                  loop
                />
              </View>
              <Text style={ms.proBottomText}>שדרג ל-PRO — גישה מלאה</Text>
              <ChevronRight size={14} color="#0891b2" style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
          )}
        </ScrollView>

        {/* Confirm modal */}
        {pendingItem !== null && (
          <ConfirmModal
            visible
            itemName={pendingItem.name}
            coinCost={pendingItem.coinCost}
            gemCost={pendingItem.gemCost}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}

        {/* IAP modal for gem bundles */}
        {selectedBundle !== null && (
          <IAPModal
            visible
            bundle={selectedBundle}
            onDismiss={() => setSelectedBundle(null)}
            onPurchaseSuccess={() => setSelectedBundle(null)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#1f2937",
    fontSize: 22,
    fontWeight: "900",
  },
  balancesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  coinText: {
    color: "#ca8a04",
    fontWeight: "700",
    fontSize: 13,
  },
  gemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  gemText: {
    color: "#0891b2",
    fontWeight: "700",
    fontSize: 13,
  },
  // ── Sections ──
  sectionHeader: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1f2937",
  },
  sectionSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },

  // ── Gem Hero ──
  gemHeroSection: {
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 8,
  },
  diamondLottie: {
    width: 72,
    height: 72,
  },
  gemHeroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0891b2",
    marginTop: 4,
  },
  gemHeroSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },

  // ── Promo Card ──
  promoCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#0891b2",
    backgroundColor: "#ede9fe",
    overflow: "hidden",
    marginBottom: 4,
  },
  promoRibbon: {
    backgroundColor: "#0891b2",
    paddingVertical: 5,
    alignItems: "center",
  },
  promoRibbonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
  },
  promoInner: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  promoGems: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0891b2",
    marginTop: 6,
  },
  promoBonus: {
    fontSize: 12,
    fontWeight: "800",
    color: "#16a34a",
    marginTop: 2,
  },
  promoOldPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textDecorationLine: "line-through" as const,
  },
  promoPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    marginTop: 2,
  },
  promoSave: {
    fontSize: 11,
    fontWeight: "800",
    color: "#dc2626",
    marginTop: 2,
  },

  // ── Gem Bundles ──
  bundleCard: {
    width: 120,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff",
  },
  bundleGems: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0891b2",
    marginTop: 6,
  },
  bundleBonus: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16a34a",
    marginTop: 2,
  },
  bundlePrice: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1f2937",
    marginTop: 6,
  },

  // ── Exchange ──
  exchangeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    marginBottom: 8,
  },
  exchangeRowBest: {
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  exchangeLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  exchangeGems: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0891b2",
  },
  exchangeCoins: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ca8a04",
  },
  bestRatePill: {
    marginRight: 8,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestRateText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#92400e",
  },
  exchangeBtn: {
    backgroundColor: "#0891b2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  exchangeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },

  // ── Avatar dev banner ──
  devBanner: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
  },
  devBannerText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400e",
  },

  // ── PRO bottom banner (compact) ──
  proBottomBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },
  proBottomText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#581c87",
    textAlign: "right" as const,
    flex: 1,
  },
});
