import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Check, RefreshCw } from "lucide-react-native";
import { useDraftStore } from "./useDraftStore";
import { DRAFT_CATEGORIES, DRAFT_CATEGORY_BY_ID, TOTAL_ROUNDS } from "./draftData";
import { ASSET_BY_ID } from "../trading-hub/tradingHubData";
import { fetchLatestPrice } from "../trading-hub/marketApiService";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { CLASH } from "../../constants/theme";
import type { DraftCategory } from "./draftTypes";

// ─── Asset Option Card ────────────────────────────────────────────────────────

interface AssetCardProps {
  assetId: string;
  isSelected: boolean;
  onSelect: () => void;
  accentColor: string;
  onPriceLoad: (price: number) => void;
}

function AssetCard({ assetId, isSelected, onSelect, accentColor, onPriceLoad }: AssetCardProps) {
  const asset = ASSET_BY_ID.get(assetId);
  const [price, setPrice] = useState<number | null>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    fetchLatestPrice(assetId)
      .then((p) => { setPrice(p); onPriceLoad(p); })
      .catch(() => setPrice(null));
  }, [assetId, onPriceLoad]);

  const handlePress = () => {
    tapHaptic();
    scale.value = withSpring(0.94, { damping: 14, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    });
    onSelect();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!asset) return null;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.assetCard,
          isSelected && { borderColor: accentColor, borderWidth: 2.5, backgroundColor: `${accentColor}12` },
        ]}
      >
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: accentColor }]}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </View>
        )}
        <Text style={styles.assetEmoji}>{asset.symbol}</Text>
        <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
        <Text style={styles.assetId}>{asset.id}</Text>
        {price !== null ? (
          <Text style={[styles.assetPrice, { color: accentColor }]}>
            ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        ) : (
          <ActivityIndicator size="small" color={accentColor} />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Category Round ───────────────────────────────────────────────────────────

interface RoundCardProps {
  category: DraftCategory;
  onPick: (assetId: string, price: number) => void;
}

function RoundCard({ category, onPick }: RoundCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});

  const handlePriceLoad = useCallback((assetId: string, price: number) => {
    setPrices((prev) => prev[assetId] === price ? prev : { ...prev, [assetId]: price });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedId || confirming) return;
    setConfirming(true);
    const cachedPrice = prices[selectedId];
    if (cachedPrice !== undefined) {
      successHaptic();
      onPick(selectedId, cachedPrice);
    } else {
      try {
        const price = await fetchLatestPrice(selectedId);
        successHaptic();
        onPick(selectedId, price);
      } catch {
        onPick(selectedId, 0);
      }
    }
  }, [selectedId, confirming, prices, onPick]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOutUp.duration(200)} style={styles.roundCard}>
      {/* Category header */}
      <View style={[styles.categoryHeader, { backgroundColor: category.color }]}>
        <Text style={styles.categoryLabel}>{category.label}</Text>
        <Text style={styles.categoryHint}>בחר נכס אחד</Text>
      </View>

      {/* Asset options */}
      <View style={styles.assetsRow}>
        {category.assetIds.map((id) => (
          <AssetCard
            key={id}
            assetId={id}
            isSelected={selectedId === id}
            onSelect={() => setSelectedId(id)}
            accentColor={category.color}
            onPriceLoad={(p) => handlePriceLoad(id, p)}
          />
        ))}
      </View>

      {/* Confirm */}
      {selectedId && (
        <Animated.View entering={FadeInDown.duration(200)}>
          <Pressable
            onPress={handleConfirm}
            disabled={confirming}
            style={[styles.confirmBtn, { backgroundColor: category.color, opacity: confirming ? 0.6 : 1 }]}
          >
            <Text style={styles.confirmText}>אשר בחירה ←</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Draft Summary (after all picks) ─────────────────────────────────────────

function DraftSummary() {
  const picks = useDraftStore((s) => s.picks);
  const resetDraft = useDraftStore((s) => s.resetDraft);

  return (
    <ScrollView contentContainerStyle={styles.summaryContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.summaryTitle}>הדראפט שלך 🏆</Text>
      <Text style={styles.summarySubtitle}>5 בחירות, ביצועים מתעדכנים שבועית</Text>

      {picks.map((pick) => {
        const cat = DRAFT_CATEGORY_BY_ID.get(pick.categoryId);
        const asset = ASSET_BY_ID.get(pick.assetId);
        if (!cat || !asset) return null;

        return (
          <Animated.View
            key={pick.round}
            entering={FadeInDown.delay(pick.round * 80).springify()}
            style={[styles.summaryRow, { borderLeftColor: cat.color, borderLeftWidth: 4 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryAssetName}>{asset.symbol} {asset.name}</Text>
              <Text style={[styles.summaryCatLabel, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <Text style={styles.summaryPrice}>
              ${pick.entryPrice > 0 ? pick.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
            </Text>
          </Animated.View>
        );
      })}

      <Pressable onPress={resetDraft} style={styles.resetBtn}>
        <RefreshCw size={14} color="#6b7280" />
        <Text style={styles.resetText}>שחזר דראפט (שבוע נוכחי)</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main DraftScreen ─────────────────────────────────────────────────────────

export function DraftScreen() {
  const picks = useDraftStore((s) => s.picks);
  const currentRound = useDraftStore((s) => s.currentRound);
  const isDraftComplete = useDraftStore((s) => s.isDraftComplete);
  const initWeek = useDraftStore((s) => s.initWeek);
  const makePick = useDraftStore((s) => s.makePick);

  useEffect(() => {
    initWeek();
  }, [initWeek]);

  const currentCategory = DRAFT_CATEGORIES[currentRound - 1];

  const handlePick = useCallback(
    (assetId: string, price: number) => {
      if (!currentCategory) return;
      makePick(assetId, currentCategory.id, price);
    },
    [currentCategory, makePick],
  );

  if (isDraftComplete) {
    return <DraftSummary />;
  }

  return (
    <View style={styles.root}>
      {/* Round indicator */}
      <View style={styles.roundIndicator}>
        <Text style={styles.roundText}>סבב {currentRound} מתוך {TOTAL_ROUNDS}</Text>
        <View style={styles.roundDots}>
          {DRAFT_CATEGORIES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < picks.length && { backgroundColor: DRAFT_CATEGORIES[i].color },
                i === currentRound - 1 && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Category card, re-mounts on round change via key */}
      <RoundCard
        key={currentRound}
        category={currentCategory}
        onPick={handlePick}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  roundIndicator: {
    alignItems: "center",
    marginBottom: 16,
  },
  roundText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  roundDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e5e7eb",
  },
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: CLASH.goldBorder,
  },
  roundCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  categoryHeader: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "flex-end",
  },
  categoryLabel: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  categoryHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    writingDirection: "rtl",
    marginTop: 2,
  },
  assetsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    padding: 14,
    justifyContent: "center",
  },
  assetCard: {
    width: 100,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    padding: 12,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  selectedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  assetEmoji: {
    fontSize: 28,
  },
  assetName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  assetId: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  assetPrice: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  confirmBtn: {
    margin: 14,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    writingDirection: "rtl",
  },
  // Summary
  summaryContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryAssetName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "right",
    writingDirection: "rtl",
  },
  summaryCatLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    fontVariant: ["tabular-nums"],
  },
  resetBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: 24,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 12,
    color: "#6b7280",
    writingDirection: "rtl",
  },
});
