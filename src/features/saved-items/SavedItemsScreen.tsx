import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { BackButton } from "../../components/ui/BackButton";
import { useTheme } from "../../hooks/useTheme";
import { useSavedItemsStore } from "./useSavedItemsStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import type { SavedItem } from "./savedItemTypes";

const SECTION_ORDER: Array<{ type: SavedItem["type"]; label: string }> = [
  { type: "lesson", label: "שיעורים" },
  { type: "sim", label: "סימולציות" },
  { type: "feed", label: "פיד" },
];

function getSectionLottie(type: SavedItem["type"]) {
  switch (type) {
    case "lesson":
      return require("../../../assets/lottie/wired-flat-779-books-hover-hit.json");
    case "sim":
      return require("../../../assets/lottie/gaming.json");
    case "feed":
      return require("../../../assets/lottie/wired-flat-411-news-newspaper-hover-pinch.json");
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export function SavedItemsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isPro = useSubscriptionStore(
    (s) => s.tier === "pro" && s.status === "active",
  );
  const items = useSavedItemsStore((s) => s.items);
  const removeItem = useSavedItemsStore((s) => s.removeItem);

  const getByType = (type: SavedItem["type"]) =>
    items.filter((i) => i.type === type);

  const handleDelete = (item: SavedItem) => {
    Alert.alert("מחיקה", `להסיר את "${item.title}" מהשמורים?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: () => removeItem(item.id),
      },
    ]);
  };

  const handlePress = (item: SavedItem) => {
    if (
      (item.type === "lesson" || item.type === "sim") &&
      item.chapterId != null &&
      item.moduleId
    ) {
      router.push({
        pathname: "/lesson-flow",
        params: { chapterId: String(item.chapterId), moduleId: item.moduleId },
      } as never);
    } else if (item.type === "feed") {
      router.push("/(tabs)/learn" as never);
    }
  };

  const isEmpty = items.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <BackButton color="#0e7490" />
          <Text style={[styles.headerTitle, { color: theme.text }]}>פריטים שמורים</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {!isPro ? (
        <View style={styles.upsellContainer}>
          <LottieView
            source={require("../../../assets/lottie/Pro Animation 3rd.json")}
            autoPlay
            loop
            style={styles.upsellLottie}
          />
          <Text style={[styles.upsellTitle, { color: theme.text }]}>פריטים שמורים</Text>
          <Text style={[styles.upsellSubtitle, { color: theme.textMuted }]}>
            שמור שיעורים, סימולציות ופריטי פיד לגישה מהירה.{"\n"}
            זמין למנויי PRO בלבד.
          </Text>
          <TouchableOpacity
            style={styles.upsellButton}
            onPress={() => router.push("/pricing" as never)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="שדרג לפרו"
          >
            <View style={styles.upsellButtonInner}>
              <LottieView
                source={require("../../../assets/lottie/Pro Animation 3rd.json")}
                autoPlay
                loop
                style={{ width: 28, height: 28 }}
              />
              <Text style={styles.upsellButtonText}>שדרג לפרו</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isEmpty ? (
            <View style={styles.emptyState}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-400-bookmark-hover-flutter.json")}
                autoPlay
                loop
                style={styles.emptyLottie}
              />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>עדיין לא שמרת תכנים</Text>
            </View>
          ) : (
            SECTION_ORDER.map((section) => {
              const sectionItems = getByType(section.type);
              if (sectionItems.length === 0) return null;
              return (
                <View key={section.type} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                    <LottieView
                      source={getSectionLottie(section.type)}
                      autoPlay
                      loop={false}
                      style={styles.sectionLottie}
                    />
                  </View>
                  <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {sectionItems.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        {idx > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                        <TouchableOpacity
                          style={styles.row}
                          onPress={() => handlePress(item)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`פתח ${item.title}`}
                        >
                          <TouchableOpacity
                            onPress={() => handleDelete(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.deleteBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`מחק ${item.title}`}
                          >
                            <Trash2 size={18} color="#ef4444" />
                          </TouchableOpacity>
                          <View style={styles.rowContent}>
                            <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.rowDate, { color: theme.textMuted }]}>
                              {formatDate(item.savedAt)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    writingDirection: "rtl",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyLottie: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 16,
    writingDirection: "rtl",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 10,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0e7490",
    writingDirection: "rtl",
    textAlign: "right",
  },
  sectionLottie: {
    width: 28,
    height: 28,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  rowContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
    writingDirection: "rtl",
    textAlign: "right",
  },
  rowDate: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    writingDirection: "rtl",
    textAlign: "right",
  },
  upsellContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  upsellLottie: {
    width: 180,
    height: 180,
  },
  upsellTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
    writingDirection: "rtl",
    textAlign: "center",
  },
  upsellSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 8,
    lineHeight: 22,
    writingDirection: "rtl",
    textAlign: "center",
  },
  upsellButton: {
    marginTop: 24,
    borderRadius: 14,
    shadowColor: "#0c4a6e",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  upsellButtonInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0c4a6e",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderBottomWidth: 4,
    borderBottomColor: "#082f49",
  },
  upsellButtonText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl" as const,
  },
});
