import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import {
  useCrowdWisdomStore,
  selectMonthlyAccuracy,
} from "./useCrowdWisdomStore";
import { getQuestionById } from "./data/seedQuestions";
import { computePostVoteSnapshot } from "./lib/computeVerdict";
import { AccuracyHeroCard } from "./components/AccuracyHeroCard";
import { HistoryRow } from "./components/HistoryRow";
import { tapHaptic } from "../../utils/haptics";
import type { HistoryEntry } from "./types";

export function CrowdWisdomHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const votes = useCrowdWisdomStore((s) => s.votes);
  const outcomes = useCrowdWisdomStore((s) => s.outcomes);
  const accuracyInfo = useCrowdWisdomStore(selectMonthlyAccuracy);

  // Build history rows from the persisted vote map.
  const historyEntries = useMemo<HistoryEntry[]>(() => {
    const rows: HistoryEntry[] = [];
    for (const vote of Object.values(votes)) {
      const question = getQuestionById(vote.questionId);
      if (!question) continue;
      const snapshot = computePostVoteSnapshot(question, vote.choiceId);
      const majorityRow = snapshot.distribution.find(
        (d) => d.choiceId === snapshot.majorityChoiceId,
      );
      rows.push({
        question,
        userVote: vote,
        outcome: outcomes[vote.questionId],
        crowdMajority: {
          choiceId: snapshot.majorityChoiceId,
          percent: majorityRow?.percent ?? 0,
        },
      });
    }
    // Newest first.
    rows.sort((a, b) => b.userVote.votedAt - a.userVote.votedAt);
    return rows;
  }, [votes, outcomes]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            tapHaptic();
            router.back();
          }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          hitSlop={10}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>

        <Text accessibilityRole="header" style={styles.headerTitle}>
          היסטוריית הצבעות
        </Text>

        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AccuracyHeroCard
          accuracy={accuracyInfo.accuracy}
          resolvedCount={accuracyInfo.resolvedCount}
        />

        <Text style={styles.sectionTitle}>הצבעות אחרונות</Text>

        {historyEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>אין הצבעות עדיין</Text>
            <Text style={styles.emptyBody}>
              צאו לחקור — כל הצבעה תקפוץ לרשימה כאן ותעזור לבנות את הסטטיסטיקה
              של דיוק החיזוי.
            </Text>
          </View>
        ) : (
          historyEntries.map((entry, i) => (
            <HistoryRow key={entry.userVote.questionId} entry={entry} index={i} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
    lineHeight: 19,
    writingDirection: "rtl",
    textAlign: "right",
  },
});
