/**
 * Shop Decorations — chrome assets that frame and tier shop content.
 *
 *   • BundleChest    → "Bundle" category icon for value packs
 *   • RibbonPopular  → "פופולרי" diagonal banner
 *   • RibbonBestValue → "VALUE ★" gold ribbon
 *   • RibbonLimited  → "מוגבל" purple ribbon w/ clock glyph
 *   • FreeBadge      → starburst FREE stamp
 *   • DiscountBadge  → -50% explosion badge
 *   • DividerBronze/Silver/Gold/Diamond → tier separator strips (220×36)
 *
 * Ready to drop in when bundles / LTOs / tier categorization ship.
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

interface IconProps {
  size?: number;
}

interface RibbonProps {
  width?: number;
  height?: number;
}

interface DividerProps {
  width?: number;
  height?: number;
}

// ── Bundle wrapper ──────────────────────────────────────────────────────────

export const BundleChest: React.FC<IconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="chG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fcd34d" />
        <Stop offset="1" stopColor="#a16207" />
      </LinearGradient>
    </Defs>
    <Rect x={3} y={11} width={18} height={9} rx={1.5} fill="url(#chG)" stroke="#78350f" strokeWidth={1.4} />
    <Path d="M3 11 Q3 5 12 5 Q21 5 21 11 Z" fill="url(#chG)" stroke="#78350f" strokeWidth={1.4} strokeLinejoin="round" />
    <Rect x={10} y={9} width={4} height={5} rx={0.5} fill="#78350f" stroke="#451a03" strokeWidth={0.8} />
    <Circle cx={12} cy={11.2} r={0.7} fill="#fcd34d" />
    <Path d="M5 4 L5.5 5.5 L7 6 L5.5 6.5 L5 8 L4.5 6.5 L3 6 L4.5 5.5 Z" fill="#fef3c7" />
    <Path d="M19 3 L19.4 4.2 L20.6 4.6 L19.4 5 L19 6.2 L18.6 5 L17.4 4.6 L18.6 4.2 Z" fill="#fef3c7" />
  </Svg>
);

// ── Ribbons ─────────────────────────────────────────────────────────────────

export const RibbonPopular: React.FC<RibbonProps> = ({ width = 80, height = 28 }) => (
  <Svg width={width} height={height} viewBox="0 0 80 28">
    <Defs>
      <LinearGradient id="popG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fca5a5" stopOpacity={0.3} />
        <Stop offset="1" stopColor="#dc2626" stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Path d="M0 0 L80 0 L72 14 L80 28 L0 28 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth={1.4} strokeLinejoin="round" />
    <Path d="M0 0 L80 0 L72 14 L80 28 L0 28 Z" fill="url(#popG)" />
    <SvgText x={36} y={18} fontSize={11} fontWeight="900" fill="#fef9c3" textAnchor="middle">פופולרי</SvgText>
  </Svg>
);

export const RibbonBestValue: React.FC<RibbonProps> = ({ width = 80, height = 28 }) => (
  <Svg width={width} height={height} viewBox="0 0 80 28">
    <Defs>
      <LinearGradient id="bvG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fde047" />
        <Stop offset="1" stopColor="#a16207" />
      </LinearGradient>
    </Defs>
    <Path d="M0 0 L80 0 L72 14 L80 28 L0 28 Z" fill="url(#bvG)" stroke="#78350f" strokeWidth={1.4} strokeLinejoin="round" />
    <SvgText x={36} y={18} fontSize={10} fontWeight="900" fill="#451a03" textAnchor="middle">VALUE ★</SvgText>
  </Svg>
);

export const RibbonLimited: React.FC<RibbonProps> = ({ width = 80, height = 28 }) => (
  <Svg width={width} height={height} viewBox="0 0 80 28">
    <Defs>
      <LinearGradient id="ltG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#a78bfa" />
        <Stop offset="1" stopColor="#5b21b6" />
      </LinearGradient>
    </Defs>
    <Path d="M0 0 L80 0 L72 14 L80 28 L0 28 Z" fill="url(#ltG)" stroke="#3b1d80" strokeWidth={1.4} strokeLinejoin="round" />
    <Circle cx={14} cy={14} r={6} fill="none" stroke="#fef9c3" strokeWidth={1.4} />
    <Line x1={14} y1={14} x2={14} y2={10} stroke="#fef9c3" strokeWidth={1.6} strokeLinecap="round" />
    <Line x1={14} y1={14} x2={17} y2={14} stroke="#fef9c3" strokeWidth={1.6} strokeLinecap="round" />
    <SvgText x={48} y={18} fontSize={10} fontWeight="900" fill="#fef9c3" textAnchor="middle">מוגבל</SvgText>
  </Svg>
);

// ── Deal badges ─────────────────────────────────────────────────────────────

export const FreeBadge: React.FC<IconProps> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={10.5} fill="#22c55e" stroke="#14532d" strokeWidth={1.6} />
    <Path d="M12 1 L13 4 L12 5 L11 4 Z" fill="#22c55e" stroke="#14532d" strokeWidth={1} strokeLinejoin="round" />
    <Path d="M23 12 L20 13 L19 12 L20 11 Z" fill="#22c55e" stroke="#14532d" strokeWidth={1} strokeLinejoin="round" />
    <Path d="M12 23 L11 20 L12 19 L13 20 Z" fill="#22c55e" stroke="#14532d" strokeWidth={1} strokeLinejoin="round" />
    <Path d="M1 12 L4 11 L5 12 L4 13 Z" fill="#22c55e" stroke="#14532d" strokeWidth={1} strokeLinejoin="round" />
    <SvgText x={12} y={14.5} fontSize={6.5} fontWeight="900" textAnchor="middle" fill="#fef9c3">FREE</SvgText>
  </Svg>
);

export const DiscountBadge: React.FC<IconProps & { percent?: number }> = ({ size = 24, percent = 50 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="dscG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fb923c" />
        <Stop offset="1" stopColor="#dc2626" />
      </LinearGradient>
    </Defs>
    <Path d="M12 1 L14 3 L17 1.5 L17.5 4.5 L20.5 4 L20 7 L23 8 L20.5 10 L23 12 L20 14 L20.5 17 L17.5 16.5 L17 19.5 L14 18 L12 21 L10 18 L7 19.5 L6.5 16.5 L3.5 17 L4 14 L1 12 L4 10 L1 8 L4 7 L3.5 4 L6.5 4.5 L7 1.5 L10 3 Z" fill="url(#dscG)" stroke="#7f1d1d" strokeWidth={1} strokeLinejoin="round" />
    <SvgText x={12} y={11} fontSize={5.5} fontWeight="900" textAnchor="middle" fill="#fef9c3">-{percent}%</SvgText>
    <SvgText x={12} y={16} fontSize={3.5} fontWeight="700" textAnchor="middle" fill="#fef9c3">OFF</SvgText>
  </Svg>
);

// ── Tier dividers · 220×36 strips ───────────────────────────────────────────

export const DividerBronze: React.FC<DividerProps> = ({ width = 220, height = 36 }) => (
  <Svg width={width} height={height} viewBox="0 0 220 36">
    <Line x1={10} y1={18} x2={92} y2={18} stroke="#92400e" strokeWidth={2} strokeLinecap="round" />
    <Line x1={128} y1={18} x2={210} y2={18} stroke="#92400e" strokeWidth={2} strokeLinecap="round" />
    <Circle cx={110} cy={18} r={10} fill="#a16207" stroke="#451a03" strokeWidth={1.6} />
    <SvgText x={110} y={21} fontSize={9} fontWeight="900" textAnchor="middle" fill="#fef9c3">B</SvgText>
  </Svg>
);

export const DividerSilver: React.FC<DividerProps> = ({ width = 220, height = 36 }) => (
  <Svg width={width} height={height} viewBox="0 0 220 36">
    <Line x1={10} y1={18} x2={92} y2={18} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
    <Line x1={128} y1={18} x2={210} y2={18} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
    <Circle cx={110} cy={18} r={11} fill="#cbd5e1" stroke="#475569" strokeWidth={1.6} />
    <SvgText x={110} y={21} fontSize={9} fontWeight="900" textAnchor="middle" fill="#1e293b">S</SvgText>
  </Svg>
);

export const DividerGold: React.FC<DividerProps> = ({ width = 220, height = 36 }) => (
  <Svg width={width} height={height} viewBox="0 0 220 36">
    <Defs>
      <LinearGradient id="ldG" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#fde047" />
        <Stop offset="1" stopColor="#a16207" />
      </LinearGradient>
    </Defs>
    <Line x1={10} y1={18} x2={88} y2={18} stroke="#facc15" strokeWidth={2.2} strokeLinecap="round" />
    <Line x1={132} y1={18} x2={210} y2={18} stroke="#facc15" strokeWidth={2.2} strokeLinecap="round" />
    <Circle cx={110} cy={18} r={13} fill="url(#ldG)" stroke="#78350f" strokeWidth={1.6} />
    <Path d="M110 11 L112 16 L117 16 L113 19 L114.5 24 L110 21 L105.5 24 L107 19 L103 16 L108 16 Z" fill="#fef9c3" stroke="#78350f" strokeWidth={0.7} strokeLinejoin="round" />
  </Svg>
);

export const DividerDiamond: React.FC<DividerProps> = ({ width = 220, height = 36 }) => (
  <Svg width={width} height={height} viewBox="0 0 220 36">
    <Defs>
      <LinearGradient id="ddG" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#22d3ee" />
        <Stop offset="0.5" stopColor="#a78bfa" />
        <Stop offset="1" stopColor="#ec4899" />
      </LinearGradient>
    </Defs>
    <Line x1={10} y1={18} x2={88} y2={18} stroke="url(#ddG)" strokeWidth={2.4} strokeLinecap="round" />
    <Line x1={132} y1={18} x2={210} y2={18} stroke="url(#ddG)" strokeWidth={2.4} strokeLinecap="round" />
    <Path d="M110 5 L122 18 L110 31 L98 18 Z" fill="url(#ddG)" stroke="#3b1d80" strokeWidth={1.4} strokeLinejoin="round" />
    <Path d="M110 5 L122 18 L110 18 Z" fill="#fbf6e7" opacity={0.55} />
  </Svg>
);
