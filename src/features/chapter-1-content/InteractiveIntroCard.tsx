import React, { useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useEntranceAnimation, fadeInScale, fadeInUp, SPRING_BOUNCY } from "../../utils/animations";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { heavyHaptic } from "../../utils/haptics";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

/** Clean glossary markup: [[term|display]] → display, [[term]] → term */
function cleanGlossaryMarkup(raw: string): string {
  return raw
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

/** Render text with bold highlights for English terms and parenthetical content */
function renderBoldText(text: string, accentColor: string): React.ReactNode[] {
  const cleaned = cleanGlossaryMarkup(text);
  const regex = /(\([^)]+\)|[A-Za-z][A-Za-z\d\s&.,-]*)/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      result.push(<Text key={key++}>{cleaned.slice(lastIndex, match.index)}</Text>);
    }
    result.push(
      <Text key={key++} style={{ fontWeight: "900", color: accentColor }}>
        {match[0]}
      </Text>,
    );
    result.push('\u200F');
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < cleaned.length) {
    result.push(<Text key={key++}>{cleaned.slice(lastIndex)}</Text>);
  }
  return result;
}

interface InteractiveIntroCardProps {
  introText: string;
  onStart: () => void;
  unitColors: { bg: string; dim: string; glow: string; bottom: string };
}

export const InteractiveIntroCard = React.memo(function InteractiveIntroCard({ introText, onStart, unitColors }: InteractiveIntroCardProps) {
  const displayText = cleanGlossaryMarkup(introText);
  const { playSound } = useSoundEffect();
  const textStyle = useEntranceAnimation(fadeInUp, { delay: 0 });
  const bearStyle = useEntranceAnimation(fadeInScale, { delay: 200, spring: SPRING_BOUNCY });
  const buttonStyle = useEntranceAnimation(fadeInUp, { delay: 350 });

  // Floating animation for Finn
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500 }),
        withTiming(8, { duration: 1500 }),
      ),
      -1,
      true,
    );
    return () => { cancelAnimation(floatY); };
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'stretch', paddingHorizontal: 8 }}>
      {/* Scrollable content area */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Description card — bright, chapter-colored with glow */}
        <Animated.View style={[textStyle, { marginBottom: 0 }]}>
          <View style={{
            backgroundColor: unitColors.dim,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: unitColors.bg,
            padding: 24,
            shadowColor: unitColors.glow,
            shadowOpacity: 0.4,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}>
            <Text
              style={[RTL_STYLE, {
                fontSize: 17,
                fontWeight: '700',
                color: '#1f2937',
                lineHeight: 30,
              }]}
            >
              {renderBoldText(displayText, unitColors.bottom)}
            </Text>
          </View>
        </Animated.View>

        {/* Finn character — compact, free-floating */}
        <Animated.View style={[bearStyle, floatStyle, { alignSelf: 'center', marginTop: 14, marginBottom: 10 }]}>
          <ExpoImage source={FINN_STANDARD} accessible={false}
            style={{ width: 140, height: 140 }} contentFit="contain" />
        </Animated.View>
      </View>

      {/* 3D Button with Lottie rocket — pinned to bottom */}
      <Animated.View style={[buttonStyle, { alignSelf: 'stretch', marginBottom: 8 }]}>
        <View>
          {/* 3D depth shadow */}
          <View style={{
            position: 'absolute',
            top: 5,
            left: 0,
            right: 0,
            bottom: -5,
            borderRadius: 16,
            backgroundColor: unitColors.bottom,
          }} />
          <AnimatedPressable
            onPress={() => {
              heavyHaptic();
              playSound('btn_click_heavy');
              onStart();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 16,
              backgroundColor: unitColors.bg,
              paddingHorizontal: 40,
              paddingVertical: 16,
              shadowColor: unitColors.glow,
              shadowOpacity: 0.5,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
              elevation: 10,
            }}
          >
            <View style={{ width: 24, height: 24, overflow: "hidden" }}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json")}
                style={{ width: 24, height: 24 }}
                autoPlay
                loop
               />
            </View>
            <Text
              style={[RTL_STYLE, {
                fontSize: 18,
                fontWeight: '900',
                color: '#ffffff',
                textAlign: 'center',
              }]}
            >
              בואו נתחיל!
            </Text>
          </AnimatedPressable>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({});
