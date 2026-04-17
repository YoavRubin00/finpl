import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { tapHaptic } from "../../utils/haptics";
import { DH_ASSETS } from "./diamondHandsAssets";
import { DiamondHandsModal } from "./DiamondHandsModal";
import { useDiamondHandsCooldown } from "./useDiamondHandsCooldown";

interface Props {
  isActive: boolean;
}

export function DiamondHandsCard({ isActive }: Props) {
  const [open, setOpen] = useState(false);
  const totalVictories = useDiamondHandsCooldown((s) => s.totalVictories);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!isActive || reduceMotion) {
      pulse.value = 1;
      shimmer.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2400 }),
      -1,
      false
    );
  }, [isActive, pulse, shimmer, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  const handlePress = useCallback(() => {
    tapHaptic();
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            maxWidth: 360,
            borderRadius: 28,
            overflow: "hidden",
            borderWidth: 2.5,
            borderColor: "#0ea5e9",
          },
          cardStyle,
        ]}
      >
        <LinearGradient
          colors={["#1a3a5c", "#0d2847", "#0a1a2e"]}
          style={{ padding: 24 }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(34, 211, 238, 0.08)",
              },
              shimmerStyle,
            ]}
          />

          <View style={{ alignItems: "center", gap: 12 }}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                borderWidth: 1.5,
                borderColor: "#ef4444",
              }}
            >
              <Text
                style={{
                  color: "#fca5a5",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  fontFamily: "Heebo_900Black",
                }}
              >
                🚨 מבחן פאניקה
              </Text>
            </View>

            <Text
              style={{
                color: "#f0f9ff",
                fontSize: 28,
                fontWeight: "900",
                fontFamily: "Heebo_900Black",
                textAlign: "center",
                writingDirection: "rtl",
              }}
            >
              💎 ידיים של יהלום
            </Text>

            <Image
              source={DH_ASSETS.hodlButton}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />

            <Text
              style={{
                color: "#bae6fd",
                fontSize: 14,
                lineHeight: 22,
                textAlign: "center",
                writingDirection: "rtl",
                fontFamily: "Heebo_500Medium",
                maxWidth: 280,
              }}
            >
              השוק קורס. 10 שניות של החזקה.{"\n"}תצליח/י לא למכור?
            </Text>

            <Pressable
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel="פתח את מבחן ידיים של יהלום"
              style={{
                marginTop: 8,
                backgroundColor: "#0ea5e9",
                paddingVertical: 14,
                paddingHorizontal: 36,
                borderRadius: 18,
                borderBottomWidth: 4,
                borderBottomColor: "#0369a1",
              }}
            >
              <Text
                style={{
                  color: "#082f49",
                  fontSize: 16,
                  fontWeight: "900",
                  fontFamily: "Heebo_900Black",
                  writingDirection: "rtl",
                }}
              >
                התחל מבחן
              </Text>
            </Pressable>

            {totalVictories > 0 && (
              <Text
                style={{
                  color: "#0ea5e9",
                  fontSize: 12,
                  fontFamily: "Heebo_700Bold",
                  writingDirection: "rtl",
                }}
              >
                נצחונות: {totalVictories}
              </Text>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      <DiamondHandsModal visible={open} onClose={handleClose} />
    </View>
  );
}
