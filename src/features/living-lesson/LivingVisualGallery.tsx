import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { listLivingAttachments } from "./lessonVisuals";
import { LL_COLORS, RTL_STYLE } from "./tokens";
import { VisualHost } from "./visuals/VisualHost";

const ALL = listLivingAttachments();

/**
 * Dev-only gallery: every living diagram in the registry, one under the
 * other, to check on a real device (narrow phone, low-end Android, reduced
 * motion). "סטילס" renders the finished frames, exactly what reduced motion
 * shows. Mounted by app/dev-living-visuals.tsx in development builds only.
 */
export function LivingVisualGallery() {
  const systemReduced = useReducedMotion();
  const [still, setStill] = useState(false);
  const [round, setRound] = useState(0);
  const animate = !systemReduced && !still;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.bar}>
        <Text style={styles.title}>הנפשות חיות ({ALL.length})</Text>
        <Pressable onPress={() => setStill((v) => !v)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>{still ? "תנועה" : "סטילס"}</Text>
        </Pressable>
        <Pressable onPress={() => setRound((n) => n + 1)} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>מההתחלה</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {ALL.map((item) => (
          <View key={`${item.cardId}-${round}-${animate ? "a" : "s"}`} style={styles.item}>
            <Text style={styles.meta}>
              {item.lessonId} · {item.cardId}
            </Text>
            <VisualHost visual={item.visual} animate={animate} delayMs={0} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LL_COLORS.bgDeep,
  },
  bar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    ...RTL_STYLE,
    flex: 1,
    color: LL_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: LL_COLORS.bgPanel,
    borderWidth: 1,
    borderColor: LL_COLORS.border,
  },
  buttonText: {
    color: LL_COLORS.brandCyanBright,
    fontSize: 14,
    fontWeight: "800",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 22,
  },
  item: {
    gap: 6,
  },
  meta: {
    color: LL_COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "left",
  },
});
