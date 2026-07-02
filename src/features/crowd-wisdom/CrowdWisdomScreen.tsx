import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, History as HistoryIcon } from "lucide-react-native";

import { useCrowdWisdomStore, VOTE_COIN_REWARD } from "./useCrowdWisdomStore";
import { SEED_QUESTIONS, getQuestionsByCategory } from "./data/seedQuestions";
import { computePostVoteSnapshot } from "./lib/computeVerdict";
import { getQuestionCloseTime, getTimeLeftLabel, isClosed } from "./lib/questionSchedule";
import { buildLiveBrackets, LIVE_LABELS } from "./lib/liveBrackets";
import { StreakHeroCard } from "./components/StreakHeroCard";
import { BullBearGauge } from "./components/BullBearGauge";
import { CategoryPills } from "./components/CategoryPills";
import { LivePollCard } from "./components/LivePollCard";
import { SliderForecastCard } from "./components/SliderForecastCard";
import { ResultCard } from "./components/ResultCard";
import { EducationalTooltipCard } from "./components/EducationalTooltipCard";
import type { CrowdWisdomCategory, CrowdWisdomQuestion } from "./types";
import type { LiveMarketData, RateItem } from "../live-news/liveMarketTypes";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { submitCrowdVote } from "../../db/sync/syncCrowdQuestion";
import { getIsraelDateISO } from "../../utils/israelTime";
import { getApiBase } from "../../db/apiBase";
import { useAuthStore } from "../auth/useAuthStore";
import { tokenStore } from "../../lib/auth/secureStore";
import { useEconomyUIStore } from "../economy/useEconomyUIStore";

// The market-sentiment question powers the pinned live gauge — it's rendered by
// BullBearGauge (which reads live market data), so it's excluded from the list.
const SENTIMENT_GAUGE_QUESTION_ID = "sentiment_market_monthly";

/** Bracket horizon per live-anchored forecast question. */
function forecastHorizon(id: string): "weekly" | "monthly" | "yearly" {
  if (id === "forecast_dollar_shekel") return "monthly";
  if (id === "forecast_sp500_year_end") return "yearly";
  return "weekly";
}

export function CrowdWisdomScreen(): React.ReactElement {
  const router = useRouter();
  const streak = useCrowdWisdomStore((s) => s.streak);
  const votes = useCrowdWisdomStore((s) => s.votes);
  const recordVote = useCrowdWisdomStore((s) => s.recordVote);

  const [activeCategory, setActiveCategory] = useState<CrowdWisdomCategory | "all">("all");

  // Ticking clock — drives the live countdown labels + close-based rotation.
  // One tick per minute is plenty for "Xש׳ / Xי׳" resolution.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Live market levels — fetched once, used to anchor forecast brackets to
  // today's REAL price (Yoav: no invented/stale ranges).
  const [rates, setRates] = useState<Record<string, RateItem>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/market/live`);
        if (!res.ok) return;
        const data = (await res.json()) as LiveMarketData;
        if (!cancelled && Array.isArray(data.rates)) {
          const map: Record<string, RateItem> = {};
          for (const r of data.rates) map[r.label] = r;
          setRates(map);
        }
      } catch {
        /* offline — seed fallback brackets stay */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Overlay live-anchored bracket labels onto a forecast question, keeping the
  // stable b1..b5 ids + seed vote weights. Non-forecast questions pass through.
  const applyLiveBrackets = useCallback(
    (q: CrowdWisdomQuestion): CrowdWisdomQuestion => {
      if (q.category !== "forecast") return q;
      const liveLabel = LIVE_LABELS[q.id];
      if (!liveLabel) return q; // no live source (e.g. S&P year-end) — keep seed labels
      const rate = rates[liveLabel];
      if (!rate || !Number.isFinite(rate.numericValue)) return q;
      const brackets = buildLiveBrackets(liveLabel, rate.numericValue, forecastHorizon(q.id));
      const choices = q.choices.map((c, i) =>
        brackets[i] ? { ...c, label: brackets[i].label } : c,
      );
      return { ...q, choices };
    },
    [rates],
  );

  // Visible list: drop the pinned gauge question + any closed question, then
  // rotate the remaining pool deterministically by Israel date so the list
  // stays full and rotates day-to-day (spirit of getDailyEventTopic).
  const visibleQuestions = useMemo(() => {
    const cat = activeCategory === "all" ? null : activeCategory;
    const list = getQuestionsByCategory(cat).filter((q) => q.id !== SENTIMENT_GAUGE_QUESTION_ID);
    const open = list.filter((q) => !isClosed(q, now));
    if (open.length <= 1) return open;
    const daySeed = getIsraelDateISO(now)
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const offset = daySeed % open.length;
    return [...open.slice(offset), ...open.slice(0, offset)];
  }, [activeCategory, now]);

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

      // Instant reward — fires once per question (recordVote is single-vote, and
      // the alreadyVoted guard above blocks re-fires). addCoins animates the
      // header coin counter via the economy-UI store.
      useEconomyUIStore.getState().addCoins(VOTE_COIN_REWARD);
      successHaptic();

      // Best-effort Neon sync. The current /api/crowd-question/vote endpoint
      // only accepts {choice: 'a' | 'b'} — crowd-wisdom choices use richer IDs
      // ('bull', 'bear', 'b3', etc.). When the choice is binary-compatible we
      // sync; otherwise the vote stays local until the API is extended.
      if (choiceId === "a" || choiceId === "b") {
        try {
          const auth = useAuthStore.getState();
          const syncToken = await tokenStore.get();
          await submitCrowdVote({
            authId: auth.email ?? "guest",
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
            router.replace("/(tabs)/friends" as never);
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

        {/* 2. Bull/Bear gauge — LIVE market sentiment, pinned at top */}
        <BullBearGauge />

        {/* 2b. Weekly slider forecast — drag along a live, plausible range */}
        <SliderForecastCard />

        {/* 3. Category filter pills */}
        <CategoryPills activeCategory={activeCategory} onChange={setActiveCategory} />

        {/* 4. Live questions list — LivePollCard pre-vote, ResultCard post-vote */}
        <View style={styles.questionsList}>
          {visibleQuestions.map((rawQuestion) => {
            const question = applyLiveBrackets(rawQuestion);
            const timeLeftLabel = getTimeLeftLabel(getQuestionCloseTime(question, now), now);
            const userVote = votes[question.id];
            if (userVote) {
              const snapshot = computePostVoteSnapshot(question, userVote.choiceId);
              return (
                <React.Fragment key={question.id}>
                  <ResultCard snapshot={snapshot} timeLeftLabel={timeLeftLabel} />
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
                  timeLeftLabel={timeLeftLabel}
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
