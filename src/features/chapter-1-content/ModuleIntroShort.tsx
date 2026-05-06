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
import { FINN_STANDARD, getFinnImage } from '../retention-loops/finnMascotConfig';
import { heavyHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useIntroAudio } from '../../hooks/useIntroAudio';

const { width: SW } = Dimensions.get('window');
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const STAGE_W = SW - 48;

const PHASE_DURATIONS: [number, number, number] = [4000, 4800, Infinity];

const LOTTIE_MAP = {
  moneybag: require('../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json'),
  coins:    require('../../../assets/lottie/wired-flat-298-coins-hover-jump.json'),
  pot:      require('../../../assets/lottie/wired-flat-3051-pot-gold-hover-pinch.json'),
  trophy:   require('../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json'),
} as const;

export interface Phase0Row {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}

export interface ModuleIntroConfig {
  phase0Rows: Phase0Row[];
  phase1Emoji?: string;
  phase1Stat?: string;
  phase1LottieKey?: keyof typeof LOTTIE_MAP;
  captions: [string, string, string];
}

interface Props {
  onStart: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
  config: ModuleIntroConfig;
  audioUri?: string;
}

export function ModuleIntroShort({ onStart, unitColors, config, audioUri }: Props) {
  const audioState = useIntroAudio(audioUri);
  const talkingImgRef = useRef<ExpoImage>(null);

  // Freeze webp on pause, resume on play, swap happens via `source` swap below.
  useEffect(() => {
    if (audioState === 'paused') {
      talkingImgRef.current?.stopAnimating?.();
    } else if (audioState === 'playing' || audioState === 'loading') {
      talkingImgRef.current?.startAnimating?.();
    }
  }, [audioState]);

  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const { playSound } = useSoundEffect();
  const reducedMotion = useReducedMotion();
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
  }, []);

  // Caption fade
  const captionOp = useSharedValue(1);
  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOp.value }));

  // Coin drag (phase 2)
  const coinX = useSharedValue(0);
  const coinY = useSharedValue(0);
  const dropped = useSharedValue(false);
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: coinX.value }, { translateY: coinY.value }],
  }));

  // Arrow pulse (phase 2)
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
    captionOp.value = reducedMotion ? 1 : withTiming(1, { duration: 350 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reducedMotion]);

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

  const lottieSource = config.phase1LottieKey ? LOTTIE_MAP[config.phase1LottieKey] : null;

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

        {/* Finn + speech bubble */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', width: '100%', paddingHorizontal: 4 }}>
          {/* Portrait — talking during phases 0-1, idle at drag phase */}
          <ExpoImage
            ref={talkingImgRef}
            source={audioUri
              ? (audioState === 'finished' ? FINN_STANDARD : getFinnImage('talking'))
              : (phase < 2 ? getFinnImage('talking') : FINN_STANDARD)}
            style={{ width: 96, height: 96 }}
            contentFit="contain"
            accessible={false}
          />
          {/* Speech bubble */}
          <Animated.View style={[captionStyle, {
            flex: 1,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            borderWidth: 2,
            borderColor: unitColors.bg,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginEnd: 8,
            marginBottom: 6,
            shadowColor: unitColors.glow,
            shadowOpacity: 0.3,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }]}>
            <Text style={[RTL, { fontSize: 14, fontWeight: '700', color: '#1f2937', lineHeight: 22 }]}>
              {config.captions[phase]}
            </Text>
            {/* Tail pointing right toward Finn */}
            <View style={{
              position: 'absolute',
              bottom: 12,
              right: -9,
              width: 0,
              height: 0,
              borderTopWidth: 7,
              borderBottomWidth: 7,
              borderLeftWidth: 9,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: unitColors.bg,
            }} />
          </Animated.View>
        </View>

        {/* CenterStage */}
        <View style={{ width: STAGE_W, height: 220, alignItems: 'center', justifyContent: 'center' }}>

          {/* Phase 0, fact rows */}
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
              gap: 10,
            }}>
              {config.phase0Rows.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[RTL, { color: '#94a3b8', fontSize: 13, fontWeight: '600' }]}>{row.label}</Text>
                  <Text style={[RTL, {
                    color: row.highlight ? '#fbbf24' : '#e2e8f0',
                    fontSize: row.highlight ? 20 : 17,
                    fontWeight: '900',
                  }]}>{row.value}</Text>
                  {row.note ? (
                    <Text style={[RTL, { color: '#64748b', fontSize: 12 }]}>{row.note}</Text>
                  ) : (
                    <View style={{ width: 60 }} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Phase 1, big stat or Lottie */}
          {phase === 1 && (
            <View style={{
              backgroundColor: '#1e293b',
              borderRadius: 24,
              borderWidth: 2,
              borderColor: unitColors.bg,
              width: '100%',
              height: 200,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: unitColors.glow,
              shadowOpacity: 0.45,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
              gap: 12,
            }}>
              {lottieSource ? (
                <LottieView
                  source={lottieSource}
                  style={{ width: 120, height: 120 }}
                  autoPlay
                  loop
                />
              ) : (
                config.phase1Emoji && (
                  <Text style={{ fontSize: 52 }} accessible={false}>{config.phase1Emoji}</Text>
                )
              )}
              {config.phase1Stat && (
                <Text style={[RTL, {
                  color: '#fbbf24',
                  fontSize: 18,
                  fontWeight: '900',
                  paddingHorizontal: 16,
                }]}>{config.phase1Stat}</Text>
              )}
            </View>
          )}

          {/* Phase 2, drag coin */}
          {phase === 2 && (
            <View style={{ width: '100%', height: 220, alignItems: 'center' }}>
              {/* Target zone */}
              <Animated.View
                accessible={false}
                style={[arrowStyle, { position: 'absolute', top: 10, alignItems: 'center', gap: 4 }]}
              >
                <LottieView
                  source={require('../../../assets/lottie/wired-flat-298-coins-hover-jump.json')}
                  style={{ width: 72, height: 72 }}
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
                    style={{ width: 76, height: 76 }}
                    autoPlay
                    loop
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}
