import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEconomyStore } from "../economy/useEconomyStore";
import {
  doubleHeavyHaptic,
  errorHaptic,
  mediumHaptic,
  tapHaptic,
} from "../../utils/haptics";
import { CaptainSharkOverlay } from "./components/CaptainSharkOverlay";
import { CrashChart } from "./components/CrashChart";
import { HodlButton } from "./components/HodlButton";
import { IntroScreen } from "./components/IntroScreen";
import { PaperHandsScreen } from "./components/PaperHandsScreen";
import { PhaseVignette } from "./components/PhaseVignette";
import { VictoryBlast } from "./components/VictoryBlast";
import { HOLD_TARGET_MS, REWARD } from "./diamondHandsData";
import { useDiamondHandsCooldown } from "./useDiamondHandsCooldown";
import { useDiamondHandsGame } from "./useDiamondHandsGame";

type ScreenMode = "intro" | "playing" | "victory" | "paper";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DiamondHandsModal({ visible, onClose }: Props) {
  const [screen, setScreen] = useState<ScreenMode>("intro");
  const [paperHandsMs, setPaperHandsMs] = useState(0);
  const { width, height } = useWindowDimensions();
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const recordVictory = useDiamondHandsCooldown((s) => s.recordVictory);
  const recordAttempt = useDiamondHandsCooldown((s) => s.recordAttempt);

  const handleVictory = useCallback(() => {
    addXP(REWARD.xp, "challenge_complete");
    addCoins(REWARD.coins);
    recordVictory();
    doubleHeavyHaptic();
    setScreen("victory");
  }, [addXP, addCoins, recordVictory]);

  const handlePaperHands = useCallback(
    (heldForMs: number) => {
      errorHaptic();
      recordAttempt();
      setPaperHandsMs(heldForMs);
      setScreen("paper");
    },
    [recordAttempt]
  );

  const {
    phase,
    elapsedMs,
    isHolding,
    start,
    release,
    reHold,
    reset,
    shakeX,
    shakeRotate,
  } = useDiamondHandsGame({
    onVictory: handleVictory,
    onPaperHands: handlePaperHands,
  });

  const progress = Math.min(1, elapsedMs / HOLD_TARGET_MS);
  const crashed = phase === "panic" || phase === "paperHands";
  const recovered = phase === "victory";

  useEffect(() => {
    if (!visible) {
      reset();
      setScreen("intro");
      setPaperHandsMs(0);
    }
  }, [visible, reset]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "playing") {
        return true;
      }
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, screen, onClose]);

  useEffect(() => {
    if (phase !== "panic") return;
    const id = setInterval(() => {
      mediumHaptic();
    }, 600);
    return () => clearInterval(id);
  }, [phase]);

  const screenShakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { rotateZ: `${shakeRotate.value}deg` },
    ],
  }));

  const chartWidth = Math.min(width - 48, 360);
  const chartHeight = 120;

  const handleStart = useCallback(() => {
    tapHaptic();
    setScreen("playing");
    start();
  }, [start]);

  const handleClose = useCallback(() => {
    tapHaptic();
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "#0a3622" }}>
          <LinearGradient
            colors={["#1b4332", "#0a3622", "#0a1a11"]}
            style={StyleSheet.absoluteFillObject}
          />
          <PhaseVignette
            elapsedMs={elapsedMs}
            active={screen === "playing"}
          />
          <Animated.View style={[{ flex: 1 }, screenShakeStyle]}>
            <SafeAreaView style={{ flex: 1 }}>
              {screen === "intro" && (
                <IntroScreen onStart={handleStart} onClose={handleClose} />
              )}
              {screen === "playing" && (
                <PlayingLayout
                  chartWidth={chartWidth}
                  chartHeight={chartHeight}
                  progress={progress}
                  crashed={crashed}
                  recovered={recovered}
                  phase={phase}
                  elapsedMs={elapsedMs}
                  isHolding={isHolding}
                  onHoldStart={() => {
                    tapHaptic();
                    reHold();
                  }}
                  onHoldEnd={release}
                />
              )}
              {screen === "victory" && (
                <VictoryBlast onFinish={handleClose} />
              )}
              {screen === "paper" && (
                <PaperHandsScreen
                  heldForMs={paperHandsMs}
                  onClose={handleClose}
                />
              )}
            </SafeAreaView>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface PlayingProps {
  chartWidth: number;
  chartHeight: number;
  progress: number;
  crashed: boolean;
  recovered: boolean;
  phase: "idle" | "fear" | "panic" | "hope" | "victory" | "paperHands";
  elapsedMs: number;
  isHolding: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

function PlayingLayout({
  chartWidth,
  chartHeight,
  progress,
  crashed,
  recovered,
  phase,
  elapsedMs,
  isHolding,
  onHoldStart,
  onHoldEnd,
}: PlayingProps) {
  const secondsLeft = Math.max(
    0,
    Math.ceil((HOLD_TARGET_MS - elapsedMs) / 1000)
  );
  const warnScale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isHolding && !reduceMotion) {
      warnScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 160 }),
          withTiming(1, { duration: 160 })
        ),
        -1,
        true
      );
    } else {
      warnScale.value = withTiming(1, { duration: 160 });
    }
  }, [isHolding, warnScale, reduceMotion]);

  const warnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: warnScale.value }],
  }));

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <CaptainSharkOverlay phase={phase} />

      <View
        style={{
          alignItems: "center",
          paddingTop: 70,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 12,
            letterSpacing: 2,
            fontFamily: "Heebo_700Bold",
          }}
        >
          BTC/USD
        </Text>
        <Text
          style={{
            color: crashed ? "#ef4444" : recovered ? "#4ade80" : "#f97316",
            fontSize: 40,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            marginTop: 2,
          }}
        >
          {secondsLeft}s
        </Text>
      </View>

      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <CrashChart
          width={chartWidth}
          height={chartHeight}
          progress={progress}
          crashed={crashed}
          recovered={recovered}
        />
      </View>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <HodlButton
          isHolding={isHolding}
          onHoldStart={onHoldStart}
          onHoldEnd={onHoldEnd}
        />
        {!isHolding && (
          <Animated.View style={warnStyle}>
            <View
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "#ef4444",
              }}
            >
              <Text
                style={{
                  color: "#fca5a5",
                  fontSize: 13,
                  fontFamily: "Heebo_900Black",
                  writingDirection: "rtl",
                }}
              >
                ⚠️ הרמת את האצבע!
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
