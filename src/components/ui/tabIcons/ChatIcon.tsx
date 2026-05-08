import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function ChatIcon({ size = 36 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="chat-teal" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4ccfbf" />
          <Stop offset="1" stopColor="#1c8e83" />
        </LinearGradient>
      </Defs>

      <Ellipse cx={40} cy={68} rx={22} ry={2.5} fill="#134c46" opacity={0.18} />

      <Path
        d="M14 28 Q14 16 26 16 L58 16 Q70 16 70 28 L70 46 Q70 58 58 58 L36 58 L26 66 L28 58 Q14 58 14 46 Z"
        fill="url(#chat-teal)"
        stroke="#134c46"
        strokeWidth={3}
        strokeLinejoin="round"
      />

      <Path
        d="M22 22 Q22 19 25 19 L40 19"
        fill="none"
        stroke="#ffffff"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.45}
      />

      <G fill="#ffffff">
        <Circle cx={28} cy={37} r={4} />
        <Circle cx={42} cy={37} r={4} />
        <Circle cx={56} cy={37} r={4} />
      </G>
      <G fill="#134c46" opacity={0.22}>
        <Circle cx={28} cy={38.5} r={4} />
        <Circle cx={42} cy={38.5} r={4} />
        <Circle cx={56} cy={38.5} r={4} />
      </G>
      <G fill="#ffffff">
        <Circle cx={28} cy={37} r={4} />
        <Circle cx={42} cy={37} r={4} />
        <Circle cx={56} cy={37} r={4} />
      </G>
    </Svg>
  );
}
