import Svg, { Path, Rect } from "react-native-svg";

interface TabIconProps {
  size?: number;
}

export function LearnIcon({ size = 28 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Rect x={4} y={8} width={20} height={14} rx={1.5} fill="#8b5cf6" />
      <Path d="M 14 8 L 4 9 L 4 21 L 14 22 Z" fill="#22d3ee" />
      <Path d="M 14 8 L 24 9 L 24 21 L 14 22 Z" fill="#22d3ee" />
      <Rect x={6} y={12} width={6} height={0.7} fill="#0e7490" opacity={0.5} />
      <Rect x={6} y={14} width={5} height={0.7} fill="#0e7490" opacity={0.5} />
      <Rect x={16} y={12} width={6} height={0.7} fill="#0e7490" opacity={0.5} />
      <Rect x={16} y={14} width={5} height={0.7} fill="#0e7490" opacity={0.5} />
      <Path d="M 18 7 L 20.5 7 L 20.5 17 L 19.25 15 L 18 17 Z" fill="#facc15" />
      <Path
        d="M 22 2 L 22.5 4 L 24 4.5 L 22.5 5 L 22 7 L 21.5 5 L 20 4.5 L 21.5 4 Z"
        fill="#facc15"
      />
    </Svg>
  );
}
