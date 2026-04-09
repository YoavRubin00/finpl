import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { Swords, Trophy, XCircle, Minus, Flame, Zap } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { CLASH, TEXT_SHADOW } from "../../constants/theme";
import { tapHaptic, heavyHaptic } from "../../utils/haptics";
import { DiamondBackground } from "../../components/ui/DiamondBackground";
import { GoldBorderCard } from "../../components/ui/GoldBorderCard";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { useDuelsStore } from "./useDuelsStore";
import { DUEL_WIN_COINS, DUEL_LOSS_COINS, DUEL_DRAW_COINS, DUEL_WIN_GEMS, DUEL_DURATION_SEC } from "./duelData";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecordBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={recordStyles.badge}>
      <Text style={[recordStyles.value, { color }]}>{value}</Text>
      <Text style={recordStyles.label}>{label}</Text>
    </View>
  );
}

const recordStyles = StyleSheet.create({
  badge: { alignItems: "center", minWidth: 60 },
  value: { fontSize: 28, fontWeight: "900", ...TEXT_SHADOW },
  label: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginTop: 2 },
});

// ---------------------------------------------------------------------------
// Searching overlay
// ---------------------------------------------------------------------------

function SearchingOverlay({ onCancel }: { onCancel: () => void }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={searchStyles.overlay}>
      <Animated.View style={spinStyle}>
        <Swords size={48} color={CLASH.goldLight} />
      </Animated.View>
      <Text style={searchStyles.title}>{"מחפש יריב..."}</Text>
      <Text style={searchStyles.subtitle}>{"מתחבר לשרת הקרבות"}</Text>
      <ActivityIndicator color={CLASH.goldBorder} style={{ marginTop: 16 }} />
      <View style={{ marginTop: 24, width: "100%" }}>
        <SupercellButton label="ביטול" variant="orange" size="sm" onPress={onCancel} />
      </View>
    </Animated.View>
  );
}

const searchStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
    zIndex: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    marginTop: 20,
    ...TEXT_SHADOW,
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 6,
    writingDirection: "rtl",
  },
});

// ---------------------------------------------------------------------------
// Duel gameplay
// ---------------------------------------------------------------------------

function TimerBar({ timeRemaining }: { timeRemaining: number }) {
  const progress = timeRemaining / DUEL_DURATION_SEC;
  const isUrgent = timeRemaining <= 10;
  const barColor = isUrgent ? "#ef4444" : timeRemaining <= 20 ? "#f59e0b" : "#4ade80";
  const screenWidth = Dimensions.get("window").width - 32;

  const widthAnim = useSharedValue(progress * screenWidth);

  useEffect(() => {
    widthAnim.value = withTiming(progress * screenWidth, { duration: 900, easing: Easing.linear });
  }, [progress, screenWidth, widthAnim]);

  const barStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    backgroundColor: barColor,
  }));

  return (
    <View style={timerBarStyles.track}>
      <Animated.View style={[timerBarStyles.fill, barStyle]} />
    </View>
  );
}

const timerBarStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});

function StreakBadge({ streak }: { streak: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 8 }),
      );
    }
  }, [streak, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (streak < 2) return null;

  return (
    <Animated.View style={[streakStyles.container, animStyle]}>
      <Flame size={16} color="#f59e0b" />
      <Text style={streakStyles.text}>{streak}</Text>
    </Animated.View>
  );
}

const streakStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
    gap: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: "900",
    color: "#f59e0b",
  },
});

const FEEDBACK_DELAY_MS = 600;

