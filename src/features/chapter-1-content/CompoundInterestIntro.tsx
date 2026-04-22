import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  cancelAnimation,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { FINN_STANDARD, FINN_TALKING } from '../retention-loops/finnMascotConfig';
import { heavyHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { createAudioPlayer } from 'expo-audio';

const { width: SW } = Dimensions.get('window');
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const STAGE_W = SW - 48;

// Chart bars: heights represent exponential growth (7% annual return over 6 "years")
const BAR_HEIGHTS = [28, 36, 48, 66, 90, 124];
const BAR_COLORS = ['#3b82f6', '#60a5fa', '#818cf8', '#a78bfa', '#f59e0b', '#fbbf24'];

const PHASE_DURATIONS: [number, number, number] = [4000, 4800, Infinity];
const PHASE_CAPTIONS: [string, string, string] = [
  'הבנק נותן לכם ריבית? נחמד. אבל ריבית דריבית, זה להרוויח ריבית גם על הרווחים! 💡',
  'שמתם ₪100, הרווחתם ₪10, בשנה הבאה ריבית מתוך ₪110. פתאום הגרף הופך אקספוננציאלי. 📈',
  'הנשק הסודי? הזמן. גררו את המטבע התחתון למעלה ותבינו איך כסף הופך להרבה כסף.',
];

interface Props {
  onStart: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  chartImageUri?: string;
  audioUri?: string;
}

// ── Mini bar chart, fixed hooks, no loops ─────────────────────────────────
function CompoundChart({ animate }: { animate: boolean }) {
  const h0 = useSharedValue(0); const h1 = useSharedValue(0); const h2 = useSharedValue(0);
  const h3 = useSharedValue(0); const h4 = useSharedValue(0); const h5 = useSharedValue(0);
  const s0 = useAnimatedStyle(() => ({ height: h0.value }));
  const s1 = useAnimatedStyle(() => ({ height: h1.value }));
  const s2 = useAnimatedStyle(() => ({ height: h2.value }));
  const s3 = useAnimatedStyle(() => ({ height: h3.value }));
  const s4 = useAnimatedStyle(() => ({ height: h4.value }));
  const s5 = useAnimatedStyle(() => ({ height: h5.value }));

  useEffect(() => {
    if (!animate) return;
    const anims = [h0, h1, h2, h3, h4, h5];
    anims.forEach((a, i) => {
      a.value = withDelay(i * 120, withSpring(BAR_HEIGHTS[i], { damping: 14, stiffness: 80 }));
    });
    return () => { anims.forEach(a => cancelAnimation(a)); };
  // h0-h5 are stable shared value refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const barStyles = [s0, s1, s2, s3, s4, s5];

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}>
      {barStyles.map((style, i) => (
        <Animated.View
          key={i}
          accessible={false}
          style={[style, {
            width: 30,
            borderRadius: 6,
            backgroundColor: BAR_COLORS[i],
            shadowColor: BAR_COLORS[i],
            shadowOpacity: 0.5,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }]}
        />
      ))}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function CompoundInterestIntro({ onStart, unitColors, chartImageUri, audioUri }: Props) {
  const [audioPlaying, setAudioPlaying] = useState(!!audioUri);

  useEffect(() => {
    if (!audioUri) return;
    const player = createAudioPlayer({ uri: audioUri });
    player.play();
    let hasStartedPlaying = false;
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.playing) hasStartedPlaying = true;
      if (status.didJustFinish || (hasStartedPlaying && !status.playing && status.currentTime > 0)) {
        setAudioPlaying(false);
      }
    });
    return () => {
      sub.remove();
      player.pause();
      player.remove();
    };
  }, [audioUri]);

  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const { playSound } = useSoundEffect();
  const reducedMotion = useReducedMotion();
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
  }, []);


  // ── Caption + caption fade ───────────────────────────────────────────────
  const captionOp = useSharedValue(1);
  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOp.value }));

  // ── Coin drag (phase 2) ─────────────────────────────────────────────────
  const coinX = useSharedValue(0);
  const coinY = useSharedValue(0);
  const dropped = useSharedValue(false);
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: coinX.value }, { translateY: coinY.value }],
  }));

  // ── Upward arrow pulse (phase 2, when no reduced motion) ────────────────
  const arrowOp = useSharedValue(0);
  const arrowStyle = useAnimatedStyle(() => ({ opacity: arrowOp.value }));

  // Phase advance timer
  useEffect(() => {
    if (phase >= 2) return;
    const next: 0 | 1 | 2 = phase === 0 ? 1 : 2;
    const timer = setTimeout(() => setPhase(next), PHASE_DURATIONS[phase]);
    return () => clearTimeout(timer);
  }, [phase]);


  // Caption fade-in on phase change
  useEffect(() => {
    captionOp.value = 0;
    captionOp.value = withTiming(1, { duration: 350 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Arrow pulse when phase 2 begins
  useEffect(() => {
    if (phase !== 2 || reducedMotion) return;
    arrowOp.value = withDelay(500,
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 400 }),
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reducedMotion]);

  const handleDrop = useCallback(() => {
    heavyHaptic();
    playSound('btn_click_heavy');
    dropTimerRef.current = setTimeout(onStart, 400);
  }, [onStart, playSound]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (dropped.value) return;
      coinX.value = e.translationX;
      coinY.value = e.translationY;
    })
    .onEnd((e) => {
      if (dropped.value) return;
      if (e.translationY < -80) {
        dropped.value = true;
        runOnJS(handleDrop)();
      } else {
        coinX.value = withSpring(0);
        coinY.value = withSpring(0);
      }
    });

  return (
    <View style={{ flex: 1 }}>
      {/* Skip */}
      <Pressable
        onPress={onStart}
        accessibilityLabel="דלג על ההקדמה"
        accessibilityRole="button"
        hitSlop={16}
        style={{ position: 'absolute', top: 0, right: 0, padding: 10, zIndex: 10 }}
      >
        <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>דלג ›</Text>
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 16 }}>

        {/* ── Finn static ─────────────────────────────────────────────── */}
        <ExpoImage source={audioUri ? (audioPlaying ? FINN_TALKING : FINN_STANDARD) : (phase < 2 ? FINN_TALKING : FINN_STANDARD)} style={{ width: 120, height: 120 }} contentFit="contain" accessible={false} />

        {/* ── CenterStage ──────────────────────────────────────────────── */}
        <View style={{ width: STAGE_W, height: 220, alignItems: 'center', justifyContent: 'center' }}>

          {/* Phase 0, Year cascade card */}
          {phase === 0 && (
            <View style={{
              backgroundColor: '#1e293b',
              borderRadius: 24,
              borderWidth: 2,
              borderColor: unitColors.bg,
              width: '100%',
              paddingVertical: 18,
              paddingHorizontal: 20,
              shadowColor: unitColors.glow,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
              gap: 8,
            }}>
              {[
                { label: 'שנה 1:', value: '₪100', note: 'קרן' },
                { label: 'שנה 2:', value: '₪110', note: '+10% על 100' },
                { label: 'שנה 3:', value: '₪121', note: '+10% על 110 ✨' },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[RTL, { color: '#94a3b8', fontSize: 13, fontWeight: '600' }]}>{row.label}</Text>
                  <Text style={[RTL, {
                    color: i === 2 ? '#fbbf24' : '#e2e8f0',
                    fontSize: i === 2 ? 20 : 16,
                    fontWeight: '900',
                  }]}>{row.value}</Text>
                  <Text style={[RTL, { color: '#64748b', fontSize: 12 }]}>{row.note}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Phase 1, Chart (image or animated bars) */}
          {phase === 1 && (
            <View style={{
              backgroundColor: '#1e293b',
              borderRadius: 24,
              borderWidth: 2,
              borderColor: unitColors.bg,
              width: '100%',
              height: 220,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: unitColors.glow,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}>
              {chartImageUri ? (
                <ExpoImage
                  source={{ uri: chartImageUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  accessible={false}
                />
              ) : (
                <>
                  <Text style={[RTL, {
                    position: 'absolute',
                    top: 12,
                    color: '#94a3b8',
                    fontSize: 12,
                    fontWeight: '700',
                  }]}>ריבית דריבית לאורך זמן</Text>
                  <CompoundChart animate={!reducedMotion} />
                </>
              )}
            </View>
          )}

          {/* Phase 2, Drag coin up */}
          {phase === 2 && (
            <View style={{ width: '100%', height: 220, alignItems: 'center' }}>
              {/* Up-arrow target */}
              <Animated.View
                accessible={false}
                style={[arrowStyle, { position: 'absolute', top: 10, alignItems: 'center', gap: 4 }]}
              >
                <LottieView
                  source={require('../../../assets/lottie/wired-flat-298-coins-hover-jump.json')}
                  style={{ width: 80, height: 80 }}
                  autoPlay
                  loop
                />
                <Text style={[RTL, { color: '#fbbf24', fontSize: 13, fontWeight: '800' }]}>↑ לכאן</Text>
              </Animated.View>

              {/* Draggable coin */}
              <GestureDetector gesture={panGesture}>
                <Animated.View
                  style={[coinStyle, { position: 'absolute', bottom: 10 }]}
                  accessibilityLabel="מטבע, גרור למעלה כדי להתחיל"
                  accessibilityRole="button"
                  accessibilityHint="גרור כלפי מעלה"
                >
                  <LottieView
                    source={require('../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json')}
                    style={{ width: 80, height: 80 }}
                    autoPlay
                    loop
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          )}
        </View>

        {/* ── Caption card ─────────────────────────────────────────────── */}
        <Animated.View style={[captionStyle, {
          backgroundColor: unitColors.dim,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: unitColors.bg,
          paddingHorizontal: 20,
          paddingVertical: 14,
          width: STAGE_W,
          shadowColor: unitColors.glow,
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }]}>
          <Text style={[RTL, { fontSize: 16, fontWeight: '700', color: '#1f2937', lineHeight: 26 }]}>
            {PHASE_CAPTIONS[phase]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
