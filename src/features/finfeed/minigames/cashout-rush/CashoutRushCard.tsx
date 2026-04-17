import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, AccessibilityInfo } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
import { GlossaryInlineToggle } from '../shared/GlossaryInlineToggle';
import { FeedStartButton } from '../shared/FeedStartButton';
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
const ARENA_HEIGHT = 240;
const GRAPH_PADDING_X = 24;
const GRAPH_PADDING_Y = 20;
const TICK_INTERVAL_MS = 80;
const FG_START = 50;                // neutral
const FG_STEP_PER_TICK = 0.4;       // climbs toward 100 (Extreme Greed)
const FG_MAX = 100;
const MIN_CRASH_SECONDS = 3;
const MAX_CRASH_SECONDS = 12;

// Real historical Fear & Greed Index readings (CNN Fear & Greed — stocks, and alt.me Crypto F&G).
// Values verified against public archives.
const FG_HISTORY: { date: string; value: number; index: 'CNN' | 'Crypto'; event: string }[] = [
  // Extreme Fear readings
  { date: '23 מרץ 2020', value: 2, index: 'CNN', event: 'תחתית הקורונה — S&P 500 ב-2,237. 12 חודש אח"כ: +74%.' },
  { date: '24 דצמבר 2018', value: 3, index: 'CNN', event: 'סלאוף של סוף 2018 (חשש מהעלאות ריבית). 12 חודש אח"כ: S&P +29%.' },
  { date: '30 ספטמבר 2022', value: 17, index: 'CNN', event: 'שיא הדוביות של 2022 (ריבית + אינפלציה). תוך שנה S&P עלה 21%.' },
  { date: '18 יוני 2022', value: 6, index: 'Crypto', event: 'אחרי קריסת Terra/Luna. BTC ב-17,600$. שנתיים אח"כ: מעל 70,000$.' },
  // Extreme Greed readings
  { date: '10 נובמבר 2021', value: 84, index: 'Crypto', event: 'שיא BTC ב-69,000$. תוך שנה צנח ל-15,500$ (-77%).' },
  { date: '14 פברואר 2020', value: 97, index: 'CNN', event: 'שבועיים לפני קריסת הקורונה. S&P בשיא 3,386. תוך 5 שבועות: -34%.' },
  { date: '16 נובמבר 2021', value: 76, index: 'CNN', event: 'שיא 2021 של S&P ב-4,711. 2022 היה שנת הדוב הגרועה מאז 2008.' },
  { date: '7 ינואר 2021', value: 75, index: 'Crypto', event: 'BTC שובר שיא ב-42,000$. לקח שנתיים חזרה אחרי קריסת 2022.' },
];

function pickHistoryAbove(): typeof FG_HISTORY[number] {
  const pool = FG_HISTORY.filter((h) => h.value >= 70);
  return pool[Math.floor(Math.random() * pool.length)] ?? FG_HISTORY[4];
}

function pickHistoryBelow(): typeof FG_HISTORY[number] {
  const pool = FG_HISTORY.filter((h) => h.value <= 25);
  return pool[Math.floor(Math.random() * pool.length)] ?? FG_HISTORY[0];
}

interface Props {
  isActive: boolean;
}

type Phase = 'idle' | 'running' | 'cashed' | 'crashed' | 'education';

function generateCrashTick(): number {
  const seconds = MIN_CRASH_SECONDS + Math.random() * (MAX_CRASH_SECONDS - MIN_CRASH_SECONDS);
  return Math.floor((seconds * 1000) / TICK_INTERVAL_MS);
}

function computeFearGreed(tick: number): number {
  return Math.min(FG_MAX, FG_START + tick * FG_STEP_PER_TICK);
}

function fgLabel(v: number): string {
  if (v >= 90) return 'תאווה קיצונית';
  if (v >= 75) return 'תאווה';
  if (v >= 55) return 'אופטימיות';
  if (v >= 45) return 'ניטרלי';
  if (v >= 25) return 'פחד';
  return 'פחד קיצוני';
}

