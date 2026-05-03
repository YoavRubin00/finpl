/**
 * Empty State illustrations — for "nothing here yet" moments.
 *
 * Use cases:
 *   • EmptyNoFriends → ReferralScreen when friend tree is empty
 *   • EmptyNoBoosts → BoostBanner / Boosts shop tab when no active boost
 *   • EmptyPremium → ShopModal Premium tab (currently empty)
 *   • EmptyAvatarsLocked → ShopModal Avatars tab (locked feature)
 *
 * All 200×200 (or 120×120 for compact). Use within a wrapper with intrinsic
 * sizing — these scale to fit container.
 */
import React from 'react';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Rect,
  Ellipse,
  G,
  Text as SvgText,
} from 'react-native-svg';

interface Props {
  size?: number;
}

export const EmptyNoFriends: React.FC<Props> = ({ size = 200 }) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Ellipse cx={100} cy={115} rx={80} ry={14} fill="#0f172a" opacity={0.35} />
    <Circle cx={100} cy={100} r={78} fill="none" stroke="#3b5374" strokeWidth={2} strokeDasharray="3 6" opacity={0.7} />
    {/* Two ghost-friend silhouettes */}
    {[{ x: 60, op: 0.8 }, { x: 140, op: 0.55 }].map((p, i) => (
      <G key={i} opacity={p.op} transform={`translate(${p.x} 100)`}>
        <Circle cx={0} cy={-12} r={14} fill="#5990bf" stroke="#22456e" strokeWidth={2} />
        <Path d="M -22 30 Q -22 5 0 5 Q 22 5 22 30 Z" fill="#5990bf" stroke="#22456e" strokeWidth={2} strokeLinejoin="round" />
        <SvgText x={0} y={-8} fontSize={14} textAnchor="middle" fill="#fbf6e7" fontWeight="800">?</SvgText>
      </G>
    ))}
    {/* heart between */}
    <G transform="translate(100 60)" opacity={0.85}>
      <Path d="M 0 6 Q -8 -4 -4 -10 Q 0 -14 0 -8 Q 0 -14 4 -10 Q 8 -4 0 6 Z" fill="#a78bfa" stroke="#5b21b6" strokeWidth={1.2} strokeLinejoin="round" />
    </G>
    {/* ground bubbles */}
    <Circle cx={40} cy={155} r={3} fill="#5990bf" opacity={0.6} />
    <Circle cx={55} cy={170} r={2} fill="#5990bf" opacity={0.4} />
    <Circle cx={160} cy={160} r={3} fill="#5990bf" opacity={0.6} />
    <Circle cx={148} cy={175} r={2} fill="#5990bf" opacity={0.4} />
  </Svg>
);

export const EmptyNoBoosts: React.FC<Props> = ({ size = 120 }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={60} r={50} fill="none" stroke="#3b5374" strokeWidth={2} strokeDasharray="3 5" opacity={0.7} />
    <Path d="M68 24 L40 70 H56 L52 96 L82 50 H64 Z" fill="#1e3a5f" stroke="#3b5374" strokeWidth={2} strokeLinejoin="round" />
    <SvgText x={84} y={40} fontSize={12} fill="#94a8c2" fontWeight="800">z</SvgText>
    <SvgText x={92} y={34} fontSize={10} fill="#94a8c2" fontWeight="800">z</SvgText>
    <SvgText x={98} y={28} fontSize={8} fill="#94a8c2" fontWeight="800">z</SvgText>
    <Path d="M22 22 L98 98" stroke="#94a8c2" strokeWidth={2.5} strokeLinecap="round" opacity={0.4} />
  </Svg>
);

export const EmptyPremium: React.FC<Props> = ({ size = 200 }) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Circle cx={100} cy={100} r={78} fill="none" stroke="#3b5374" strokeWidth={2} strokeDasharray="3 6" opacity={0.7} />
    <Path d="M100 50 L130 90 L100 150 L70 90 Z" fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="4 4" />
    <Path d="M70 90 L130 90" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="4 4" />
    <SvgText x={100} y={105} fontSize={14} fontWeight="800" textAnchor="middle" fill="#94a8c2">בקרוב</SvgText>
    <Path d="M40 60 L41 63 L44 64 L41 65 L40 68 L39 65 L36 64 L39 63 Z" fill="#a78bfa" opacity={0.6} />
    <Path d="M160 130 L161 133 L164 134 L161 135 L160 138 L159 135 L156 134 L159 133 Z" fill="#a78bfa" opacity={0.6} />
  </Svg>
);

export const EmptyAvatarsLocked: React.FC<Props> = ({ size = 200 }) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Circle cx={100} cy={100} r={78} fill="none" stroke="#3b5374" strokeWidth={2} strokeDasharray="3 6" opacity={0.7} />
    <Ellipse cx={100} cy={115} rx={48} ry={22} fill="#1e3a5f" stroke="#22456e" strokeWidth={2} />
    <Path d="M70 115 L60 102 L62 118 Z" fill="#1e3a5f" stroke="#22456e" strokeWidth={2} strokeLinejoin="round" />
    <Circle cx={118} cy={108} r={2} fill="#fbf6e7" />
    <G transform="translate(100 70)">
      <Rect x={-14} y={0} width={28} height={22} rx={2.5} fill="#fcd34d" stroke="#78350f" strokeWidth={2} />
      <Path d="M -8 0 V -6 Q -8 -14 0 -14 Q 8 -14 8 -6 V 0" fill="none" stroke="#78350f" strokeWidth={2.5} strokeLinejoin="round" />
      <Circle cx={0} cy={11} r={2.5} fill="#78350f" />
      <Rect x={-1} y={11} width={2} height={6} rx={0.6} fill="#78350f" />
    </G>
  </Svg>
);
