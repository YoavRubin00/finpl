import { useMemo } from "react";
import { View, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useShallow } from "zustand/react/shallow";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useDailyChallengesStore } from "../daily-challenges/use-daily-challenges-store";
import type { PlayCountMap } from "../daily-challenges/daily-challenge-types";
import { useUserStatsStore } from "./useUserStatsStore";
import { useTheme } from "../../hooks/useTheme";
import { STITCH } from "../../constants/theme";

interface StatDef {
  key: string;
  emoji: string;
  label: string;
  accent: string;
}

const STAT_DEFS: StatDef[] = [
  { key: "activeDays",       emoji: "📅", label: "ימי פעילות",   accent: STITCH.primaryCyan },
  { key: "avgModulesPerDay", emoji: "📚", label: "מודולות ביום", accent: "#7c3aed" },
  { key: "avgGamesPerDay",   emoji: "🎮", label: "משחקים ביום",  accent: "#16a34a" },
  { key: "quizAccuracy",     emoji: "🎯", label: "דיוק בקוויז",  accent: "#ea580c" },
  { key: "avgModuleTime",    emoji: "⏱️", label: "זמן למודולה",  accent: "#ca8a04" },
  { key: "avgDailyTime",     emoji: "🕐", label: "זמן יומי",     accent: "#dc2626" },
  { key: "peakHour",         emoji: "🌟", label: "שעת שיא",      accent: "#8b5cf6" },
  { key: "dilemmaAccuracy",  emoji: "🤔", label: "דיוק דילמות",  accent: "#0284c7" },
];

