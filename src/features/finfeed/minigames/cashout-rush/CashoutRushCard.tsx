import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, AccessibilityInfo } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { errorHaptic, heavyHaptic, successHaptic, tapHaptic } from '../../../../utils/haptics';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../../components/ui/FlyingRewards';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import { CHALLENGE_COIN_REWARD, CHALLENGE_XP_REWARD, MAX_DAILY_PLAYS } from '../../../daily-challenges/daily-challenge-types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
const ARENA_WIDTH = SCREEN_WIDTH - 72;
const ARENA_HEIGHT = 200;

const TICK_INTERVAL_MS = 80;
const GROWTH_RATE_PER_TICK = 0.018;
const MIN_CRASH_SECONDS = 3;
const MAX_CRASH_SECONDS = 12;

interface Props {
  isActive: boolean;
}

type Phase = 'idle' | 'running' | 'cashed' | 'crashed' | 'education';

function generateCrashTick(): number {
  const seconds = MIN_CRASH_SECONDS + Math.random() * (MAX_CRASH_SECONDS - MIN_CRASH_SECONDS);
  return Math.floor((seconds * 1000) / TICK_INTERVAL_MS);
}

function computeMultiplier(tick: number): number {
  return Math.pow(1 + GROWTH_RATE_PER_TICK, tick);
}

function formatMultiplier(m: number): string {
  return `×${m.toFixed(2)}`;
}

function CashoutGraph({
  multiplier,
  crashed,
}: {
  multiplier: number;
  crashed: boolean;
}) {
  const maxShown = 8;
  const progress = Math.min(1, Math.log(multiplier) / Math.log(maxShown));
  const graphColor = crashed ? '#dc2626' : multiplier < 1.5 ? '#22d3ee' : multiplier < 3 ? '#d4a017' : '#7c3aed';

  return (
    <View style={styles.graphArena}>
      <LinearGradient
        colors={crashed ? ['#991b1b', '#450a0a'] : ['#0a0e27', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.graphLine, { width: progress * ARENA_WIDTH, backgroundColor: graphColor }]} />
      <View
        style={[
          styles.graphDot,
          {
            left: progress * ARENA_WIDTH - 8,
            bottom: progress * (ARENA_HEIGHT - 40) + 8,
            backgroundColor: graphColor,
            shadowColor: graphColor,
          },
        ]}
      />
      {crashed && (
        <View style={styles.crashLabel}>
          <Text style={styles.crashLabelText}>💥 CRASH</Text>
        </View>
      )}
    </View>
  );
}

function GambleWarning() {
  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.warningBox}>
      <Text style={[styles.warningTitle, RTL_CENTER]}>זה לא השקעה — זו רולטה</Text>
      <Text style={[styles.warningBody, RTL]}>
        התוצאה נקבעה רנדומלית בתחילת הסבב. אין אסטרטגיה, אין ניתוח, אין "תזמון מנצח".
        {'\n\n'}
        2,000 ₪ לחודש ב-S&P 500 ל-25 שנה = ~1.6M ₪. בלי דופמין של קריסות, עם דופמין של שקט נפשי.
      </Text>
    </Animated.View>
  );
}