function fgColor(v: number): string {
  if (v >= 90) return '#dc2626';
  if (v >= 75) return '#f97316';
  if (v >= 55) return '#eab308';
  return '#22c55e';
}

function formatFG(v: number): string {
  return `${Math.round(v)}/100`;
}

function CashoutGraph({
  fearGreed,
  crashed,
  currentTick,
}: {
  fearGreed: number;
  crashed: boolean;
  currentTick: number;
}) {
  const graphColor = crashed ? '#dc2626' : fgColor(fearGreed);

  const plotW = ARENA_WIDTH - GRAPH_PADDING_X * 2;
  const plotH = ARENA_HEIGHT - GRAPH_PADDING_Y * 2;

  const points = useMemo(() => {
    if (currentTick <= 0) return '';
    const samples = Math.min(currentTick + 1, 120);
    const stepSize = currentTick / Math.max(samples - 1, 1);
    const pts: string[] = [];
    for (let i = 0; i < samples; i++) {
      const t = i * stepSize;
      const value = Math.min(FG_MAX, FG_START + t * FG_STEP_PER_TICK);
      const xNorm = t / Math.max(currentTick + 10, 60);
      const yNorm = value / FG_MAX;
      const x = GRAPH_PADDING_X + xNorm * plotW;
      const y = ARENA_HEIGHT - GRAPH_PADDING_Y - yNorm * plotH;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [currentTick, plotW, plotH]);

  // Zone thresholds on the Fear/Greed scale
  const gridLines = [25, 50, 75, 90].map((val) => {
    const yNorm = val / FG_MAX;
    const y = ARENA_HEIGHT - GRAPH_PADDING_Y - yNorm * plotH;
    return { value: val, y };
  });

  return (
    <View style={styles.graphArena}>
      <LinearGradient
        colors={crashed ? ['#991b1b', '#450a0a'] : ['#0a0e27', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={ARENA_WIDTH} height={ARENA_HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="graphLineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={graphColor} stopOpacity="0.35" />
            <Stop offset="1" stopColor={graphColor} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {gridLines.map((gl) => (
          <Line
            key={gl.value}
            x1={GRAPH_PADDING_X}
            y1={gl.y}
            x2={ARENA_WIDTH - GRAPH_PADDING_X}
            y2={gl.y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {/* The actual growth curve */}
        {points && (
          <Polyline
            points={points}
            fill="none"
            stroke="url(#graphLineGrad)"
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Grid labels — rendered as RN Text for sharpness */}
      {gridLines.map((gl) => (
        <Text
          key={`label-${gl.value}`}
          style={[styles.gridLabel, { top: gl.y - 7 }]}
        >
          {gl.value}
        </Text>
      ))}

      {crashed && (
        <View style={styles.crashLabel}>
          <Text style={styles.crashLabelText}>CRASH</Text>
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
        הקריסה יכולה להגיע בכל רגע — לכן צריך להשקיע בצורה מחושבת. אין תזמון מנצח, יש רק תכנון.
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
  const [finalFG, setFinalFG] = useState(FG_START);
  const [historicalRef] = useState(() => ({
    win: pickHistoryAbove(),
    loss: pickHistoryBelow(),
  }));
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
          withTiming(1.03, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
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
        title: 'Fear or Greed',
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
          setFinalFG(computeFearGreed(next));
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
    const v = computeFearGreed(currentTick);
    setFinalFG(v);
    setPhase('cashed');
    heavyHaptic();
    AccessibilityInfo.announceForAccessibility(`יצאת במדד ${Math.round(v)} מתוך 100 — ${fgLabel(v)}.`);
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
          <Text style={[styles.doneTitle, RTL_CENTER]}>Fear or Greed — הושלם להיום</Text>
          <Text style={[styles.doneSub, RTL_CENTER]}>חזור מחר לסיבוב חדש</Text>
        </View>
      </View>
    );
  }

  const liveFG = computeFearGreed(currentTick);
  const displayFG = phase === 'running' ? liveFG : finalFG;
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
            <Text style={[styles.headerTitle, RTL]}>Fear or Greed</Text>
            <Text style={[styles.headerSub, RTL]}>
              {phase === 'running'
                ? 'המדד מטפס. התאווה עולה.'
                : phase === 'cashed'
                  ? 'יצאת בזמן'
                  : phase === 'crashed'
                    ? 'השוק קרס בתאווה קיצונית'
                    : `${remainingPlays}/${MAX_DAILY_PLAYS} סבבים נותרו`}
            </Text>
          </View>
        </Animated.View>

        {(phase === 'running' || phase === 'cashed' || phase === 'crashed') && (
          <>
            <CashoutGraph fearGreed={displayFG} crashed={isLoss} currentTick={currentTick} />

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
                  { color: isLoss ? '#dc2626' : isWinning ? '#16a34a' : fgColor(displayFG) },
                ]}
              >
                {formatFG(displayFG)}
              </Text>
              <Text
                style={[
                  styles.multiplierSub,
                  { color: isLoss ? '#dc2626' : isWinning ? '#16a34a' : fgColor(displayFG) },
                ]}
              >
                {isWinning ? `יצאת ב-${fgLabel(displayFG)}` : isLoss ? 'תאווה קיצונית — קריסה' : fgLabel(displayFG)}
              </Text>
            </View>
          </>
        )}

        {phase === 'idle' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.idleBlock}>
            <Text style={[styles.idleDesc, RTL_CENTER]}>
              המדד מטפס מ-50 לעבר 100. צאו לפני הקריסה.
            </Text>
            <GlossaryInlineToggle glossaryKey="fear-or-greed" />
            <FeedStartButton
              label="בואו נתחיל"
              onPress={startGame}
              accessibilityLabel="התחל סבב Fear or Greed"
            />
          </Animated.View>
        )}

        {phase === 'running' && (
          <Animated.View style={buttonStyle}>
            <FeedStartButton
              label={`מכור עכשיו · ${Math.round(liveFG)}/100`}
              onPress={cashOut}
              accessibilityLabel={`מכור עכשיו. מדד נוכחי ${Math.round(liveFG)} מתוך 100`}
            />
          </Animated.View>
        )}

        {phase === 'cashed' && (
          <Animated.View entering={FadeInUp.duration(280)} style={styles.sharkBubble}>
            <View style={styles.sharkRow}>
              <View style={styles.sharkAvatarWrap}>
                <ExpoImage source={FINN_HAPPY} style={styles.sharkAvatar} contentFit="cover" accessible={false} />
              </View>
              <View style={styles.sharkTextCol}>
                <Text style={[styles.sharkTitle, RTL, { color: '#16a34a' }]}>יצאת לפני הבועה</Text>
                <Text style={[styles.sharkBody, RTL]} numberOfLines={6}>
                  יצאת ב-{Math.round(finalFG)}/100 — {fgLabel(finalFG)}. במציאות: {historicalRef.win.date} — המדד היה {historicalRef.win.value}. {historicalRef.win.event}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {phase === 'crashed' && (
          <Animated.View entering={FadeInUp.duration(280)} style={styles.sharkBubble}>
            <View style={styles.sharkRow}>
              <View style={styles.sharkAvatarWrap}>
                <ExpoImage source={FINN_EMPATHIC} style={styles.sharkAvatar} contentFit="cover" accessible={false} />
              </View>
              <View style={styles.sharkTextCol}>
                <Text style={[styles.sharkTitle, RTL, { color: '#dc2626' }]}>נתפסת בתאווה</Text>
                <Text style={[styles.sharkBody, RTL]} numberOfLines={6}>
                  הקריסה מגיעה בדיוק כשכולם הכי בטוחים. ההיפך נכון גם הוא — {historicalRef.loss.date} המדד היה {historicalRef.loss.value} (פחד קיצוני). {historicalRef.loss.event}
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
    alignItems: 'stretch',
    paddingVertical: 12,
  },
  idleDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  startButton: {
    alignSelf: 'center',
    paddingHorizontal: 56,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    marginTop: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  graphArena: {
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLabel: {
    position: 'absolute',
    left: 4,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    fontVariant: ['tabular-nums'],
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
  sharkAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharkAvatar: {
    width: 40,
    height: 40,
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
