import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import type { ReactNode } from "react";

interface SimLottieBackgroundProps {
  children: ReactNode;
  /** Two Lottie sources for top-right and bottom-left decorations */
  lottieSources: [ReturnType<typeof require>, ReturnType<typeof require>];
  /** Optional gradient colors override (defaults to subtle green) */
  gradientColors?: readonly [string, string, string];
  /** Chapter palette gradient (2 colors). When provided, overrides gradientColors. */
  chapterColors?: readonly [string, string];
  /** Decoration icon size in px (default 60) */
  decoSize?: number;
}

export function SimLottieBackground({
  children,
  lottieSources,
  gradientColors = ["#f0fdf4", "#ecfdf5", "#f0fdf4"],
  chapterColors,
  decoSize = 60,
}: SimLottieBackgroundProps) {
  const resolvedGradient: [string, string, ...string[]] = chapterColors
    ? [chapterColors[0], chapterColors[1]]
    : (gradientColors as [string, string, string]);

  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <LinearGradient
        colors={resolvedGradient}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Light overlay, ensures dark text is readable on chapter gradients */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.40)' }]}
      />

      {/* Top-right decoration */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 12,
          right: 8,
          width: decoSize,
          height: decoSize,
          borderRadius: decoSize / 2,
          overflow: "hidden",
          opacity: 0.15,
        }}
      >
        <LottieView
          source={lottieSources[0]}
          style={{ width: decoSize, height: decoSize }}
          autoPlay
          loop
          speed={0.3}
        />
      </View>

      {/* Bottom-left decoration */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 20,
          left: 8,
          width: decoSize,
          height: decoSize,
          borderRadius: decoSize / 2,
          overflow: "hidden",
          opacity: 0.15,
        }}
      >
        <LottieView
          source={lottieSources[1]}
          style={{ width: decoSize, height: decoSize }}
          autoPlay
          loop
          speed={0.3}
        />
      </View>

      {children}
    </View>
  );
}
