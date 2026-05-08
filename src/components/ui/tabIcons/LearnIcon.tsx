import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function LearnIcon({ size = 36 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="learn-blue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5b9cee" />
          <Stop offset="1" stopColor="#2961b3" />
        </LinearGradient>
        <LinearGradient id="learn-cream" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff7e3" />
          <Stop offset="1" stopColor="#f0dfb1" />
        </LinearGradient>
      </Defs>

      <Ellipse cx={40} cy={66} rx={26} ry={3} fill="#1d3e6b" opacity={0.18} />

      <Path
        d="M10 22 Q10 18 14 18 L36 18 Q40 18 40 22 L40 60 Q40 64 36 64 L14 64 Q10 64 10 60 Z"
        fill="url(#learn-blue)"
        stroke="#1d3e6b"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Path
        d="M40 22 Q40 18 44 18 L66 18 Q70 18 70 22 L70 60 Q70 64 66 64 L44 64 Q40 64 40 60 Z"
        fill="url(#learn-blue)"
        stroke="#1d3e6b"
        strokeWidth={3}
        strokeLinejoin="round"
      />

      <Path
        d="M14 24 L38 24 L38 60 L14 60 Z"
        fill="url(#learn-cream)"
        stroke="#1d3e6b"
        strokeWidth={2.5}
      />
      <Path
        d="M42 24 L66 24 L66 60 L42 60 Z"
        fill="url(#learn-cream)"
        stroke="#1d3e6b"
        strokeWidth={2.5}
      />

      <G fill="#1d3e6b" opacity={0.55}>
        <Rect x={18} y={30} width={16} height={2.4} rx={1.2} />
        <Rect x={18} y={36} width={13} height={2.4} rx={1.2} />
        <Rect x={18} y={42} width={15} height={2.4} rx={1.2} />
        <Rect x={18} y={48} width={11} height={2.4} rx={1.2} />
      </G>
      <G fill="#1d3e6b" opacity={0.55}>
        <Rect x={46} y={30} width={16} height={2.4} rx={1.2} />
        <Rect x={46} y={36} width={13} height={2.4} rx={1.2} />
        <Rect x={46} y={42} width={15} height={2.4} rx={1.2} />
        <Rect x={46} y={48} width={11} height={2.4} rx={1.2} />
      </G>

      <Rect x={38.5} y={20} width={3} height={42} fill="#1d3e6b" opacity={0.9} />

      <Path
        d="M52 18 L60 18 L60 34 L56 30 L52 34 Z"
        fill="#ffd23a"
        stroke="#1d3e6b"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
