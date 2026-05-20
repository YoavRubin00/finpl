import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function InvestmentsIcon({ size = 36 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="invest-green" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5fcf64" />
          <Stop offset="1" stopColor="#2d8a32" />
        </LinearGradient>
      </Defs>

      <G stroke="#1f4f23" strokeWidth={3} strokeLinejoin="round">
        <Rect x={11} y={46} width={14} height={22} rx={4} fill="url(#invest-green)" />
        <Rect x={33} y={34} width={14} height={34} rx={4} fill="url(#invest-green)" />
        <Rect x={55} y={22} width={14} height={46} rx={4} fill="url(#invest-green)" />
      </G>

      <G fill="#9aeb9d" opacity={0.85}>
        <Rect x={14} y={49} width={3.5} height={14} rx={1.75} />
        <Rect x={36} y={37} width={3.5} height={22} rx={1.75} />
        <Rect x={58} y={25} width={3.5} height={32} rx={1.75} />
      </G>

      <Path
        d="M14 28 L40 14 L62 8"
        fill="none"
        stroke="#1f4f23"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M55 4 L66 6 L62 16 Z"
        fill="#ffd23a"
        stroke="#1f4f23"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
