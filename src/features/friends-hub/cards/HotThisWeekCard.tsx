import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, ChevronLeft } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { STITCH, DUO } from "../../../constants/theme";
import { tapHaptic } from "../../../utils/haptics";

interface HotAsset {
  ticker: string;
  hebrewName: string;
  /** Optional question id to deep-link into in /crowd-wisdom. */
  crowdQuestionId?: string;
}

// Honest-data policy: no invented % moves, no fake "voters" counts, no fake
// popularity ranks. These chips are pure navigation shortcuts to the
// community questions about each asset.
const HOT_ASSETS: readonly HotAsset[] = [
  { ticker: "NVDA", hebrewName: "NVIDIA", crowdQuestionId: "yn_nvda_buy_now" },
  { ticker: "BTC",  hebrewName: "ביטקוין",  crowdQuestionId: "yn_bitcoin_100k" },
  { ticker: "TA-35",hebrewName: "ת״א 35",  crowdQuestionId: "forecast_ta35_friday" },
  { ticker: "TSLA", hebrewName: "טסלה",    crowdQuestionId: "yn_tesla_correction" },
  { ticker: "S&P",  hebrewName: "S&P 500", crowdQuestionId: "forecast_sp500_year_end" },
];

export function HotThisWeekCard(): React.ReactElement {
  const router = useRouter();

  const handlePress = (asset: HotAsset) => {
    tapHaptic();
    const target = asset.crowdQuestionId
      ? `/crowd-wisdom?focus=${asset.crowdQuestionId}`
      : "/crowd-wisdom";
    router.push(target as never);
  };

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Flame size={18} color="#dc2626" strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} maxFontSizeMultiplier={1.15}>
            שוק חם השבוע
          </Text>
          <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.15}>
            קפיצה מהירה לשאלות הקהילה
          </Text>
        </View>
      </View>

      {/* Horizontal scroll of asset BLUE buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.chipsRow}>
          {HOT_ASSETS.map((asset) => (
            <Pressable
              key={asset.ticker}
              onPress={() => handlePress(asset)}
              style={({ pressed }) => [styles.chipOuter, { opacity: pressed ? 0.9 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`${asset.hebrewName} — לשאלות הקהילה`}
            >
              <LinearGradient
                colors={["#3b8bf7", DUO.blue, "#0f5ed4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chipGradient}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.chipTicker} maxFontSizeMultiplier={1.15}>
                    {asset.ticker}
                  </Text>
                  <Text
                    style={styles.chipHebrew}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}
                  >
                    {asset.hebrewName}
                  </Text>
                </View>
                <ChevronLeft size={14} color="#ffffff" strokeWidth={2.8} />
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  chipsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  chipOuter: {
    width: 120,
    borderRadius: 14,
    shadowColor: DUO.blue,
    shadowOpacity: 0.4,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  chipGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    overflow: "hidden",
  },
  chipTicker: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "right",
  },
  chipHebrew: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 1,
    flexShrink: 1,
  },
});