function DuelGameplay() {
  const currentMatch = useDuelsStore((s) => s.currentMatch);
  const answerQuestion = useDuelsStore((s) => s.answerQuestion);
  const clearFeedback = useDuelsStore((s) => s.clearFeedback);
  const tickTimer = useDuelsStore((s) => s.tickTimer);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [questionKey, setQuestionKey] = useState(0);

  useEffect(() => {
    if (currentMatch?.status !== "playing") return;
    timerRef.current = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentMatch?.status, tickTimer]);

  // Auto-advance after feedback
  useEffect(() => {
    if (!currentMatch?.answerFeedback) return;
    feedbackTimeoutRef.current = setTimeout(() => {
      clearFeedback();
      setQuestionKey((k) => k + 1);
    }, FEEDBACK_DELAY_MS);
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [currentMatch?.answerFeedback, clearFeedback]);

  if (!currentMatch || currentMatch.status !== "playing") return null;

  const question = currentMatch.questions[currentMatch.currentQuestionIndex];
  if (!question) return null;

  const feedback = currentMatch.answerFeedback;
  const isUrgent = currentMatch.timeRemaining <= 10;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={gameStyles.container}>
      {/* Timer bar */}
      <TimerBar timeRemaining={currentMatch.timeRemaining} />

      {/* Header bar */}
      <View style={gameStyles.header}>
        <View style={gameStyles.scoreBubble}>
          <Text style={gameStyles.scoreLabel}>{"אתה"}</Text>
          <Text style={gameStyles.scoreValue}>{currentMatch.playerScore}</Text>
        </View>
        <View style={gameStyles.timerCenter}>
          <View style={[gameStyles.timerBubble, isUrgent && gameStyles.timerUrgent]}>
            <Text style={[gameStyles.timerText, isUrgent && gameStyles.timerTextUrgent]}>
              {currentMatch.timeRemaining}s
            </Text>
          </View>
          <StreakBadge streak={currentMatch.streak} />
        </View>
        <View style={gameStyles.scoreBubble}>
          <Text style={gameStyles.scoreLabel}>{currentMatch.opponent.name.split(" ")[0]}</Text>
          <Text style={gameStyles.scoreValue}>{currentMatch.opponentScore}</Text>
        </View>
      </View>

      {/* Answered count */}
      <View style={gameStyles.answeredRow}>
        <Zap size={14} color="#71717a" />
        <Text style={gameStyles.answeredText}>{`${currentMatch.totalAnswered} תשובות`}</Text>
      </View>

      {/* Question */}
      <Animated.View key={questionKey} entering={SlideInRight.duration(250)} exiting={SlideOutLeft.duration(200)}>
        <GoldBorderCard variant="blue">
          <Text style={gameStyles.question}>{question.question}</Text>
        </GoldBorderCard>
      </Animated.View>

      {/* Options */}
      <View style={gameStyles.options}>
        {question.options.map((opt, idx) => {
          let variant: "blue" | "green" | "orange" = idx % 2 === 0 ? "blue" : "green";
          if (feedback) {
            if (idx === feedback.correctIndex) variant = "green";
            else if (idx === feedback.selectedIndex && !feedback.isCorrect) variant = "orange";
          }
          return (
            <SupercellButton
              key={`${question.id}-${idx}`}
              label={opt}
              variant={variant}
              size="sm"
              onPress={() => {
                if (feedback) return;
                tapHaptic();
                answerQuestion(idx);
                if (idx === question.correctAnswer) {
                  tapHaptic();
                } else {
                  heavyHaptic();
                }
              }}
            />
          );
        })}
      </View>

      {/* Feedback flash */}
      {feedback && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[
            gameStyles.feedbackBanner,
            { backgroundColor: feedback.isCorrect ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)" },
          ]}
        >
          <Text style={[gameStyles.feedbackText, { color: feedback.isCorrect ? "#4ade80" : "#ef4444" }]}>
            {feedback.isCorrect ? "נכון!" : "לא נכון"}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const gameStyles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scoreBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scoreLabel: { fontSize: 11, fontWeight: "600", color: "#94a3b8", writingDirection: "rtl" },
  scoreValue: { fontSize: 24, fontWeight: "900", color: "#fff", ...TEXT_SHADOW },
  timerCenter: { alignItems: "center", gap: 6 },
  timerBubble: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  timerUrgent: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  timerText: { fontSize: 20, fontWeight: "900", color: "#4ade80" },
  timerTextUrgent: { color: "#ef4444" },
  answeredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 10,
  },
  answeredText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#71717a",
    writingDirection: "rtl",
  },
  question: {
    fontSize: 17,
    fontWeight: "700",
    color: "#e4e4e7",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 26,
  },
  options: { marginTop: 16, gap: 10 },
  feedbackBanner: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: "900",
    ...TEXT_SHADOW,
  },
});

// ---------------------------------------------------------------------------
// Results overlay
// ---------------------------------------------------------------------------

