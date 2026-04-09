import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Rect, Line } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

interface DiamondBackgroundProps {
  children?: ReactNode;
}

const DIAMOND_SIZE = 40;
const LINE_COLOR = "rgba(42, 90, 140, 0.10)";
const LINE_WIDTH = 1;

export function DiamondBackground({ children }: DiamondBackgroundProps) {
  return (
    <View style={styles.container}>
      {/* Base gradient: deep royal blue */}
      <LinearGradient
        colors={["#1a3a5c", "#0d2847"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Diamond grid overlay */}
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        pointerEvents="none"
      >
        <Defs>
          <Pattern
            id="diamondGrid"
            patternUnits="userSpaceOnUse"
            width={DIAMOND_SIZE}
            height={DIAMOND_SIZE}
          >
            {/* Diagonal lines forming diamond/rhombus pattern */}
            <Line
              x1={0}
              y1={0}
              x2={DIAMOND_SIZE}
              y2={DIAMOND_SIZE}
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
            />
            <Line
              x1={DIAMOND_SIZE}
              y1={0}
              x2={0}
              y2={DIAMOND_SIZE}
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
            />
          </Pattern>
        </Defs>
        <Rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="url(#diamondGrid)"
        />
      </Svg>

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
});
