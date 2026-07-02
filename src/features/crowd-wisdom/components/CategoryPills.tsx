import React from "react";
import { ScrollView, Pressable, View, Text, StyleSheet } from "react-native";
import { tapHaptic } from "../../../utils/haptics";
import type { CrowdWisdomCategory } from "../types";

interface CategoryDef {
  key: CrowdWisdomCategory | "all";
  label: string;
  glyph: string;
}

const CATEGORIES: readonly CategoryDef[] = [
  { key: "all",       label: "הכל",      glyph: "✨" },
  { key: "yes_no",    label: "כן/לא",   glyph: "⚖️" },
  { key: "sentiment", label: "סנטימנט",  glyph: "🎯" },
  { key: "choice",    label: "בחירה",    glyph: "🎲" },
  { key: "forecast",  label: "תחזית",    glyph: "🔮" },
];

interface CategoryPillsProps {
  activeCategory: CrowdWisdomCategory | "all";
  onChange: (cat: CrowdWisdomCategory | "all") => void;
}

export function CategoryPills({ activeCategory, onChange }: CategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ flexGrow: 0 }}
    >
      <View style={styles.row}>
        {CATEGORIES.map((cat) => {
          const active = cat.key === activeCategory;
          return (
            <Pressable
              key={cat.key}
              onPress={() => {
                tapHaptic();
                onChange(cat.key);
              }}
              style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.pillGlyph}>{cat.glyph}</Text>
              <Text
                style={[
                  styles.pillLabel,
                  active ? styles.pillLabelActive : styles.pillLabelInactive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  pill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1.5,
  },
  pillActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  pillInactive: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  pillGlyph: {
    fontSize: 13,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  pillLabelActive: {
    color: "#ffffff",
  },
  pillLabelInactive: {
    color: "#475569",
  },
});