import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Flame, TrendingUp, TrendingDown } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { STITCH } from "../../../constants/theme";
import { tapHaptic } from "../../../utils/haptics";

interface HotAsset {
  ticker: string;
  hebrewName: string;
  /** Last week percent change. Negative = red, positive = green. */
  pctChange: number;
  /** How many community members voted/discussed this asset this week. */
  weeklyVoters: number;
  /** Optional question id to deep-link into in /crowd-wisdom. */
  crowdQuestionId?: string;
}

const HOT_ASSETS: readonly HotAsset[] = [
  { ticker: "NVDA", hebrewName: "NVIDIA", pctChange: 5.1, weeklyVoters: 4318, crowdQuestionId: "yn_nvda_buy_now" },
  { ticker: "BTC",  hebrewName: "ביטקוין",  pctChange: 2.3, weeklyVoters: 4389, crowdQuestionId: "yn_bitcoin_100k" },
  { ticker: "TA-35",hebrewName: "ת״א 35",  pctChange: 1.4, weeklyVoters: 3740, crowdQuestionId: "forecast_ta35_friday" },
  { ticker: "TSLA", hebrewName: "טסלה",    pctChange: 12.0, weeklyVoters: 3970, crowdQuestionId: "yn_tesla_correction" },
  { ticker: "S&P",  hebrewName: "S&P 500", pctChange: 0.8, weeklyVoters: 5110, crowdQuestionId: "forecast_sp500_year_end" },
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
          <Text style={styles.headerTitle}>שוק חם השבוע</Text>
          <Text style={styles.headerSubtitle}>
            הנכסים שמדברים עליהם הכי הרבה בקהילה
          </Text>
        </View>
      </View>

      {/* Horizontal scroll of hot asset chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.chipsRow}>
          {HOT_ASSETS.map((asset, i) => {
            const up = asset.pctChange >= 0;
            return (
              <Pressable
                key={asset.ticker}
                onPress={() => handlePress(asset)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`${asset.hebrewName}, שינוי ${asset.pctChange.toFixed(1)}%`}
              >
                <View style={styles.chipRank}>
                  <Text style={styles.chipRankText}>{i + 1}</Text>
                </View>
                <Text style={styles.chipTicker}>{asset.ticker}</Text>
                <Text style={styles.chipHebrew} numberOfLines={1}>{asset.hebrewName}</Text>
                <View
                  style={[
                    styles.chipPctRow,
                    up ? styles.chipPctRowUp : styles.chipPctRowDown,
                  ]}
                >
                  {up ? (
                    <TrendingUp size={11} color="#16a34a" strokeWidth={2.6} />
                  ) : (
                    <TrendingDown size={11} color="#dc2626" strokeWidth={2.6} />
                  )}
                  <Text
                    style={[
                      styles.chipPctText,
                      { color: up ? "#16a34a" : "#dc2626" },
                    ]}
                  >
                    {up ? "+" : ""}{asset.pctChange.toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.chipVoters}>
                  {asset.weeklyVoters.toLocaleString("he-IL")} בשיחה
                </Text>
              </Pressable>
            );
          })}
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
  chip: {
    width: 130,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipRank: {
    alignSelf: "flex-end",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  chipRankText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ffffff",
  },
  chipTicker: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
  },
  chipHebrew: {
    fontSize: 11,
    fontWeight: "600",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
  },
  chipPctRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipPctRowUp: {
    backgroundColor: "#dcfce7",
  },
  chipPctRowDown: {
    backgroundColor: "#fee2e2",
  },
  chipPctText: {
    fontSize: 11,
    fontWeight: "900",
  },
  chipVoters: {
    fontSize: 10,
    fontWeight: "600",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 2,
  },
});
