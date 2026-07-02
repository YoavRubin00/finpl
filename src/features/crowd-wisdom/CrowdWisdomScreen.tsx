import React, { useState, useMemo, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, History as HistoryIcon } from "lucide-react-native";

import { useCrowdWisdomStore } from "./useCrowdWisdomStore";
import { SEED_QUESTIONS, getQuestionsByCategory } from "./data/seedQuestions";
import { computePostVoteSnapshot, computeSentimentSnapshot } from "./lib/computeVerdict";
import { StreakHeroCard } from "./components/StreakHeroCard";
import { BullBearGauge } from "./components/BullBearGauge";
import { CategoryPills } from "./components/CategoryPills";
import { LivePollCard } from "./components/LivePollCard";
import { SliderForecastCard } from "./components/SliderForecastCard";
import { ResultCard } from "./components/ResultCard";
import { EducationalTooltipCard } from "./components/EducationalTooltipCard";
import type { CrowdWisdomCategory } from "./types";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { submitCrowdVote } from "../../db/sync/syncCrowdQuestion";
import { getIsraelDateISO } from "../../utils/israelTime";
import { useAuthStore } from "../auth/useAuthStore";
import { tokenStore } from "../../lib/auth/secureStore";
import { useEconomyUIStore } from "../economy/useEconomyUIStore";

const VOTE_COIN_REWARD = 100;

const SENTIMENT_GAUGE_QUESTION_ID = "sentiment_market_monthly";

export function CrowdWisdomScreen(): React.ReactElement {
  const router = useRouter();
  const streak = useCrowdWisdomStore((s) => s.streak);
  const votes = useCrowdWisdomStore((s) => s.votes);
  const recordVote = useCrowdWisdomStore((s) => s.recordVote);

  const [activeCategory, setActiveCategory] = useState<CrowdWisdomCategory | "all">("all");

  // Pre-compute the sentiment snapshot for the gauge (always shows the market
  // sentiment question — it's pinned at the top regardless of category filter).
  const sentimentSnapshot = useMemo(() => {
    const q = SEED_QUESTIONS.find((s) => s.id === SENTIMENT_GAUGE_QUESTION_ID);
    return q ? computeSentimentSnapshot(q) : null;
  }, []);

  const visibleQuestions = useMemo(() => {
    const cat = activeCategory === "all" ? null : activeCategory;
    const list = getQuestionsByCategory(cat);
    // Hide the sentiment-gauge question from the list since it's pinned above.
    return list.filter((q) => q.id !== SENTIMENT_GAUGE_QUESTION_ID);
  }, [activeCategory]);

  const handleSubmitVote = useCallback(
    async (questionId: string, choiceId: string) => {
      const question = SEED_QUESTIONS.find((q) => q.id === questionId);
      if (!question) return;
      const alreadyVoted = useCrowdWisdomStore.getState().votes[questionId];
      if (alreadyVoted) return;

      const snapshot = computePostVoteSnapshot(question, choiceId);

      // Record locally first — the UI flips to ResultCard instantly.
      recordVote(
        { questionId, choiceId, votedAt: Date.now() },
        snapshot.userIsWithCrowd,
      );

      // Reward immediately on a successful local vote — the user expects the
      // payout the moment they answer, regardless of remote-sync outcome.
      useEconomyUIStore.getState().addCoins(VOTE_COIN_REWARD);
      successHaptic();

      // Best-effort Neon sync. The current /api/crowd-question/vote endpoint
      // only accepts {choice: 'a' | 'b'} — crowd-wisdom choices use richer IDs
      // ('bull', 'bear', etc.). When the choice is binary-compatible we sync;
      // otherwise the vote stays local until the API is extended.
      if (choiceId === 'a' || choiceId === 'b') {
        try {
          const auth = useAuthStore.getState();
          const syncToken = await tokenStore.get();
          await submitCrowdVote({
            authId: auth.email ?? 'guest',
            syncToken,
            questionId,
            choice: choiceId,
            voteDateIL: getIsraelDateISO(),
          });
        } catch {
          /* swallow — local vote + coins already granted */
        }
      }
    },
    [recordVote],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Sticky header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            tapHaptic();
            router.replace('/(tabs)/friends' as never);
          }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          hitSlop={10}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>

        <Text accessibilityRole="header" style={styles.headerTitle}>
          חכמת ההמונים
        </Text>

        <Pressable
          onPress={() => {
            tapHaptic();
            router.push("/crowd-wisdom/history" as never);
          }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="היסטוריית הצבעות"
          hitSlop={10}
        >
          <HistoryIcon size={22} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Streak hero (only show when streak > 0 or as engaging zero-state) */}
        <StreakHeroCard streak={streak} />

        {/* 2. Bull/Bear gauge — pinned at top per user request */}
        {sentimentSnapshot ? (
          <BullBearGauge
            bullishPercent={sentimentSnapshot.bullishPercent}
            neutralPercent={sentimentSnapshot.neutralPercent}
            bearishPercent={sentimentSnapshot.bearishPercent}
            needlePosition={sentimentSnapshot.needlePosition}
            question={sentimentSnapshot.question.prompt}
            footer={`על בסיס ${sentimentSnapshot.totalVoters.toLocaleString("he-IL")} הצבעות · מתעדכן כל שעה`}
          />
        ) : null}

        {/* 2b. Weekly slider forecast — drag along a live, plausible range */}
        <SliderForecastCard />

        {/* 3. Category filter pills */}
        <CategoryPills
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />

        {/* 4. Live questions list — render LivePollCard pre-vote, ResultCard post-vote */}
        <View style={styles.questionsList}>
          {visibleQuestions.map((question) => {
            const userVote = votes[question.id];
            if (userVote) {
              const snapshot = computePostVoteSnapshot(question, userVote.choiceId);
              return (
                <React.Fragment key={question.id}>
                  <ResultCard
                    snapshot={snapshot}
                    closesInHours={question.closesInHours}
                  />
                  {question.educational ? (
                    <EducationalTooltipCard
                      title={question.educational.title}
                      body={question.educational.body}
                      example={question.educational.example}
                    />
                  ) : null}
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={question.id}>
                <LivePollCard
                  question={question}
                  onSubmit={(choiceId) => handleSubmitVote(question.id, choiceId)}
                />
                {question.educational ? (
                  <EducationalTooltipCard
                    title={question.educational.title}
                    body={question.educational.body}
                    example={question.educational.example}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
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
    gap: 14,
  },
  questionsList: {
    gap: 14,
  },
});
