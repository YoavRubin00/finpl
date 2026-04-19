import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { FINN_HAPPY, FINN_TALKING, FINN_DANCING } from '../retention-loops/finnMascotConfig';
import { heavyHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';

const { width: SW } = Dimensions.get('window');
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const STAGE_W = SW - 48;

const PHASE_DURATIONS: [number, number, number] = [5000, 6000, Infinity];
const PHASE_CAPTIONS: [string, string, string] = [
  'פעם היינו מחליפים תרנגולות בלחם. קצת קשה לקנות ככה אוזניות, נכון? 🎧',
  'אז בני האדם המציאו את הכסף, נייר, מטבע, מספרים במסך. הכל מבוסס על אמון. 🤝',
  'גרור את המטבע לקופה כדי להתחיל! 💰',
];

interface Props {
  onStart: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
}

export function WhatIsMoneyIntro({ onStart, unitColors }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const { playSound } = useSoundEffect();
  const reducedMotion = useReducedMotion();
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel pending drop timer on unmount
  useEffect(() => () => {
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
  }, []);

  // ── Finn cross-fade ──────────────────────────────────────────────────────
  const happyOp = useSharedValue(1);
  const talkingOp = useSharedValue(0);
  const dancingOp = useSharedValue(0);
  const happyStyle = useAnimatedStyle(() => ({ opacity: happyOp.value }));
  const talkingStyle = useAnimatedStyle(() => ({ opacity: talkingOp.value }));
  const dancingStyle = useAnimatedStyle(() => ({ opacity: dancingOp.value }));

  // ── Caption fade ─────────────────────────────────────────────────────────
  const captionOp = useSharedValue(1);
  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOp.value }));

  // ── Emoji card scale pulse (phase 0) ────────────────────────────────────
  const emojiScale = useSharedValue(1);
  const emojiCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  // ── Coin drag (phase 2) ─────────────────────────────────────────────────
  const coinX = useSharedValue(0);
  const coinY = useSharedValue(0);
  const dropped = useSharedValue(false);
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: coinX.value }, { translateY: coinY.value }],
  }));

  // Pulse animation, skip if user prefers reduced motion
  useEffect(() => {
    if (reducedMotion) return;
    emojiScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900 }),
        withTiming(1.0, { duration: 900 }),
      ),
      -1,
      true,
    );
    return () => { cancelAnimation(emojiScale); };
  // emojiScale is a stable ref, reducedMotion and emojiScale omitted intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Phase advance timer, auto-runs phases 0→1→2
  useEffect(() => {
    if (phase >= 2) return;
    const next: 0 | 1 | 2 = phase === 0 ? 1 : 2;
    const timer = setTimeout(() => setPhase(next), PHASE_DURATIONS[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  // Finn cross-fade on phase change
  useEffect(() => {
    happyOp.value = withTiming(phase === 0 ? 1 : 0, { duration: 300 });
    talkingOp.value = withTiming(phase === 1 ? 1 : 0, { duration: 300 });
    dancingOp.value = withTiming(phase === 2 ? 1 : 0, { duration: 300 });
  // Shared value refs are stable, phase is the only reactive dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Caption fade-in on phase change (new text renders while opacity=0, then fades in)
  useEffect(() => {
    captionOp.value = 0;
    captionOp.value = withTiming(1, { duration: 350 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Drag handler ─────────────────────────────────────────────────────────
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
      {/* Skip button */}
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

        {/* ── Finn cross-fade cluster ────────────────────────────────────── */}
        <View style={{ width: 120, height: 120 }}>
          <Animated.View style={[{ position: 'absolute', width: 120, height: 120 }, happyStyle]}>
            <ExpoImage
              source={FINN_HAPPY}
              style={{ width: 120, height: 120 }}
              contentFit="contain"
              accessible={false}
            />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', width: 120, height: 120 }, talkingStyle]}>
            <ExpoImage
              source={FINN_TALKING}
              style={{ width: 120, height: 120 }}
              contentFit="contain"
              accessible={false}
            />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', width: 120, height: 120 }, dancingStyle]}>
            <ExpoImage
              source={FINN_DANCING}
              style={{ width: 120, height: 120 }}
              contentFit="contain"
              accessible={false}
            />
          </Animated.View>
        </View>

        {/* ── CenterStage ───────────────────────────────────────────────── */}
        <View style={{ width: STAGE_W, height: 220, alignItems: 'center', justifyContent: 'center' }}>

          {/* Phase 0, Barter era emoji card */}
          {phase === 0 && (
            <Animated.View style={[emojiCardStyle, {
              backgroundColor: '#1e293b',
              borderRadius: 24,
              borderWidth: 2,
              borderColor: unitColors.bg,
              width: '100%',
              paddingVertical: 26,
              alignItems: 'center',
              shadowColor: unitColors.glow,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }]}>
              <Text style={{ fontSize: 44, letterSpacing: 6 }}>🐔  ↔️  🥖</Text>
              <Text style={[RTL, { marginTop: 10, color: '#94a3b8', fontSize: 14, fontWeight: '600' }]}>
                סחר חליפין, לפני שהמציאו כסף
              </Text>
            </Animated.View>
          )}

          {/* Phase 1, Money bag Lottie */}
          {phase === 1 && (
            <LottieView
              source={require('../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json')}
              style={{ width: 180, height: 180 }}
              autoPlay
              loop
            />
          )}

          {/* Phase 2, Drag coin into money bag */}
          {phase === 2 && (
            <View style={{ width: '100%', height: 220, alignItems: 'center' }}>
              {/* Drop target */}
              <View accessible={false} style={{ position: 'absolute', top: 0, alignItems: 'center' }}>
                <LottieView
                  source={require('../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json')}
                  style={{ width: 100, height: 100 }}
                  autoPlay
                  loop
                />
                <Text style={[RTL, { color: '#64748b', fontSize: 11, fontWeight: '600', marginTop: -4 }]}>שחרר כאן</Text>
              </View>

              {/* Draggable coin */}
              <GestureDetector gesture={panGesture}>
                <Animated.View
                  style={[coinStyle, { position: 'absolute', bottom: 10 }]}
                  accessibilityLabel="מטבע, גרור למעלה לקופה"
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

        {/* ── Caption card ──────────────────────────────────────────────── */}
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
