import Svg, { Circle, Path } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function FeedIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx={14} cy={14} r={11} fill="#facc15" />
      <Circle cx={14} cy={14} r={10} fill="#d4a017" />
      <Circle cx={14} cy={14} r={8.5} fill="#ffffff" />
      <Path d="M 14 6 L 12 14 L 16 14 Z" fill="#ef4444" />
      <Path d="M 14 22 L 12 14 L 16 14 Z" fill="#3b82f6" />
      <Circle cx={14} cy={14} r={1.5} fill="#1e293b" />
    </Svg>
  );
}
