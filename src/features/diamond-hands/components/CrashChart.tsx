import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { CRASH_CURVE, curveYAt } from "../diamondHandsData";

interface Props {
  width: number;
  height: number;
  progress: number;
  crashed: boolean;
  recovered: boolean;
}

export function CrashChart({
  width,
  height,
  progress,
  crashed,
  recovered,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));

  const paths = useMemo(() => {
    const drawnPoints: { x: number; y: number }[] = [];
    const sampleCount = 60;
    for (let i = 0; i <= sampleCount; i++) {
      const t = (i / sampleCount) * clamped;
      const y = curveYAt(t);
      drawnPoints.push({ x: t * width, y: y * height });
    }
    if (drawnPoints.length === 0) return { line: "", fill: "" };
    let line = `M ${drawnPoints[0].x} ${drawnPoints[0].y}`;
    for (let i = 1; i < drawnPoints.length; i++) {
      line += ` L ${drawnPoints[i].x} ${drawnPoints[i].y}`;
    }
    const fill = `${line} L ${drawnPoints[drawnPoints.length - 1].x} ${height} L ${drawnPoints[0].x} ${height} Z`;
    return { line, fill };
  }, [clamped, width, height]);

  const fullPath = useMemo(() => {
    if (!recovered) return null;
    let d = `M 0 ${curveYAt(0) * height}`;
    for (const pt of CRASH_CURVE) {
      d += ` L ${pt.t * width} ${pt.y * height}`;
    }
    return d;
  }, [recovered, width, height]);

  const strokeColor = crashed ? "#ef4444" : recovered ? "#4ade80" : "#f97316";
  const fillStart = crashed ? "#ef4444" : recovered ? "#4ade80" : "#f97316";

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillStart} stopOpacity="0.35" />
            <Stop offset="1" stopColor={fillStart} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {paths.fill !== "" && (
          <>
            <Path d={paths.fill} fill="url(#crashFill)" />
            <Path
              d={paths.line}
              stroke={strokeColor}
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {fullPath && (
          <Path
            d={fullPath}
            stroke="#4ade80"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </View>
  );
}
