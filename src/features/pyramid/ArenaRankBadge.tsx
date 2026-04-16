import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import {
  useEntranceAnimation,
  fadeInScale,
  fadeInUp,
  SPRING_BOUNCY,
} from "../../utils/animations";
import { heavyHaptic } from "../../utils/haptics";
import type { ArenaConfig } from "./arenaConfig";

export function ArenaRankBadge({ arena }: { arena: ArenaConfig }) {
  const glowAnim = useSharedValue(0.4);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 }),
      ),
      -1,
      true,
    );
    scaleAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(glowAnim);
      cancelAnimation(scaleAnim);
    };
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowAnim.value,
    transform: [{ scale: scaleAnim.value }, { rotate: "45deg" }],
    borderColor: arena.glow,
  }));

  const textEntrance = useEntranceAnimation(fadeInUp, { delay: 100 });

  const handlePress = () => {
    heavyHaptic();
  };

  return (
    <Pressable onPress={handlePress}>
      <View className="items-center mb-8 mt-4 pt-10">
        {/* Glow backdrop */}
        <Animated.View
          style={[
            badgeStyle,
            {
              width: 100,
              height: 100,
              borderRadius: 20,
              borderWidth: 3,
              backgroundColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: arena.glow,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 0 },
              elevation: 12,
            },
          ]}
        >
          <Text style={{ fontSize: 36, transform: [{ rotate: "-45deg" }] }}>
            {arena.emoji}
          </Text>
        </Animated.View>
        <Animated.View style={textEntrance}>
          <Text
            style={{
              color: arena.glow,
              fontSize: 14,
              fontWeight: "700",
              marginTop: 12,
              writingDirection: "rtl",
            }}
          >
            {arena.subtitle}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}
