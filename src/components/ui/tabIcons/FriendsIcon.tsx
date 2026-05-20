import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function FriendsIcon({ size = 36 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="friends-purple" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#bd91f0" />
          <Stop offset="1" stopColor="#8454c9" />
        </LinearGradient>
        <LinearGradient id="friends-purple-2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#a878e8" />
          <Stop offset="1" stopColor="#6f3eb5" />
        </LinearGradient>
      </Defs>

      <G stroke="#3f2367" strokeWidth={3} strokeLinejoin="round">
        <Path
          d="M50 50 Q50 42 58 42 Q70 42 72 56 Q72 62 68 62 L42 62 Q40 62 40 58 Q40 50 50 50 Z"
          fill="url(#friends-purple)"
        />
        <Circle cx={56} cy={32} r={9} fill="url(#friends-purple)" />
      </G>

      <G stroke="#3f2367" strokeWidth={3} strokeLinejoin="round">
        <Path
          d="M14 60 Q14 48 28 48 Q42 48 44 60 Q44 66 40 66 L18 66 Q14 66 14 60 Z"
          fill="url(#friends-purple-2)"
        />
        <Circle cx={29} cy={34} r={11} fill="url(#friends-purple-2)" />
      </G>

      <Ellipse cx={25} cy={30} rx={3} ry={4} fill="#ffffff" opacity={0.32} />
      <Ellipse cx={53} cy={29} rx={2.4} ry={3} fill="#ffffff" opacity={0.28} />
    </Svg>
  );
}
