import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import type { LoungeTable } from "./loungeConfig";
import type { ClubDrop } from "./clubContent";

/**
 * דק-השולחן — הדרופ היומי כקלפים הניתנים ל-swipe.
 *
 * פאנל-UI שנפתח מעל הסצנה המזוממת (לא חלק מהתמונה). עמוד = קלף יחיד
 * (paging מצבי, לא ScrollView — הדפוס ה-RTL-בטוח של CarouselSheet);
 * גרירה נותנת tilt עדין (הקלף מרגיש חפץ, לא מסך), והעמוד האחרון הוא
 * "המהלך של היום" מאחורי reveal — מיקרו-הפתעה שסוגרת כל דרופ באקשן.
 */
export function TableDeck({
  table,
  drop,
  onComplete,
  onBack,
}: {
  table: LoungeTable;
  drop: ClubDrop;
  onComplete: () => void;
  onBack: () => void;
}): React.ReactElement {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [actionRevealed, setActionRevealed] = useState(false);
  const total = drop.cards.length + 1; // קלפי-תובנה + קלף-המהלך
  const isActionPage = page === total - 1;

  // tilt-בגרירה: הקלף נוטה עם האצבע וחוזר בספרינג — game-feel זול (UI-thread)
  const dragX = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value * 0.35 },
      { rotateZ: `${dragX.value * 0.018}deg` },
    ],
  }));

  const go = useCallback(
    (dir: number) => {
      tapHaptic();
      setPage((p) => Math.max(0, Math.min(total - 1, p + dir)));
    },
    [total],
  );

  // RTL: גרירה ימינה = קדימה (העמוד הבא "יושב" משמאל), שמאלה = אחורה
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      "worklet";
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      "worklet";
      dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
      if (e.translationX >= 44 || e.velocityX >= 500) runOnJS(go)(1);
      else if (e.translationX <= -44 || e.velocityX <= -500) runOnJS(go)(-1);
    });

  const card = drop.cards[page];
  const cardW = Math.min(width - 48, 420);

  return (
    // delay קטן אחרי תחילת-הזום — המצלמה "מספרת" קודם, הדק נוחת אחריה
    <Animated.View entering={FadeInUp.delay(140).duration(260)} style={styles.wrap} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, { width: cardW, borderColor: table.accent }, cardStyle]}>
          <View style={[styles.tableTag, { backgroundColor: `${table.accent}22`, borderColor: table.accent }]}>
            <Text style={styles.tableTagText} allowFontScaling={false}>
              {table.emoji} שולחן {table.titleHe}
            </Text>
          </View>

          {isActionPage ? (
            <View style={styles.actionArea}>
              <Text style={styles.actionLabel} allowFontScaling={false}>המהלך של היום</Text>
              {actionRevealed ? (
                <Animated.View entering={FadeIn.duration(220)}>
                  <Text style={styles.actionText}>{drop.actionHe}</Text>
                </Animated.View>
              ) : (
                <Pressable
                  onPress={() => {
                    successHaptic();
                    setActionRevealed(true);
                  }}
                  style={[styles.revealBtn, { borderColor: table.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel="חשוף את המהלך של היום"
                >
                  <Text style={styles.revealEmoji} allowFontScaling={false}>🎁</Text>
                  <Text style={styles.revealText} allowFontScaling={false}>גע כדי לחשוף</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.cardEmoji} allowFontScaling={false}>{card.emoji}</Text>
              <Text style={styles.cardTitle}>{card.titleHe}</Text>
              <Text style={styles.cardBody}>{card.bodyHe}</Text>
            </>
          )}

          {/* מונה + נקודות התקדמות (RTL) */}
          <View style={styles.dotsRow}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={[styles.dot, i === page && { width: 20, backgroundColor: table.accent }]} />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={() => {
            tapHaptic();
            onBack();
          }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="חזרה לטרקלין"
        >
          <Text style={styles.backText} allowFontScaling={false}>← לטרקלין</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (isActionPage) {
              if (!actionRevealed) {
                successHaptic();
                setActionRevealed(true);
                return;
              }
              onComplete();
            } else {
              go(1);
            }
          }}
          style={[styles.ctaBtn, { backgroundColor: table.accent }]}
          accessibilityRole="button"
          accessibilityLabel={isActionPage ? (actionRevealed ? "סגור שולחן" : "חשוף את המהלך") : "לקלף הבא"}
        >
          <Text style={styles.ctaText} allowFontScaling={false}>
            {isActionPage ? (actionRevealed ? "סגרתי ✓" : "חשוף 🎁") : "המשך"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    minHeight: 280,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    alignItems: "center",
  },
  tableTag: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  tableTagText: { fontSize: 12.5, fontWeight: "800", color: "#0f172a", writingDirection: "rtl" },
  cardEmoji: { fontSize: 44, marginBottom: 8 },
  cardTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15.5,
    lineHeight: 24,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
    writingDirection: "rtl",
  },
  actionArea: { alignItems: "center", paddingVertical: 8, flexGrow: 1, justifyContent: "center" },
  actionLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#b45309",
    letterSpacing: 0.4,
    marginBottom: 12,
    writingDirection: "rtl",
  },
  revealBtn: {
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 20,
    paddingHorizontal: 34,
    paddingVertical: 22,
    backgroundColor: "#fffbeb",
  },
  revealEmoji: { fontSize: 34, marginBottom: 6 },
  revealText: { fontSize: 14, fontWeight: "800", color: "#92400e", writingDirection: "rtl" },
  actionText: {
    fontSize: 16.5,
    lineHeight: 26,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    writingDirection: "rtl",
  },
  dotsRow: {
    flexDirection: "row-reverse",
    gap: 6,
    marginTop: 16,
    alignItems: "center",
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#cbd5e1" },
  ctaRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 18,
    alignItems: "center",
  },
  ctaBtn: {
    borderRadius: 16,
    paddingHorizontal: 30,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaText: { color: "#0b1220", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  backBtn: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  backText: { color: "#e2e8f0", fontSize: 14, fontWeight: "800", writingDirection: "rtl" },
});