function sumPlayMap(map: PlayCountMap): number {
  return Object.values(map).reduce((s, n) => s + n, 0);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}ש׳`;
}

function computeStats(
  activeDates: string[],
  recentActivityHours: number[],
  chapterProgress: ReturnType<typeof useChapterStore.getState>["progress"],
  dilemmaPlays: PlayCountMap,
  investmentPlays: PlayCountMap,
  crashGamePlays: PlayCountMap,
  swipeGamePlays: PlayCountMap,
  bullshitSwipePlays: PlayCountMap,
  higherLowerPlays: PlayCountMap,
  budgetNinjaPlays: PlayCountMap,
  priceSliderPlays: PlayCountMap,
  cashoutRushPlays: PlayCountMap,
  fomoKillerPlays: PlayCountMap,
  dilemmaCorrectCount: number,
  moduleDurations: number[],
  dailySessionSeconds: Record<string, number>,
): Record<string, { value: string; sublabel: string }> {
  const activeDayCount = activeDates.length;

  // 1. Active days
  const activeDaysValue = String(activeDayCount || "--");

  // 2. Avg modules/day
  const totalModules = Object.values(chapterProgress).reduce(
    (s, ch) => s + (ch?.completedModules?.length ?? 0), 0
  );
  const avgModulesPerDay = activeDayCount > 0 && totalModules > 0
    ? (totalModules / activeDayCount).toFixed(1)
    : "--";

  // 3. Avg minigames/day
  const allMaps = [
    dilemmaPlays, investmentPlays, crashGamePlays, swipeGamePlays,
    bullshitSwipePlays, higherLowerPlays, budgetNinjaPlays,
    priceSliderPlays, cashoutRushPlays, fomoKillerPlays,
  ];
  const totalPlays = allMaps.reduce((s, m) => s + sumPlayMap(m), 0);
  const avgGamesPerDay = activeDayCount > 0 && totalPlays > 0
    ? (totalPlays / activeDayCount).toFixed(1)
    : "--";

  // 4. Quiz accuracy
  let totalCorrect = 0, totalAnswered = 0;
  for (const ch of Object.values(chapterProgress)) {
    for (const qr of Object.values(ch?.quizResults ?? {})) {
      totalCorrect += qr.correct;
      totalAnswered += qr.total;
    }
  }
  const quizAccuracy = totalAnswered >= 5
    ? `${Math.round((totalCorrect / totalAnswered) * 100)}%`
    : "--";

  // 5. Avg module time (instrumented)
  let avgModuleTime = "--";
  if (moduleDurations.length > 0) {
    const avg = moduleDurations.reduce((s, n) => s + n, 0) / moduleDurations.length;
    avgModuleTime = formatDuration(avg);
  }

  // 6. Avg daily session time (instrumented)
  const sessionValues = Object.values(dailySessionSeconds);
  let avgDailyTime = "--";
  if (sessionValues.length > 0) {
    const avgSec = sessionValues.reduce((s, n) => s + n, 0) / sessionValues.length;
    const m = Math.floor(avgSec / 60);
    avgDailyTime = m >= 1 ? `${m} דק׳` : `<1 דק׳`;
  }

  // 7. Peak activity hour
  let peakHour = "--";
  if (recentActivityHours.length > 0) {
    const freq: Record<number, number> = {};
    for (const h of recentActivityHours) freq[h] = (freq[h] ?? 0) + 1;
    const peak = Number(
      Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
    );
    peakHour = `${peak}:00`;
  }

  // 8. Dilemma accuracy
  const totalDilemmaPlays = sumPlayMap(dilemmaPlays);
  const dilemmaAccuracy = totalDilemmaPlays >= 3
    ? `${Math.round((dilemmaCorrectCount / totalDilemmaPlays) * 100)}%`
    : "--";

  return {
    activeDays:       { value: activeDaysValue,    sublabel: "מתוך 90 יום" },
    avgModulesPerDay: { value: avgModulesPerDay,    sublabel: "ממוצע" },
    avgGamesPerDay:   { value: avgGamesPerDay,      sublabel: "ממוצע" },
    quizAccuracy:     { value: quizAccuracy,        sublabel: "כל הפרקים" },
    avgModuleTime:    { value: avgModuleTime,        sublabel: "ממוצע" },
    avgDailyTime:     { value: avgDailyTime,         sublabel: "ממוצע" },
    peakHour:         { value: peakHour,             sublabel: "14 פגישות אחרונות" },
    dilemmaAccuracy:  { value: dilemmaAccuracy,      sublabel: "דילמות יומיות" },
  };
}

function StatCard({
  def,
  value,
  sublabel,
  index,
}: {
  def: StatDef;
  value: string;
  sublabel: string;
  index: number;
}) {
  const theme = useTheme();
  const isNoData = value === "--";

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(350)}
      style={{ width: "47%" }}
      accessible
      accessibilityLabel={`${def.label}: ${isNoData ? "מתחיל להצטבר" : value}`}
    >
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: theme.border,
          borderTopWidth: 3,
          borderTopColor: def.accent,
          padding: 14,
          shadowColor: def.accent,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
          alignItems: "flex-end",
        }}
      >
        <Text style={{ fontSize: 20, marginBottom: 4 }} accessible={false}>{def.emoji}</Text>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            color: isNoData ? theme.textMuted : theme.text,
            writingDirection: "rtl",
            includeFontPadding: false,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: theme.text,
            writingDirection: "rtl",
            textAlign: "right",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {def.label}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: isNoData ? def.accent : theme.textMuted,
            writingDirection: "rtl",
            textAlign: "right",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {isNoData ? "מתחיל להצטבר" : sublabel}
        </Text>
      </View>
    </Animated.View>
  );
}

export function PersonalStatsSection() {
  const theme = useTheme();

  const activeDates = useEconomyStore((s) => s.activeDates);
  const recentActivityHours = useEconomyStore((s) => s.recentActivityHours);

  const chapterProgress = useChapterStore(useShallow((s) => s.progress));

  const challenges = useDailyChallengesStore(
    useShallow((s) => ({
      dilemmaPlays: s.dilemmaPlays,
      investmentPlays: s.investmentPlays,
      crashGamePlays: s.crashGamePlays,
      swipeGamePlays: s.swipeGamePlays,
      bullshitSwipePlays: s.bullshitSwipePlays,
      higherLowerPlays: s.higherLowerPlays,
      budgetNinjaPlays: s.budgetNinjaPlays,
      priceSliderPlays: s.priceSliderPlays,
      cashoutRushPlays: s.cashoutRushPlays,
      fomoKillerPlays: s.fomoKillerPlays,
      dilemmaCorrectCount: s.dilemmaCorrectCount,
    }))
  );

  const { moduleDurations, dailySessionSeconds } = useUserStatsStore(
    useShallow((s) => ({
      moduleDurations: s.moduleDurations,
      dailySessionSeconds: s.dailySessionSeconds,
    }))
  );

  const stats = useMemo(
    () =>
      computeStats(
        activeDates,
        recentActivityHours ?? [],
        chapterProgress,
        challenges.dilemmaPlays,
        challenges.investmentPlays,
        challenges.crashGamePlays,
        challenges.swipeGamePlays,
        challenges.bullshitSwipePlays,
        challenges.higherLowerPlays,
        challenges.budgetNinjaPlays,
        challenges.priceSliderPlays,
        challenges.cashoutRushPlays,
        challenges.fomoKillerPlays,
        challenges.dilemmaCorrectCount,
        moduleDurations,
        dailySessionSeconds,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDates, recentActivityHours, chapterProgress, challenges, moduleDurations, dailySessionSeconds]
  );

  return (
    <View style={{ marginTop: 24, marginBottom: 8, paddingHorizontal: 4 }}>
      {/* Section header */}
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
        accessible={false}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "900",
            color: theme.text,
            writingDirection: "rtl",
          }}
        >
          📊 סטטיסטיקה אישית
        </Text>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: theme.border,
          }}
          accessible={false}
        />
      </View>

      {/* 2-column grid — row-reverse so first item is top-right (RTL) */}
      <View
        style={{
          flexDirection: "row-reverse",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "flex-start",
        }}
      >
        {STAT_DEFS.map((def, i) => {
          const { value, sublabel } = stats[def.key];
          return (
            <StatCard
              key={def.key}
              def={def}
              value={value}
              sublabel={sublabel}
              index={i}
            />
          );
        })}
      </View>
    </View>
  );
}
