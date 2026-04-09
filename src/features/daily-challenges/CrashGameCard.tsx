import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { Svg, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
// import { renderGlossaryText } from '../glossary/renderGlossaryText';
import { useTimeoutCleanup } from '../../hooks/useTimeoutCleanup';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { useDailyChallengesStore } from './use-daily-challenges-store';
import { useDailyLogStore } from '../daily-summary/useDailyLogStore';
import { getTodayCrashRound } from './crash-game-data';
import { MAX_DAILY_PLAYS, CHALLENGE_XP_REWARD, CHALLENGE_COIN_REWARD } from './daily-challenge-types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const GRAPH_WIDTH = 280;
const GRAPH_HEIGHT = 140;

interface Props {
  isActive: boolean;
}

export const CrashGameCard = React.memo(function CrashGameCard({ isActive }: Props) {
  const hasCrashGamePlayedToday = useDailyChallengesStore((s) => s.hasCrashGamePlayedToday);
  const getCrashGamePlaysToday = useDailyChallengesStore((s) => s.getCrashGamePlaysToday);
  const playCrashGame = useDailyChallengesStore((s) => s.playCrashGame);
  const hasPlayed = hasCrashGamePlayedToday();
  const playsToday = getCrashGamePlaysToday();
  const [gameState, setGameState] = useState<'idle' | 'running' | 'cashed' | 'crashed'>('idle');
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const safeTimeout = useTimeoutCleanup();
  const round = getTodayCrashRound();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multiplierRef = useRef(1.0);

  // Pulse glow for the "Start" state
  const glow = useSharedValue(0.3);
  useEffect(() => {
    if (gameState === 'idle' && !hasPlayed) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
  }, [gameState, hasPlayed, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  // Shake on crash
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const startGame = useCallback(() => {
    if (gameState !== 'idle' || hasPlayed) return;
    tapHaptic();
    setGameState('running');
    multiplierRef.current = 1.0;
    setDisplayMultiplier(1.0);

    const tickMs = 60;
    const increment = 0.01 * round.speed;

    timerRef.current = setInterval(() => {
      multiplierRef.current += increment;
      const val = Math.round(multiplierRef.current * 100) / 100;
      setDisplayMultiplier(val);

      if (val >= round.crashAt) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setGameState('crashed');
        errorHaptic();
        shakeX.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 40 }),
            withTiming(8, { duration: 40 }),
            withTiming(-4, { duration: 40 }),
            withTiming(0, { duration: 40 }),
          ),
          2,
          false,
        );
        const today = new Date().toISOString().slice(0, 10);
        playCrashGame(today, 0);
      }
    }, tickMs);
  }, [gameState, hasPlayed, round, shakeX, playCrashGame]);

  const cashOut = useCallback(() => {
    if (gameState !== 'running') return;
    clearInterval(timerRef.current!);
    timerRef.current = null;
    successHaptic();

    const coins = CHALLENGE_COIN_REWARD;
    setEarnedCoins(coins);
    setGameState('cashed');
    setShowConfetti(true);
    setShowFlyingCoins(true);
    safeTimeout(() => setShowConfetti(false), 2500);

    const today = new Date().toISOString().slice(0, 10);
    playCrashGame(today, coins);

    const log = useDailyLogStore.getState();
    log.logEvent({ type: 'crash-game', title: 'מרוץ הריבית', timestamp: Date.now(), xpEarned: CHALLENGE_XP_REWARD });
    log.addTodayXP(CHALLENGE_XP_REWARD);
    log.addTodayCoins(CHALLENGE_COIN_REWARD);
    log.addCorrectAnswer();
  }, [gameState, playCrashGame]);

  // Allow replay after result
  const playAgain = useCallback(() => {
    if (hasPlayed) return;
    setGameState('idle');
    setDisplayMultiplier(1.0);
    setShowConfetti(false);
    setShowFlyingCoins(false);
    setEarnedCoins(0);
  }, [hasPlayed]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Build graph path from multiplier
  const progress = Math.min((displayMultiplier - 1) / (round.crashAt - 1), 1);
  const x = progress * GRAPH_WIDTH;
  const y = GRAPH_HEIGHT - progress * GRAPH_HEIGHT * 0.85;
  const pathD = `M0,${GRAPH_HEIGHT} Q${x * 0.5},${GRAPH_HEIGHT} ${x},${y}`;

  // Color transitions based on state
  const multiplierColor =
    gameState === 'crashed'
      ? '#ef4444'
      : displayMultiplier >= 2
      ? '#16a34a'
      : '#0ea5e9';

  const remaining = MAX_DAILY_PLAYS - playsToday;

  // All plays used
  if (hasPlayed && gameState === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.cardDone}>
          <Text style={styles.answeredIcon}>📊</Text>
          <Text style={[styles.answeredTitle, RTL]}>שיחקת במרוץ הריבית היום!</Text>
          <Text style={[styles.answeredSub, RTL]}>חזור מחר לסבב חדש</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingCoins && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingCoins(false)}
        />
      )}
      <Animated.View
        style={[
          gameState === 'idle' && {
            shadowColor: '#0ea5e9',
            shadowRadius: 20,
            elevation: 8,
          },
          gameState === 'idle' && glowStyle,
          shakeStyle,
        ]}
      >
        <View style={[
          styles.card,
          gameState === 'crashed' && styles.cardCrashed,
          gameState === 'cashed' && styles.cardCashed,
        ]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.emoji}>📈</Text>
            <View style={styles.headerTextCol}>
              <Text style={[styles.headerTitle, RTL]}>מרוץ הריבית</Text>
              <Text style={[styles.headerSub, RTL]}>
                {gameState === 'idle'
                  ? `${remaining}/${MAX_DAILY_PLAYS} סבבים נותרו`
                  : gameState === 'running'
                  ? 'הגרף עולה... צא בזמן!'
                  : gameState === 'cashed'
                  ? 'יצאת בזמן!'
                  : 'הבועה התפוצצה!'}
              </Text>
            </View>
          </View>

          {/* Multiplier display */}
          <View style={styles.multiplierRow}>
            <Text
              style={[
                styles.multiplierText,
                { color: multiplierColor },
                gameState === 'crashed' && { textDecorationLine: 'line-through' },
              ]}
            >
              x{displayMultiplier.toFixed(2)}
            </Text>
          </View>

          {/* Graph */}
          <View style={styles.graphContainer} accessible={false} accessibilityLabel="גרף מרוץ הריבית">
            <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
              <Defs>
                <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#7dd3fc" stopOpacity="0.3" />
                  <Stop offset="1" stopColor={gameState === 'crashed' ? '#ef4444' : '#0ea5e9'} stopOpacity="1" />
                </SvgGradient>
              </Defs>
              <Path
                d={pathD}
                stroke="url(#lineGrad)"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
            {gameState === 'crashed' && (
              <View style={styles.crashOverlay}>
                <Text style={styles.crashEmoji}>💥</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {gameState === 'idle' && (
            <Pressable onPress={startGame} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="התחל לשחק במרוץ הריבית">
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.actionBtnText}>🚀 התחל לשחק</Text>
              </LinearGradient>
            </Pressable>
          )}

          {gameState === 'running' && (
            <Pressable onPress={cashOut} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel="משוך עכשיו">
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.actionBtnText}>💰 משוך עכשיו!</Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Result — tip */}
          {(gameState === 'cashed' || gameState === 'crashed') && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.tipBox}>
              {gameState === 'cashed' && (
                <Text style={[styles.rewardLine, RTL]}>
                  +{CHALLENGE_COIN_REWARD}   +{CHALLENGE_XP_REWARD} XP
                </Text>
              )}
              <Text style={[styles.tipTitle, RTL]}>💡 מה למדנו?</Text>
              <Text style={[styles.tipText, RTL]}>{round.tip}</Text>

              {/* Play again button if plays remain */}
              {!hasPlayed && (
                <Pressable onPress={playAgain} style={styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
                  <Text style={styles.replayBtnText}>🔄 שחק שוב ({remaining - 1} נותרו)</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 14,
  },
  cardCrashed: {
    backgroundColor: '#fef2f2',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  cardCashed: {
    backgroundColor: '#f0fdf4',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  cardDone: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 32,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  multiplierRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  multiplierText: {
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  graphContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.12)',
  },
  crashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crashEmoji: {
    fontSize: 64,
  },
  actionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  actionBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tipBox: {
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
    gap: 6,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  rewardLine: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
    textAlign: 'center',
    marginBottom: 4,
  },
  replayBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  replayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  answeredIcon: {
    fontSize: 48,
    textAlign: 'center',
  },
  answeredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
  },
  answeredSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