function DuelResults({ onPlayAgain }: { onPlayAgain: () => void }) {
  const currentMatch = useDuelsStore((s) => s.currentMatch);
  const record = useDuelsStore((s) => s.record);
  const resetMatch = useDuelsStore((s) => s.resetMatch);
  const router = useRouter();
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    heavyHaptic();
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!currentMatch || currentMatch.status !== "finished") return null;

  const playerWon = currentMatch.playerScore > currentMatch.opponentScore;
  const isDraw = currentMatch.playerScore === currentMatch.opponentScore;
  const resultText = playerWon ? "ניצחון!" : isDraw ? "תיקו!" : "הפסד";
  const resultColor = playerWon ? "#4ade80" : isDraw ? "#fbbf24" : "#ef4444";
  const coinsEarned = playerWon ? DUEL_WIN_COINS : isDraw ? DUEL_DRAW_COINS : DUEL_LOSS_COINS;
  const ResultIcon = playerWon ? Trophy : isDraw ? Minus : XCircle;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={resultStyles.overlay}>
      <Animated.View style={[resultStyles.card, animStyle]}>
        <GoldBorderCard variant={playerWon ? "gold" : "purple"} shimmer={playerWon}>
          <View style={resultStyles.inner}>
            {playerWon ? (
              <View style={{ width: 56, height: 56, overflow: "hidden" }}>
                <LottieView
                  source={require("../../../assets/lottie/wired-flat-3051-pot-gold-hover-pinch.json")}
                  style={{ width: 56, height: 56 }}
                  autoPlay
                  loop
                />
              </View>
            ) : (
              <ResultIcon size={48} color={resultColor} />
            )}
            <Text style={[resultStyles.title, { color: resultColor }]}>{resultText}</Text>

            <View style={resultStyles.scoreRow}>
              <Text style={resultStyles.scoreSide}>{currentMatch.playerScore}</Text>
              <Text style={resultStyles.scoreDivider}>{" - "}</Text>
              <Text style={resultStyles.scoreSide}>{currentMatch.opponentScore}</Text>
            </View>

            <Text style={resultStyles.coins}>{`+${coinsEarned} מטבעות`}</Text>
            {playerWon && (
              <Text style={resultStyles.gems}>{`+${DUEL_WIN_GEMS} ג'מס 💎`}</Text>
            )}

            {currentMatch.totalAnswered > 0 && (
              <View style={resultStyles.duelStats}>
                <Text style={resultStyles.duelStatText}>
                  {`${currentMatch.totalAnswered} תשובות`}
                </Text>
                {currentMatch.bestStreak >= 2 && (
                  <View style={resultStyles.streakStat}>
                    <Flame size={14} color="#f59e0b" />
                    <Text style={resultStyles.duelStatText}>
                      {`רצף ${currentMatch.bestStreak}`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={resultStyles.statsRow}>
              <RecordBadge label="ניצחונות" value={record.wins} color="#4ade80" />
              <RecordBadge label="הפסדים" value={record.losses} color="#ef4444" />
              <RecordBadge label="תיקו" value={record.draws} color="#fbbf24" />
            </View>

            <View style={resultStyles.actions}>
              <SupercellButton label="שחק שוב" variant="green" onPress={onPlayAgain} />
              <SupercellButton label="חזרה" variant="blue" size="sm" onPress={() => {
                resetMatch();
                router.back();
              }} />
            </View>
          </View>
        </GoldBorderCard>
      </Animated.View>
    </Animated.View>
  );
}

const resultStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 50,
  },
  card: { width: "100%" },
  inner: { alignItems: "center", paddingVertical: 8 },
  title: { fontSize: 32, fontWeight: "900", marginTop: 12, ...TEXT_SHADOW },
  scoreRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  scoreSide: { fontSize: 36, fontWeight: "900", color: "#fff", ...TEXT_SHADOW },
  scoreDivider: { fontSize: 24, fontWeight: "700", color: "#52525b", marginHorizontal: 8 },
  coins: { fontSize: 16, fontWeight: "700", color: CLASH.goldLight, marginTop: 12, writingDirection: "rtl" },
  gems: { fontSize: 14, fontWeight: "700", color: "#a78bfa", marginTop: 4, writingDirection: "rtl" },
  duelStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  streakStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  duelStatText: { fontSize: 13, fontWeight: "700", color: "#94a3b8", writingDirection: "rtl" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 20 },
  actions: { width: "100%", marginTop: 24, gap: 10 },
});

// ---------------------------------------------------------------------------
// Main Battle Screen
// ---------------------------------------------------------------------------

export function DuelBattleScreen() {
  const status = useDuelsStore((s) => s.status);
  const startMatchmaking = useDuelsStore((s) => s.startMatchmaking);
  const startMatch = useDuelsStore((s) => s.startMatch);
  const resetMatch = useDuelsStore((s) => s.resetMatch);
  const matchmakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const beginMatchmaking = useCallback(() => {
    startMatchmaking();
    matchmakeTimeoutRef.current = setTimeout(() => {
      heavyHaptic();
      startMatch();
    }, 2000);
  }, [startMatchmaking, startMatch]);

  // Start matchmaking on mount
  useEffect(() => {
    beginMatchmaking();
    return () => {
      if (matchmakeTimeoutRef.current) clearTimeout(matchmakeTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelSearch = useCallback(() => {
    if (matchmakeTimeoutRef.current) clearTimeout(matchmakeTimeoutRef.current);
    resetMatch();
    router.back();
  }, [resetMatch, router]);

  const handlePlayAgain = useCallback(() => {
    resetMatch();
    beginMatchmaking();
  }, [resetMatch, beginMatchmaking]);

  return (
    <View style={styles.container}>
      <DiamondBackground>
        {/* Searching overlay */}
        {status === "searching" && <SearchingOverlay onCancel={handleCancelSearch} />}

        {/* Gameplay */}
        {status === "playing" && <DuelGameplay />}

        {/* Results */}
        {status === "finished" && <DuelResults onPlayAgain={handlePlayAgain} />}
      </DiamondBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CLASH.bgPrimary },
});
