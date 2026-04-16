// Shared feedback bar for simulations — bright, friendly game-style
import { View, Text, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInUp } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { FINN_STANDARD, FINN_HAPPY } from "../../features/retention-loops/finnMascotConfig";

interface SimFeedbackBarProps {
  isCorrect: boolean;
  message: string;
  /** Chapter accent color for the correct-answer bar border and text. */
  accentColor?: string;
  /** Optional Lottie source to render as icon instead of emoji. */
  lottieSource?: ReturnType<typeof require>;
}

export function SimFeedbackBar({ isCorrect, message, accentColor, lottieSource }: SimFeedbackBarProps) {
  const correctBorderColor = accentColor ?? "#34d399";
  const correctTextColor = accentColor ?? "#059669";

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      style={[
        styles.bar,
        isCorrect
          ? [styles.barCorrect, { borderTopColor: correctBorderColor }]
          : styles.barWrong,
      ]}
    >
      {/* Finn mascot — excited on correct, standard on wrong */}
      <ExpoImage
        source={isCorrect ? FINN_HAPPY : FINN_STANDARD}
        style={styles.finn}
        contentFit="contain"
        accessible={false}
      />

      {/* Content */}
      <View style={styles.content}>
        {lottieSource ? (
          <View>
            <LottieView
              source={lottieSource}
              style={styles.lottieIcon}
              autoPlay
              loop={false}
              speed={1}
            />
          </View>
        ) : (
          <View>
            <LottieView
              source={isCorrect
                ? require("../../../assets/lottie/wired-flat-1103-confetti-hover-pinch.json")
                : require("../../../assets/lottie/wired-flat-36-bulb-hover-blink.json")}
              style={{ width: 32, height: 32 }}
              autoPlay
              loop={false}
            />
          </View>
        )}
        <Text
          style={[
            styles.text,
            { color: isCorrect ? correctTextColor : "#92400e" },
          ]}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 24,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 2,
  },
  barCorrect: {
    backgroundColor: "rgba(209, 250, 229, 0.96)",
    borderTopColor: "#34d399",
  },
  barWrong: {
    backgroundColor: "rgba(254, 243, 199, 0.96)",
    borderTopColor: "#fbbf24",
  },
  finn: {
    width: 72,
    height: 72,
  },
  content: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
  },
  emoji: {
    fontSize: 24,
    marginTop: 2,
  },
  lottieIcon: {
    width: 28,
    height: 28,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    writingDirection: "rtl",
    textAlign: "right",
  },
});
