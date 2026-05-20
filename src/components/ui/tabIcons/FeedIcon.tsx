import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function FeedIcon({ size = 36 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="feed-coral-light" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffd2bf" />
          <Stop offset="1" stopColor="#ffb398" />
        </LinearGradient>
        <LinearGradient id="feed-coral" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ff9577" />
          <Stop offset="1" stopColor="#e15a36" />
        </LinearGradient>
      </Defs>

      <Rect
        x={14}
        y={20}
        width={46}
        height={40}
        rx={6}
        fill="url(#feed-coral-light)"
        stroke="#7a2c14"
        strokeWidth={3}
        transform="rotate(-8 37 40)"
      />
      <Rect
        x={18}
        y={18}
        width={46}
        height={42}
        rx={6}
        fill="url(#feed-coral-light)"
        stroke="#7a2c14"
        strokeWidth={3}
        transform="rotate(4 41 39)"
      />
      <Rect
        x={18}
        y={22}
        width={44}
        height={44}
        rx={6}
        fill="url(#feed-coral)"
        stroke="#7a2c14"
        strokeWidth={3}
      />

      <Circle cx={28} cy={33} r={5} fill="#fff3eb" stroke="#7a2c14" strokeWidth={2.5} />
      <Rect x={36} y={30} width={20} height={3.5} rx={1.75} fill="#fff3eb" opacity={0.9} />
      <Rect x={36} y={36} width={14} height={3} rx={1.5} fill="#fff3eb" opacity={0.7} />

      <Rect x={25} y={46} width={30} height={3.5} rx={1.75} fill="#fff3eb" opacity={0.9} />
      <Rect x={25} y={53} width={22} height={3.5} rx={1.75} fill="#fff3eb" opacity={0.75} />
      <Rect x={25} y={60} width={26} height={3.5} rx={1.75} fill="#fff3eb" opacity={0.6} />
    </Svg>
  );
}
