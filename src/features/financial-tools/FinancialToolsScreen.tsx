import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  FileText,
  TrendingUp,
  Rocket,
  PieChart,
  LineChart,
  Wallet,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react-native";

import { STITCH } from "../../constants/theme";
import { tapHaptic } from "../../utils/haptics";

/**
 * Financial Tools hub — the 6th global tab, anchored rightmost in the RTL
 * bottom tab bar. Surfaces calculators and analyzers that previously lived
 * inside MoreScreen, plus three teaser entries for upcoming features.
 */

type ToolStatus = "active" | "coming_soon";

interface ToolEntry {
  key: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  accentColor: string;
  status: ToolStatus;
  /** Route to push when status === 'active'. Ignored for coming-soon entries. */
  route?: string;
}

const TOOLS: readonly ToolEntry[] = [
  {
    key: "payslip",
    label: "קריאת תלוש שכר",
    description: "ניתוח AI של תלוש משכורת עם שארק רואה החשבון",
    Icon: FileText,
    accentColor: "#005bb1",
    status: "active",
    route: "/payslip-analyzer",
  },
  {
    key: "compound",
    label: "מחשבון ריבית דריבית",
    description: "כמה הכסף שלך יגדל לאורך זמן",
    Icon: TrendingUp,
    accentColor: "#0891b2",
    status: "active",
    route: "/compound-calculator",
  },
  {
    key: "fire",
    label: "מחשבון FIRE",
    description: "מסלול לעצמאות כלכלית מוקדמת",
    Icon: Rocket,
    accentColor: "#7c3aed",
    status: "active",
    route: "/fire-calculator",
  },
  {
    key: "portfolio",
    label: "מנתח תיקי מניות",
    description: "ניתוח חכם של פיזור והסיכון בתיק",
    Icon: PieChart,
    accentColor: "#94a3b8",
    status: "coming_soon",
  },
  {
    key: "analyst",
    label: "אנליסט מניות",
    description: "תחזיות AI על מניות בודדות",
    Icon: LineChart,
    accentColor: "#94a3b8",
    status: "coming_soon",
  },
  {
    key: "cashflow",
    label: "ניהול תזרים חודשי",
    description: "מעקב הכנסות והוצאות עם AI",
    Icon: Wallet,
    accentColor: "#94a3b8",
    status: "coming_soon",
  },
];

function ToolCard({ tool, index }: { tool: ToolEntry; index: number }) {
  const router = useRouter();
  const isComingSoon = tool.status === "coming_soon";
  const { Icon } = tool;

  const handlePress = () => {
    if (isComingSoon) {
      tapHaptic();
      return;
    }
    if (tool.route) {
      tapHaptic();
      router.push(tool.route as never);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 60).duration(360)}>
      <Pressable
        style={[
          styles.card,
          isComingSoon && styles.cardDisabled,
        ]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={tool.label}
        accessibilityHint={isComingSoon ? "בקרוב — כלי זה עדיין לא זמין" : tool.description}
        accessibilityState={{ disabled: isComingSoon }}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isComingSoon ? "#e2e8f0" : tool.accentColor },
          ]}
        >
          <Icon size={26} color={isComingSoon ? "#94a3b8" : "#ffffff"} strokeWidth={2.4} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text
              style={[
                styles.cardLabel,
                isComingSoon && styles.cardLabelDisabled,
              ]}
            >
              {tool.label}
            </Text>
            {isComingSoon ? (
              <View style={styles.comingSoonChip}>
                <Text style={styles.comingSoonChipText}>בקרוב</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.cardDescription,
              isComingSoon && styles.cardDescriptionDisabled,
            ]}
            numberOfLines={2}
          >
            {tool.description}
          </Text>
        </View>

        {!isComingSoon ? (
          <ChevronLeft size={20} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function FinancialToolsScreen(): React.ReactElement {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Text style={styles.headerEmoji}>🧰</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            כלים פיננסיים
          </Text>
          <Text style={styles.headerSubtitle}>
            מחשבונים ומנתחים לקבלת החלטות חכמות
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {TOOLS.map((tool, i) => (
          <ToolCard key={tool.key} tool={tool} index={i} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            עוד כלים בדרך — נשמח לשמוע אילו כלים יעזרו לכם הכי הרבה.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: STITCH.background,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "right",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: "#f8fafc",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "right",
    flexShrink: 1,
  },
  cardLabelDisabled: {
    color: STITCH.onSurfaceVariant,
  },
  cardDescription: {
    fontSize: 12,
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 17,
  },
  cardDescriptionDisabled: {
    color: "#94a3b8",
  },
  comingSoonChip: {
    backgroundColor: "#cbd5e1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    writingDirection: "rtl",
  },
  footer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
