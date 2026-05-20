/**
 * LiveOps icons (רטנשן domain) — for time-sensitive UI moments.
 *
 *   • CountdownRing → LTO timer pill, daily reset countdown
 *   • StreakFire    → streak-at-risk badge, hot tier indicator
 *   • CalendarEvent → seasonal event banner (independence/holiday)
 *   • ComebackWave  → returning user toast
 *   • ProgressRing  → daily quest progress badge
 */
import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Rect,
  Line,
  Text as SvgText,
} from 'react-native-svg';

interface Props {
  size?: number;
}

export const CountdownRing: React.FC<Props> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="cdG" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#ec4899" />
        <Stop offset="1" stopColor="#7c3aed" />
      </LinearGradient>
    </Defs>
    <Circle cx={12} cy={12} r={9} fill="none" stroke="#1e293b" strokeWidth={2} opacity={0.4} />
    <Path d="M12 3 A9 9 0 1 1 4.5 16.5" fill="none" stroke="url(#cdG)" strokeWidth={2.4} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={1.6} fill="#fef9c3" />
    <Line x1={12} y1={12} x2={12} y2={7.5} stroke="#fef9c3" strokeWidth={1.8} strokeLinecap="round" />
    <Line x1={12} y1={12} x2={15} y2={12} stroke="#fef9c3" strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

export const StreakFire: React.FC<Props> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="sfG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fde047" />
        <Stop offset="0.5" stopColor="#fb923c" />
        <Stop offset="1" stopColor="#dc2626" />
      </LinearGradient>
    </Defs>
    <Path d="M12 2 Q9 7 8 11 Q5 13 5 16 Q5 21 12 22 Q19 21 19 16 Q19 13 16 11 Q15 7 12 2 Z" fill="url(#sfG)" stroke="#7f1d1d" strokeWidth={1.3} strokeLinejoin="round" />
    <Path d="M12 8 Q10 12 10 15 Q10 19 12 19 Q14 19 14 15 Q14 12 12 8 Z" fill="#fde047" />
    <Circle cx={12} cy={16} r={1.4} fill="#fef9c3" />
  </Svg>
);

export const CalendarEvent: React.FC<Props> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={3} y={5} width={18} height={16} rx={2.5} fill="#fbf6e7" stroke="#78350f" strokeWidth={1.4} />
    <Rect x={3} y={5} width={18} height={5} fill="#dc2626" />
    <Line x1={7} y1={3} x2={7} y2={8} stroke="#7f1d1d" strokeWidth={1.6} strokeLinecap="round" />
    <Line x1={17} y1={3} x2={17} y2={8} stroke="#7f1d1d" strokeWidth={1.6} strokeLinecap="round" />
    <Rect x={6} y={13} width={3} height={3} fill="#0ea5e9" />
    <Rect x={11} y={13} width={3} height={3} fill="#a3e635" />
    <Rect x={16} y={13} width={3} height={3} fill="#facc15" />
    <Rect x={9} y={17} width={6} height={2} rx={0.4} fill="#7f1d1d" />
  </Svg>
);

export const ComebackWave: React.FC<Props> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="cbG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#22d3ee" />
        <Stop offset="1" stopColor="#0891b2" />
      </LinearGradient>
    </Defs>
    <Path d="M2 14 Q6 8 10 14 T 18 14 T 22 14" fill="none" stroke="url(#cbG)" strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M2 18 Q6 12 10 18 T 18 18 T 22 18" fill="none" stroke="url(#cbG)" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Path d="M12 11 Q8 7 8 4 Q8 2 10 2 Q11 2 12 3.5 Q13 2 14 2 Q16 2 16 4 Q16 7 12 11 Z" fill="#fb7185" stroke="#7f1d1d" strokeWidth={1.2} strokeLinejoin="round" />
  </Svg>
);

export const ProgressRing: React.FC<Props & { percent?: number }> = ({ size = 24, percent = 75 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="prG" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#22d3ee" />
        <Stop offset="1" stopColor="#22c55e" />
      </LinearGradient>
    </Defs>
    <Circle cx={12} cy={12} r={9} fill="none" stroke="#1e293b" strokeWidth={2.4} opacity={0.35} />
    {/* ~75% complete arc — for now hardcoded; full dynamic-arc support is overkill at 24px */}
    <Path d="M12 3 A9 9 0 1 1 5.5 6.5" fill="none" stroke="url(#prG)" strokeWidth={2.6} strokeLinecap="round" />
    <SvgText x={12} y={14.5} fontSize={6.5} fontWeight="900" textAnchor="middle" fill="#fbf6e7">{percent}%</SvgText>
  </Svg>
);
