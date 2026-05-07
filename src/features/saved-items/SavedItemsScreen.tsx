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
import { Trash2, BookOpen, Gamepad2, Newspaper } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BackButton } from "../../components/ui/BackButton";
import { useTheme } from "../../hooks/useTheme";
import { useSavedItemsStore } from "./useSavedItemsStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { CompactFeedCardPreview } from "./CompactFeedCardPreview";
import type { SavedItem } from "./savedItemTypes";
import { MAX_SAVED_ITEMS } from "./savedItemTypes";

const SECTION_ORDER: Array<{ type: SavedItem["type"]; label: string; icon: React.ReactNode }> = [
  { type: "lesson", label: "שיעורים", icon: <BookOpen size={18} color="#0e7490" /> },
  { type: "sim", label: "סימולציות", icon: <Gamepad2 size={18} color="#0e7490" /> },
  { type: "feed", label: "פיד", icon: <Newspaper size={18} color="#0e7490" /> },
];

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
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

  const handleStructuredPress = (item: SavedItem) => {
    if (
      (item.type === "lesson" || item.type === "sim") &&
      item.chapterId != null &&
      item.moduleId
    ) {
      router.push({
        pathname: "/lesson-flow",
        params: { chapterId: String(item.chapterId), moduleId: item.moduleId },
      } as never);
    }
  };

  const isEmpty = items.length === 0;
  const counterColor = items.length >= 48 ? "#f97316" : "#0c4a6e";

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={["#f0f9ff", "#e0f2fe"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <BackButton color="#0e7490" />
          <Text style={[styles.headerTitle, { color: theme.text }]}>פריטים שמורים</Text>
          {isPro ? (
            <View style={[styles.counterChip, { borderColor: counterColor + "40" }]}>
              <Text style={[styles.counterText, { color: counterColor }]}>
                {items.length}/{MAX_SAVED_ITEMS}
              </Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
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
              <Text style={[styles.emptyText, { color: theme.text }]}>עוד לא אספת אוצרות</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                שמור פריטים בפיד עם סימן הסימנייה
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push("/(tabs)/learn" as never)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="חזור לפיד"
              >
                <Text style={styles.emptyCtaText}>חזור לפיד</Text>
              </TouchableOpacity>
            </View>
          ) : (
            SECTION_ORDER.map((section) => {
              const sectionItems = getByType(section.type);
              if (sectionItems.length === 0) return null;
              return (
                <View key={section.type} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    {section.icon}
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                    <View style={styles.sectionCount}>
                      <Text style={styles.sectionCountText}>{sectionItems.length}</Text>
                    </View>
                  </View>
                  {sectionItems.map((item) => (
                    <View key={item.id} style={styles.itemWrap}>
                      {item.type === "feed" && item.feedItemSnapshot ? (
                        <CompactFeedCardPreview
                          item={item.feedItemSnapshot}
                          onPress={() =>
                            router.push({
                              pathname: "/(tabs)/learn",
                              params: { scrollToFeedId: item.feedItemId ?? "" },
                            } as never)
                          }
                        />
                      ) : (
                        <View style={[styles.simpleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <TouchableOpacity
                            style={styles.simpleRow}
                            onPress={() => handleStructuredPress(item)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`פתח ${item.title}`}
                          >
                            <View style={styles.simpleContent}>
                              <Text style={[styles.simpleTitle, { color: theme.text }]} numberOfLines={2}>
                                {item.title}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                      <View style={styles.metaRow}>
                        <TouchableOpacity
                          onPress={() => handleDelete(item)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                          accessibilityLabel={`מחק ${item.title}`}
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                        <Text style={styles.metaDate}>נשמר {formatRelativeDate(item.savedAt)}</Text>
                      </View>
                    </View>
                  ))}
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
    width: 60,
  },
  counterChip: {
    width: 60,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "800",
    writingDirection: "rtl",
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
    paddingTop: 60,
  },
  emptyLottie: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginTop: 12,
    writingDirection: "rtl",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
    writingDirection: "rtl",
    textAlign: "center",
  },
  emptyCta: {
    marginTop: 24,
    backgroundColor: "#0c4a6e",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    borderBottomWidth: 4,
    borderBottomColor: "#082f49",
  },
  emptyCtaText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    writingDirection: "rtl",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0e7490",
    writingDirection: "rtl",
  },
  sectionCount: {
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 26,
    alignItems: "center",
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0c4a6e",
  },
  itemWrap: {
    marginBottom: 16,
  },
  simpleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  simpleRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  simpleContent: {
    alignItems: "flex-end",
  },
  simpleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    writingDirection: "rtl",
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 8,
  },
  metaDate: {
    fontSize: 12,
    color: "#64748b",
    writingDirection: "rtl",
  },
  deleteBtn: {
    padding: 4,
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