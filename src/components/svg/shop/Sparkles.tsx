/**
 * Sparkle particles — 6 curated variants for celebration moments.
 * Use individually or compose into burst patterns (e.g. confetti showers).
 *
 *   • Sparkle4Pt   → classic 4-point twinkle (yellow)
 *   • Star5Pt      → 5-point star (purple)
 *   • BurstLines   → radial burst (cyan) — for "ding" moments
 *   • DotCluster   → multi-color dot scatter (confetti)
 *   • HeartPop     → heart with shine (red)
 *   • PlusBurst    → "+" with circle center (gold)
 */
import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  G,
} from 'react-native-svg';

interface Props {
  size?: number;
}

export const Sparkle4Pt: React.FC<Props> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" fill="#facc15" stroke="#854d0e" strokeWidth={1} strokeLinejoin="round" />
  </Svg>
);

export const Star5Pt: React.FC<Props> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 L14.7 9.3 L22 9.6 L16.2 14.4 L18.4 22 L12 17.7 L5.6 22 L7.8 14.4 L2 9.6 L9.3 9.3 Z" fill="#a78bfa" stroke="#3b1d80" strokeWidth={1} strokeLinejoin="round" />
  </Svg>
);

export const BurstLines: React.FC<Props> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round">
      <Line x1={12} y1={3} x2={12} y2={8} />
      <Line x1={12} y1={16} x2={12} y2={21} />
      <Line x1={3} y1={12} x2={8} y2={12} />
      <Line x1={16} y1={12} x2={21} y2={12} />
      <Line x1={6} y1={6} x2={9} y2={9} />
      <Line x1={15} y1={15} x2={18} y2={18} />
      <Line x1={18} y1={6} x2={15} y2={9} />
      <Line x1={9} y1={15} x2={6} y2={18} />
    </G>
  </Svg>
);

export const DotCluster: React.FC<Props> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={6} cy={8} r={2} fill="#facc15" />
    <Circle cx={12} cy={5} r={2.5} fill="#22d3ee" />
    <Circle cx={18} cy={9} r={1.8} fill="#ef4444" />
    <Circle cx={9} cy={16} r={2.2} fill="#a78bfa" />
    <Circle cx={16} cy={17} r={1.8} fill="#22c55e" />
  </Svg>
);

export const HeartPop: React.FC<Props> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 21 Q3 14 3 8 Q3 3 8 3 Q11 3 12 6 Q13 3 16 3 Q21 3 21 8 Q21 14 12 21 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth={1.2} strokeLinejoin="round" />
    <Path d="M9 8 Q11 6 12 9" fill="none" stroke="#fbf6e7" strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />
  </Svg>
);

export const PlusBurst: React.FC<Props> = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={10} y={3} width={4} height={18} rx={1.5} fill="#facc15" stroke="#854d0e" strokeWidth={1} />
    <Rect x={3} y={10} width={18} height={4} rx={1.5} fill="#facc15" stroke="#854d0e" strokeWidth={1} />
    <Circle cx={12} cy={12} r={2} fill="#fbf6e7" />
  </Svg>
);
