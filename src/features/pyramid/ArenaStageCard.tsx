import { useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { createAudioPlayer } from "expo-audio";
import { HolographicCard } from "../../components/ui/HolographicCard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Trophy, Sparkles } from "lucide-react-native";
import {
  useEntranceAnimation,
  fadeInUp,
  SPRING_BOUNCY,
} from "../../utils/animations";
import { ZoomIn } from "react-native-reanimated";
import { tapHaptic, errorHaptic, heavyHaptic } from "../../utils/haptics";
import type { ArenaConfig } from "./arenaConfig";

interface ArenaStageCardProps {
  arena: ArenaConfig;
  isActive: boolean;
  isCurrent: boolean;
  progress: number;
  xpNeeded: number;
  index: number;
  onPress: () => void;
}

const LOCKED_GRADIENT: [string, string] = ["#f3f4f6", "#e5e7eb"];

export function ArenaStageCard({
  arena,
  isActive,
  isCurrent,
  progress,
  xpNeeded,
  index,
  onPress,
}: ArenaStageCardProps) {
  const entranceStyle = useEntranceAnimation(fadeInUp, {
    delay: index * 120,
    spring: SPRING_BOUNCY,
  });

  const glowOpacity = useSharedValue(0.2);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    if (isCurrent) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1400 }),
          withTiming(0.2, { duration: 1400 }),
        ),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(glowOpacity);
    };
  }, [isCurrent, glowOpacity]);

  const borderGlowStyle = useAnimatedStyle(() => ({
    borderColor: isCurrent
      ? arena.glow
      : isActive
        ? `${arena.glow}40`
        : "#e5e7eb",
    shadowOpacity: isCurrent ? glowOpacity.value : 0,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, [cardScale]);

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [cardScale]);

  const handlePress = useCallback(() => {
    if (isActive) {
      heavyHaptic();
      onPress();
    } else {
      errorHaptic();
    }
  }, [onPress, isActive]);

  const playAudio = useCallback(() => {
    if (!arena.audioOverview) return;
    tapHaptic();
    try {
      const player = createAudioPlayer(arena.audioOverview);
      player.play();
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) player.remove();
      });
    } catch { /* silent — file not yet generated */ }
  }, [arena.audioOverview]);

  const gradientColors: [string, string] = isActive
    ? [arena.gradientFrom, arena.gradientTo]
    : LOCKED_GRADIENT;

  // Completed arenas (active but not current) get holographic 3D tilt
  const isCompleted = isActive && !isCurrent;

  return (
    <HolographicCard active={isCompleted} maxTilt={6} style={[{ width: "100%" }, entranceStyle, scaleStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.card,
            {
              shadowColor: arena.glow,
              shadowRadius: isCurrent ? 16 : 6,
            },
            borderGlowStyle,
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          >
            <View className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 rounded-t-2xl" />

            <View className="flex-row-reverse items-center px-4 py-4">
              {/* Arena icon */}
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center mr-1"
                style={{
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.15)"
                    : "#1c1c1e",
                }}
              >
                {!isActive ? (
                  <Lock size={20} color="#52525b" />
                ) : isActive && !isCurrent ? (
                  <Trophy size={22} color="#fbbf24" />
                ) : (
                  <Text style={{ fontSize: 26 }}>{arena.emoji}</Text>
                )}
              </View>

              {/* Text */}
              <View className="flex-1 mr-3" style={{ alignItems: "flex-end" }}>
                <Text
                  className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? "text-white/50" : "text-gray-400"}`}
                  style={{ writingDirection: "rtl" }}
                >
                  זירה {arena.id}
                </Text>
                <Text
                  className={`text-lg font-black ${isActive ? "text-white" : "text-gray-400"}`}
                  style={
                    isActive
                      ? {
                        writingDirection: "rtl",
                        textShadowColor: "rgba(0,0,0,0.5)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      }
                      : { writingDirection: "rtl" }
                  }
                >
                  {arena.name}
                </Text>
                <Text
                  className={`text-xs ${isActive ? "text-white/60" : "text-gray-400"}`}
                  style={{ writingDirection: "rtl" }}
                >
                  {arena.subtitle}
                </Text>
              </View>

              {/* Progress / lock info */}
              {isCurrent && (
                <View className="items-center">
                  <Text className="text-lg font-bold text-white">
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              )}
              {!isActive && (
                <View className="items-center">
                  <Text className="text-xs text-zinc-500" style={{ writingDirection: "rtl" }}>
                    {xpNeeded} XP
                  </Text>
                </View>
              )}
            </View>

            {/* 🎧 Audio overview pill */}
            {isActive && arena.audioOverview && (
              <Pressable onPress={playAudio} style={styles.audioPill}>
                <Text style={styles.audioPillText}>🎧 שמע תקציר</Text>
              </Pressable>
            )}

            {/* Progress bar */}
            {isCurrent && (
              <View className="mx-4 mb-3">
                <View className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                  <LinearGradient
                    colors={[arena.gradientFrom, arena.glow]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: "100%",
                      width: `${Math.round(progress * 100)}%`,
                      borderRadius: 9999,
                    }}
                  />
                </View>
              </View>
            )}

            {/* Bear Mascot (Removed placeholder) */}
            {isActive && (
              <Animated.View
                entering={ZoomIn.springify().damping(12).delay(index * 120 + 300)}
                style={styles.mascot}
              />
            )}

            {/* Sparkles */}
            {isActive && (
              <View className="absolute top-2 left-2">
                <Sparkles size={12} color="rgba(255,255,255,0.25)" />
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </HolographicCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  gradient: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  mascot: {
    position: "absolute",
    bottom: 0,
    left: 4,
    width: 40,
    height: 40,
    opacity: 0.85,
  },
  audioPill: {
    alignSelf: "flex-end",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  audioPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
});
