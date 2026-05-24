import { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Zap, ChevronLeft } from "lucide-react-native";
import { useEconomyStore } from "../economy/useEconomyStore";
import { getPyramidStatus } from "../../utils/progression";
import { ARENAS } from "./arenaConfig";
import {
  useEntranceAnimation,
  fadeInUp,
  SPRING_BOUNCY,
} from "../../utils/animations";
import { tapHaptic } from "../../utils/haptics";

export function DailyChallengePrompt() {
  const router = useRouter();
  const xp = useEconomyStore((s) => s.xp);

  const entranceStyle = useEntranceAnimation(fadeInUp, {
    delay: 200,
    spring: SPRING_BOUNCY,
  });

  const status = getPyramidStatus(xp);
  const currentArena = ARENAS[status.layer - 1];

  const handlePress = useCallback(() => {
    tapHaptic();
    router.push("/(tabs)/learn" as never);
  }, [router]);

  return (
    <Animated.View style={entranceStyle} className="mb-5 px-2">
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={[`${currentArena.glow}20`, `${currentArena.glow}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: `${currentArena.glow}30`,
          }}
        >
          <View className="flex-row-reverse items-center px-4 py-3">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${currentArena.glow}25` }}
            >
              <Zap size={20} color={currentArena.glow} fill={currentArena.glow} />
            </View>

            <View className="flex-1 mr-3" style={{ alignItems: "flex-end" }}>
              <Text
                className="text-base font-bold text-white"
                style={{ writingDirection: "rtl" }}
              >
                האתגר היומי שלך
              </Text>
              <Text
                className="text-xs text-zinc-400 mt-0.5"
                style={{ writingDirection: "rtl" }}
              >
                +20 XP · +50 מטבעות
              </Text>
            </View>

            <ChevronLeft size={20} color="#71717a" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
