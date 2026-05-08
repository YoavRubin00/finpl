import Svg, { Circle, Ellipse, Path } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function InvestmentsIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path
        d="M 14 9 L 14 4"
        stroke="#22c55e"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={14} cy={18} r={9.5} fill="#d4a017" />
      <Circle cx={14} cy={18} r={8} fill="#facc15" />
      <Ellipse cx={11} cy={15} rx={2.5} ry={1.5} fill="#fde047" />
      <Path d="M 14 4 Q 19 5 18 9 Q 16 11 14 9 Z" fill="#22c55e" />
      <Path
        d="M 14 5 L 17 8"
        stroke="#16a34a"
        strokeWidth={0.7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
