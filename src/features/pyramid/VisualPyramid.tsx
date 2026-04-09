import { useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { getPyramidStatus } from "../../utils/progression";
import { useEconomyStore } from "../economy/useEconomyStore";
import { ARENAS, getArenaForXP } from "./arenaConfig";
import { ArenaRankBadge } from "./ArenaRankBadge";
import { ArenaStatsBar } from "./ArenaStatsBar";
import { ArenaStageCard } from "./ArenaStageCard";
import { ArenaConnector } from "./ArenaConnector";
import { DailyChallengePrompt } from "./DailyChallengePrompt";
import type { PyramidLayer } from "../../types/economy";

export function VisualPyramid() {
  const xp = useEconomyStore((state) => state.xp);
  const status = getPyramidStatus(xp);
  const router = useRouter();
  const currentArena = getArenaForXP(xp);

  const handleStagePress = useCallback(
    (layer: PyramidLayer) => {
      const arena = ARENAS[layer - 1];
      if (layer <= status.layer) {
        router.push(arena.chapterRoute as never);
      }
    },
    [status.layer, router],
  );

  return (
    <View className="w-full py-4">
      {/* Arena rank badge */}
      <ArenaRankBadge arena={currentArena} />

      {/* Stats bar */}
      <ArenaStatsBar />

      {/* Daily challenge */}
      <DailyChallengePrompt />

      {/* Arena stages */}
      <View className="w-full px-2">
        {ARENAS.map((arena, index) => {
          const isActive = arena.id <= status.layer;
          const isCurrent = arena.id === status.layer;
          const xpNeeded = isActive ? 0 : arena.xpThreshold - xp;
          return (
            <View key={arena.id}>
              <ArenaStageCard
                arena={arena}
                isActive={isActive}
                isCurrent={isCurrent}
                progress={isCurrent ? status.progressToNextLevel : 0}
                xpNeeded={xpNeeded}
                index={index}
                onPress={() => handleStagePress(arena.id)}
              />
              {index < ARENAS.length - 1 && (
                <ArenaConnector
                  isActive={arena.id < status.layer}
                  glowColor={arena.glow}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Footer */}
      {status.xpToNextLevel > 0 && (
        <Text
          className="mt-6 text-center text-xs text-zinc-500"
          style={{ writingDirection: "rtl" }}
        >
          {status.xpToNextLevel} XP לזירה הבאה
        </Text>
      )}
      {status.xpToNextLevel === 0 && (
        <Text
          className="mt-6 text-center text-xs text-violet-400"
          style={{ writingDirection: "rtl" }}
        >
          הגעת לזירה המקסימלית!
        </Text>
      )}
    </View>
  );
}