export const CashoutRushCard = React.memo(function CashoutRushCard({ isActive: _isActive }: Props) {
  const playCashoutRush = useDailyChallengesStore((s) => s.playCashoutRush);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasCashoutRushPlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getCashoutRushPlaysToday());

  const [phase, setPhase] = useState<Phase>('idle');
  const [currentTick, setCurrentTick] = useState(0);
  const [crashTick] = useState<number>(() => generateCrashTick());
  const [finalMultiplier, setFinalMultiplier] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingRewards, setShowFlyingRewards] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confettiRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);

  const buttonPulse = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPulse.value }],
  }));

  useEffect(() => {
    if (phase === 'running' && !reduceMotion) {
      buttonPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      buttonPulse.value = withTiming(1, { duration: 150 });
    }
  }, [buttonPulse, phase, reduceMotion]);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (confettiRef.current) clearTimeout(confettiRef.current);
  }, []);

  const finalize = useCallback(
    (cashedOut: boolean) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const today = new Date().toISOString().slice(0, 10);
      playCashoutRush(today, cashedOut);

      const log = useDailyLogStore.getState();
      log.logEvent({
        type: 'cashout-rush',
        title: 'עצור בשיא',
        timestamp: Date.now(),
        xpEarned: CHALLENGE_XP_REWARD,
      });
      log.addTodayXP(CHALLENGE_XP_REWARD);
      if (cashedOut) {
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
      }

      if (cashedOut) {
        successHaptic();
        setShowConfetti(true);
        setShowFlyingRewards(true);
        confettiRef.current = setTimeout(() => setShowConfetti(false), 2400);
      }

      // Educational twist: after 3 plays, show the "it's gambling" message
      if (playsToday + 1 >= 3) {
        setShowEducation(true);
      }
    },
    [playCashoutRush, playsToday],
  );

  const startGame = useCallback(() => {
    if (phase !== 'idle' || hasPlayedToday) return;
    tapHaptic();
    setPhase('running');
    setCurrentTick(0);

    tickRef.current = setInterval(() => {
      setCurrentTick((t) => {
        const next = t + 1;
        if (next >= crashTick) {
          if (tickRef.current) clearInterval(tickRef.current);
          setFinalMultiplier(computeMultiplier(next));
          setPhase('crashed');
          errorHaptic();
          finalize(false);
          return next;
        }
        return next;
      });
    }, TICK_INTERVAL_MS);
  }, [crashTick, finalize, hasPlayedToday, phase]);

  const cashOut = useCallback(() => {
    if (phase !== 'running') return;
    if (tickRef.current) clearInterval(tickRef.current);
    const m = computeMultiplier(currentTick);
    setFinalMultiplier(m);
    setPhase('cashed');
    heavyHaptic();
    AccessibilityInfo.announceForAccessibility(`משכת בזמן. מכפיל ${m.toFixed(2)}.`);
    finalize(true);
  }, [currentTick, finalize, phase]);

  const resetForEducation = useCallback(() => {
    setShowEducation(false);
    setPhase('education');
  }, []);

  if (hasPlayedToday && phase === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, RTL_CENTER]}>עצור בשיא — הושלם להיום</Text>
          <Text style={[styles.doneSub, RTL_CENTER]}>חזור מחר לסיבוב חדש</Text>
        </View>
      </View>
    );
  }

  const liveMultiplier = computeMultiplier(currentTick);
  const displayMultiplier = phase === 'running' ? liveMultiplier : finalMultiplier;
  const isWinning = phase === 'cashed';
  const isLoss = phase === 'crashed';

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingRewards && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingRewards(false)}
        />
      )}

      <View style={styles.cardShell}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.headerRow}>
          <ExpoImage source={FINN_STANDARD} style={styles.headerAvatar} contentFit="contain" accessible={false} />
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, RTL]}>עצור בשיא</Text>
            <Text style={[styles.headerSub, RTL]}>
              {phase === 'running'
                ? 'המכפיל עולה. הסיכון עולה.'
                : phase === 'cashed'
                  ? 'חסכת בזמן'
                  : phase === 'crashed'
                    ? 'המכפיל קרס'
                    : `${remainingPlays}/${MAX_DAILY_PLAYS} סבבים נותרו`}
            </Text>
          </View>
        </Animated.View>

        {(phase === 'running' || phase === 'cashed' || phase === 'crashed') && (
          <>
            <CashoutGraph multiplier={displayMultiplier} crashed={isLoss} />

            <View
              style={[
                styles.multiplierBox,
                isWinning && styles.multiplierBoxWin,
                isLoss && styles.multiplierBoxLoss,
              ]}
              accessibilityLiveRegion="polite"
            >
              <Text
                style={[
                  styles.multiplierValue,
                  { color: isLoss ? '#dc2626' : isWinning ? '#16a34a' : '#ffffff' },
                ]}
              >
                {formatMultiplier(displayMultiplier)}
              </Text>
              {isWinning && (
                <Text style={[styles.multiplierSub, { color: '#16a34a' }]}>משכת בזמן</Text>
              )}
              {isLoss && (
                <Text style={[styles.multiplierSub, { color: '#dc2626' }]}>קרס. כל הצבירה אבדה</Text>
              )}
            </View>
          </>
        )}

        {phase === 'idle' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.idleBlock}>
            <Text style={[styles.idleDesc, RTL_CENTER]}>
              המכפיל עולה מ-×1.00 כלפי מעלה. לחץ "משוך" לפני הקריסה. אחרי הקריסה — הכל אבוד.
            </Text>
            <Pressable
              onPress={startGame}
              accessibilityRole="button"
              accessibilityLabel="התחל סבב"
              style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={['#7c3aed', '#5b21b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.startButtonText}>התחל</Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === 'running' && (
          <Animated.View style={buttonStyle}>
            <Pressable
              onPress={cashOut}
              accessibilityRole="button"
              accessibilityLabel={`משוך עכשיו. מכפיל נוכחי ${liveMultiplier.toFixed(2)}`}
              style={({ pressed }) => [styles.cashoutButton, pressed && { opacity: 0.9 }]}
            >
              <LinearGradient
                colors={['#d4a017', '#92400e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.cashoutButtonText}>משוך עכשיו</Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === 'cashed' && (
          <Animated.View entering={FadeInUp.duration(280)} style={styles.sharkBubble}>
            <View style={styles.sharkRow}>
              <ExpoImage source={FINN_HAPPY} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
              <View style={styles.sharkTextCol}>
                <Text style={[styles.sharkTitle, RTL, { color: '#16a34a' }]}>הפעם שמרת על הרווח</Text>
                <Text style={[styles.sharkBody, RTL]} numberOfLines={4}>
                  הצלחת לעצור בזמן — אבל הקריסה היתה נקבעת אקראית בין שנייה 3 ל-12. זה לא ניתוח, זה מזל. עוד על זה בהמשך.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {phase === 'crashed' && (
          <Animated.View entering={FadeInUp.duration(280)} style={styles.sharkBubble}>
            <View style={styles.sharkRow}>
              <ExpoImage source={FINN_EMPATHIC} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
              <View style={styles.sharkTextCol}>
                <Text style={[styles.sharkTitle, RTL, { color: '#dc2626' }]}>נעצרת מאוחר מדי</Text>
                <Text style={[styles.sharkBody, RTL]} numberOfLines={4}>
                  הקריסה נקבעה מראש — לא יכולת לזהות אותה. זו בדיוק המציאות של הימורי משחקי קריסה אמיתיים.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {showEducation && (
          <>
            <GambleWarning />
            <Pressable
              onPress={resetForEducation}
              accessibilityRole="button"
              accessibilityLabel="הבנתי. סגור את ההסבר"
              style={({ pressed }) => [styles.understoodButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.understoodButtonText}>הבנתי</Text>
            </Pressable>
          </>
        )}

        {(phase === 'cashed' || phase === 'crashed') && !showEducation && (
          <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.rewardsRow}>
            <View style={styles.rewardPill}>
              <Text style={styles.rewardPillText}>+{CHALLENGE_XP_REWARD} XP</Text>
            </View>
            {phase === 'cashed' && (
              <View style={[styles.rewardPill, { backgroundColor: 'rgba(250,204,21,0.15)' }]}>
                <Text style={[styles.rewardPillText, { color: '#d4a017' }]}>+{CHALLENGE_COIN_REWARD}</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cardShell: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
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
  idleBlock: {
    gap: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  idleDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  startButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    minWidth: 160,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  graphArena: {
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  graphLine: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 4,
  },
  graphDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  crashLabel: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(220,38,38,0.25)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dc2626',
    transform: [{ rotate: '-8deg' }],
  },
  crashLabelText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fef2f2',
    letterSpacing: 2,
  },
  multiplierBox: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  multiplierBoxWin: {
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  multiplierBoxLoss: {
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  multiplierValue: {
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  multiplierSub: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  cashoutButton: {
    paddingVertical: 18,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#d4a017',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cashoutButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sharkBubble: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  sharkRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'flex-start',
  },
  sharkAvatar: {
    width: 52,
    height: 52,
  },
  sharkTextCol: {
    flex: 1,
    gap: 6,
  },
  sharkTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  sharkBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  warningBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220,38,38,0.08)',
    gap: 8,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#dc2626',
  },
  warningBody: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 21,
  },
  understoodButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
    marginTop: 4,
  },
  understoodButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  rewardsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  rewardPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.18)',
  },
  rewardPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7c3aed',
  },
  finLarge: {
    width: 96,
    height: 96,
    alignSelf: 'center',
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  doneSub: {
    fontSize: 14,
    color: '#64748b',
  },
});
