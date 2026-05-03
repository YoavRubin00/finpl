/**
 * FinPlay Avatar Mascots — 10 variants of "Pip" (the round blue coin-creature),
 * each kitted out with a different financial archetype's tools.
 *
 * Source design: `assets/DESIGN/Design System_files/avatars.jsx` (Claude web).
 * Converted from web SVG (JSX) to react-native-svg here. All shapes are pure
 * vector — no raster, no realistic shading, matches Coin/Gem/Crown icon
 * language elsewhere in the app.
 *
 * Lookup: `getAvatarSvgIcon(itemId)` returns the right component for a shop
 * item id, used by ShopItemCard.
 */
import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  Pattern,
  Path,
  Circle,
  Rect,
  Ellipse,
  Line,
  Polyline,
  G,
  Text as SvgText,
} from 'react-native-svg';

interface IconProps {
  size?: number;
}

type Expression = 'happy' | 'focused' | 'wink' | 'smug' | 'sleepy';
type BgPattern = 'diamond' | 'rays' | 'none' | 'light';

interface BaseProps {
  id: string;        // unique id for SVG defs (avoids collision when many avatars on same screen)
  size?: number;
  bodyColor: string;
  bodyDark: string;
  bellyColor: string;
  expression: Expression;
  prop?: React.ReactNode;
  accessory?: React.ReactNode;
  bgColor?: string;
  bgPattern?: BgPattern;
  border?: boolean;
}

// ── Eyes & mouths per expression ────────────────────────────────────────────

const Eyes: Record<Expression, React.ReactNode> = {
  happy: (
    <G>
      <Circle cx={42} cy={48} r={4} fill="#0a1628" />
      <Circle cx={58} cy={48} r={4} fill="#0a1628" />
      <Circle cx={43} cy={47} r={1.4} fill="#fff" />
      <Circle cx={59} cy={47} r={1.4} fill="#fff" />
    </G>
  ),
  focused: (
    <G>
      <Rect x={38} y={46} width={8} height={3} rx={1.5} fill="#0a1628" />
      <Rect x={54} y={46} width={8} height={3} rx={1.5} fill="#0a1628" />
    </G>
  ),
  wink: (
    <G>
      <Circle cx={42} cy={48} r={4} fill="#0a1628" />
      <Circle cx={43} cy={47} r={1.4} fill="#fff" />
      <Path d="M53 48 Q58 45 63 48" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  ),
  smug: (
    <G>
      <Path d="M37 49 Q42 46 47 49" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M53 49 Q58 46 63 49" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  ),
  sleepy: (
    <G>
      <Path d="M37 49 Q42 51 47 49" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M53 49 Q58 51 63 49" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Circle cx={68} cy={42} r={2} fill="#a78bfa" />
      <Circle cx={72} cy={36} r={1.2} fill="#a78bfa" />
    </G>
  ),
};

const Mouths: Record<Expression, React.ReactNode> = {
  happy: (
    <Path d="M44 58 Q50 64 56 58" stroke="#0a1628" strokeWidth={2.5} fill="#1e3a8a" strokeLinecap="round" strokeLinejoin="round" />
  ),
  focused: <Path d="M45 60 L55 60" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />,
  wink: (
    <Path d="M44 58 Q50 64 56 58" stroke="#0a1628" strokeWidth={2.5} fill="#1e3a8a" strokeLinecap="round" strokeLinejoin="round" />
  ),
  smug: <Path d="M44 60 Q50 56 56 60" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />,
  sleepy: <Path d="M46 60 Q50 62 54 60" stroke="#0a1628" strokeWidth={2.5} fill="none" strokeLinecap="round" />,
};

// ── Base component ──────────────────────────────────────────────────────────

const AvatarBase: React.FC<BaseProps> = ({
  id,
  size = 120,
  bodyColor,
  bodyDark,
  bellyColor,
  expression,
  prop,
  accessory,
  bgColor = '#0d2847',
  bgPattern = 'diamond',
  border = true,
}) => {
  const bodyId = `avBody-${id}`;
  const clipId = `avClip-${id}`;
  const diamondId = `avBgDiamond-${id}`;
  const raysId = `avBgRays-${id}`;

  const bgFill =
    bgPattern === 'diamond' ? `url(#${diamondId})`
    : bgPattern === 'rays' ? `url(#${raysId})`
    : bgPattern === 'light' ? '#f7f9fb'
    : bgColor;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {bgPattern === 'diamond' && (
          <Pattern id={diamondId} x="0" y="0" width={12} height={12} patternUnits="userSpaceOnUse">
            <Rect width={12} height={12} fill={bgColor} />
            <Path d="M6 0 L12 6 L6 12 L0 6 Z" fill="rgba(42,90,140,0.18)" />
          </Pattern>
        )}
        {bgPattern === 'rays' && (
          <RadialGradient id={raysId} cx="50%" cy="50%" r="60%">
            <Stop offset="0" stopColor="#1a3a5c" />
            <Stop offset="1" stopColor={bgColor} />
          </RadialGradient>
        )}
        <LinearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={bodyColor} />
          <Stop offset="1" stopColor={bodyDark} />
        </LinearGradient>
        <ClipPath id={clipId}>
          <Circle cx={50} cy={50} r={48} />
        </ClipPath>
      </Defs>

      {/* Circular bg */}
      <Circle cx={50} cy={50} r={48} fill={bgFill} />
      {border && <Circle cx={50} cy={50} r={48} fill="none" stroke={bgPattern === 'light' ? '#e0e3e5' : '#d4a017'} strokeWidth={2} />}

      <G clipPath={`url(#${clipId})`}>
        {/* Body — chubby teardrop */}
        <Ellipse cx={50} cy={92} rx={34} ry={22} fill={`url(#${bodyId})`} stroke="#0a1628" strokeWidth={1.8} />
        {/* Head */}
        <Circle cx={50} cy={46} r={26} fill={`url(#${bodyId})`} stroke="#0a1628" strokeWidth={1.8} />
        {/* Belly highlight */}
        <Ellipse cx={50} cy={86} rx={20} ry={13} fill={bellyColor} opacity={0.7} />
        {/* Cheeks */}
        <Circle cx={34} cy={56} r={3.5} fill="#fb7185" opacity={0.6} />
        <Circle cx={66} cy={56} r={3.5} fill="#fb7185" opacity={0.6} />
        {/* Tiny arms */}
        <Ellipse cx={22} cy={80} rx={6} ry={9} fill={`url(#${bodyId})`} stroke="#0a1628" strokeWidth={1.5} transform="rotate(-15 22 80)" />
        <Ellipse cx={78} cy={80} rx={6} ry={9} fill={`url(#${bodyId})`} stroke="#0a1628" strokeWidth={1.5} transform="rotate(15 78 80)" />
        {/* Face */}
        {Eyes[expression]}
        {Mouths[expression]}
        {prop}
        {accessory}
      </G>
    </Svg>
  );
};

// ── Props (held items) ──────────────────────────────────────────────────────

const PropCoin = (
  <G transform="translate(50 78)">
    <Circle cx={0} cy={0} r={11} fill="#fde68a" stroke="#0a1628" strokeWidth={1.8} />
    <Circle cx={0} cy={0} r={8} fill="none" stroke="#854d0e" strokeWidth={1} />
    <SvgText x={0} y={4} fontSize={11} fontWeight="900" textAnchor="middle" fill="#854d0e">$</SvgText>
  </G>
);

const PropBook = (
  <G transform="translate(50 80)">
    <Path d="M-14 -2 L0 -5 L0 7 L-14 9 Z" fill="#fbbf24" stroke="#0a1628" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M14 -2 L0 -5 L0 7 L14 9 Z" fill="#f59e0b" stroke="#0a1628" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M0 -5 L0 7" stroke="#0a1628" strokeWidth={1.4} />
    <Path d="M-10 0 L-3 -1" stroke="#7c2d12" strokeWidth={0.8} />
    <Path d="M-10 3 L-3 2" stroke="#7c2d12" strokeWidth={0.8} />
    <Path d="M3 -1 L10 0" stroke="#7c2d12" strokeWidth={0.8} />
    <Path d="M3 2 L10 3" stroke="#7c2d12" strokeWidth={0.8} />
  </G>
);

const PropPiggy = (
  <G transform="translate(50 82)">
    <Ellipse cx={0} cy={0} rx={14} ry={10} fill="#f9a8d4" stroke="#0a1628" strokeWidth={1.6} />
    <Circle cx={-9} cy={-2} r={1.2} fill="#0a1628" />
    <Ellipse cx={-12} cy={2} rx={2.5} ry={2} fill="#fbcfe8" stroke="#0a1628" strokeWidth={1} />
    <Circle cx={-13} cy={2} r={0.6} fill="#0a1628" />
    <Circle cx={-11} cy={2} r={0.6} fill="#0a1628" />
    <Path d="M8 -8 L9 -5" stroke="#0a1628" strokeWidth={1.4} strokeLinecap="round" />
    <Rect x={-2} y={-8} width={4} height={1.5} rx={0.5} fill="#0a1628" />
    <Rect x={-9} y={9} width={3} height={3} fill="#0a1628" />
    <Rect x={6} y={9} width={3} height={3} fill="#0a1628" />
  </G>
);

const PropTablet = (
  <G transform="translate(50 80)">
    <Rect x={-12} y={-9} width={24} height={16} rx={2} fill="#0d2847" stroke="#0a1628" strokeWidth={1.6} />
    <Polyline points="-9,3 -5,0 -1,-2 3,-5 7,-1 9,-4" stroke="#22d3ee" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={7} cy={-1} r={1.2} fill="#fbbf24" />
  </G>
);

const PropShield = (
  <G transform="translate(50 80)">
    <Path d="M0 -10 L11 -7 L10 3 Q5 10 0 12 Q-5 10 -10 3 L-11 -7 Z" fill="#1e3a8a" stroke="#0a1628" strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M0 -10 L11 -7 L0 -7 Z" fill="#3b82f6" />
    <SvgText x={0} y={3} fontSize={10} fontWeight="900" textAnchor="middle" fill="#fbbf24">$</SvgText>
  </G>
);

const PropRocket = (
  <G transform="translate(50 80) rotate(-20)">
    <Path d="M0 -12 Q4 -8 4 4 L2 8 H-2 L-4 4 Q-4 -8 0 -12 Z" fill="#dc2626" stroke="#0a1628" strokeWidth={1.4} strokeLinejoin="round" />
    <Circle cx={0} cy={-4} r={2} fill="#fef3c7" stroke="#0a1628" strokeWidth={1} />
    <Path d="M-4 4 L-7 7 L-5 8 L-3 6 Z" fill="#fb923c" stroke="#0a1628" strokeWidth={1} strokeLinejoin="round" />
    <Path d="M4 4 L7 7 L5 8 L3 6 Z" fill="#fb923c" stroke="#0a1628" strokeWidth={1} strokeLinejoin="round" />
    <Path d="M-2 8 Q0 12 2 8 Q1 11 0 10.5 Q-1 11 -2 8 Z" fill="#fde047" />
  </G>
);

const PropPlant = (
  <G transform="translate(50 82)">
    <Path d="M-9 2 L9 2 L7 10 L-7 10 Z" fill="#92400e" stroke="#0a1628" strokeWidth={1.6} strokeLinejoin="round" />
    <Rect x={-10} y={0} width={20} height={3} rx={1} fill="#7c2d12" stroke="#0a1628" strokeWidth={1.2} />
    <Path d="M0 2 L0 -10" stroke="#15803d" strokeWidth={2} strokeLinecap="round" />
    <Ellipse cx={-5} cy={-6} rx={5} ry={3} fill="#16a34a" stroke="#0a1628" strokeWidth={1.4} transform="rotate(-30 -5 -6)" />
    <Ellipse cx={5} cy={-9} rx={5} ry={3} fill="#22c55e" stroke="#0a1628" strokeWidth={1.4} transform="rotate(30 5 -9)" />
    <Circle cx={0} cy={-13} r={4} fill="#fde68a" stroke="#0a1628" strokeWidth={1.3} />
    <SvgText x={0} y={-11} fontSize={5} fontWeight="900" textAnchor="middle" fill="#854d0e">$</SvgText>
  </G>
);

const PropChart = (
  <G transform="translate(50 80)">
    <Rect x={-12} y={-2} width={4} height={10} fill="#22d3ee" stroke="#0a1628" strokeWidth={1.4} />
    <Rect x={-6} y={-6} width={4} height={14} fill="#a78bfa" stroke="#0a1628" strokeWidth={1.4} />
    <Rect x={0} y={-10} width={4} height={18} fill="#16a34a" stroke="#0a1628" strokeWidth={1.4} />
    <Rect x={6} y={-13} width={4} height={21} fill="#fbbf24" stroke="#0a1628" strokeWidth={1.4} />
    <Path d="M-12 -4 L10 -16 L7 -14 M10 -16 L8 -13" stroke="#dc2626" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </G>
);

const PropGlobe = (
  <G transform="translate(50 80)">
    <Circle cx={0} cy={0} r={11} fill="#22d3ee" stroke="#0a1628" strokeWidth={1.6} />
    <Path d="M-7 -3 Q-4 -6 -1 -4 Q-3 -1 -6 0 Z" fill="#16a34a" stroke="#0a1628" strokeWidth={1} />
    <Path d="M2 1 Q5 -1 8 1 Q7 4 4 5 Q1 4 2 1 Z" fill="#16a34a" stroke="#0a1628" strokeWidth={1} />
    <Path d="M-3 5 Q0 4 3 7 Q0 8 -2 7 Z" fill="#16a34a" stroke="#0a1628" strokeWidth={1} />
    <Ellipse cx={0} cy={0} rx={11} ry={5} fill="none" stroke="#0a1628" strokeWidth={0.7} opacity={0.5} />
    <Line x1={0} y1={-11} x2={0} y2={11} stroke="#0a1628" strokeWidth={0.7} opacity={0.5} />
  </G>
);

const PropChess = (
  <G transform="translate(50 80)">
    <Path d="M-7 8 L7 8 L8 5 L-8 5 Z" fill="#1a1035" stroke="#0a1628" strokeWidth={1.4} />
    <Rect x={-6} y={-2} width={12} height={7} fill="#1a1035" stroke="#0a1628" strokeWidth={1.4} />
    <Ellipse cx={0} cy={-2} rx={7} ry={2} fill="#1a1035" stroke="#0a1628" strokeWidth={1.4} />
    <Rect x={-4} y={-7} width={8} height={5} rx={1} fill="#1a1035" stroke="#0a1628" strokeWidth={1.4} />
    <Rect x={-1} y={-13} width={2} height={6} fill="#fbbf24" stroke="#0a1628" strokeWidth={1} />
    <Rect x={-3} y={-11} width={6} height={2} fill="#fbbf24" stroke="#0a1628" strokeWidth={1} />
  </G>
);

// ── Accessories (head decorations) ──────────────────────────────────────────

const AccGraduation = (
  <G transform="translate(50 24)">
    <Path d="M-18 -2 L0 -10 L18 -2 L0 4 Z" fill="#1a1035" stroke="#0a1628" strokeWidth={1.4} strokeLinejoin="round" />
    <Rect x={-8} y={-2} width={16} height={3} fill="#1a1035" stroke="#0a1628" strokeWidth={1.2} />
    <Line x1={14} y1={-2} x2={20} y2={6} stroke="#fbbf24" strokeWidth={1.4} />
    <Circle cx={20} cy={6} r={2.4} fill="#fbbf24" stroke="#0a1628" strokeWidth={1.2} />
  </G>
);

const AccCrown = (
  <G transform="translate(50 22)">
    <Path d="M-14 0 L-9 -8 L-4 -2 L0 -10 L4 -2 L9 -8 L14 0 L12 6 L-12 6 Z" fill="#fbbf24" stroke="#0a1628" strokeWidth={1.4} strokeLinejoin="round" />
    <Circle cx={-9} cy={-8} r={2} fill="#dc2626" stroke="#0a1628" strokeWidth={1} />
    <Circle cx={0} cy={-10} r={2.2} fill="#22d3ee" stroke="#0a1628" strokeWidth={1} />
    <Circle cx={9} cy={-8} r={2} fill="#16a34a" stroke="#0a1628" strokeWidth={1} />
    <Rect x={-12} y={2} width={24} height={2} fill="#d4a017" />
  </G>
);

const AccGlasses = (
  <G transform="translate(50 48)">
    <Circle cx={-10} cy={0} r={6} fill="rgba(255,255,255,0.2)" stroke="#0a1628" strokeWidth={1.6} />
    <Circle cx={10} cy={0} r={6} fill="rgba(255,255,255,0.2)" stroke="#0a1628" strokeWidth={1.6} />
    <Line x1={-4} y1={0} x2={4} y2={0} stroke="#0a1628" strokeWidth={1.4} />
    <Line x1={-16} y1={0} x2={-19} y2={-1} stroke="#0a1628" strokeWidth={1.4} />
    <Line x1={16} y1={0} x2={19} y2={-1} stroke="#0a1628" strokeWidth={1.4} />
    <Path d="M-12 -3 L-8 -3 L-12 3 Z" fill="#fff" opacity={0.6} />
    <Path d="M8 -3 L12 -3 L8 3 Z" fill="#fff" opacity={0.6} />
  </G>
);

const AccHardHat = (
  <G transform="translate(50 26)">
    <Path d="M-16 4 Q-16 -10 0 -10 Q16 -10 16 4 Z" fill="#fbbf24" stroke="#0a1628" strokeWidth={1.5} strokeLinejoin="round" />
    <Rect x={-18} y={3} width={36} height={3} rx={1} fill="#d4a017" stroke="#0a1628" strokeWidth={1.4} />
    <Path d="M0 -10 L0 -1" stroke="#dc2626" strokeWidth={2} />
  </G>
);

const AccBeret = (
  <G transform="translate(50 24)">
    <Ellipse cx={0} cy={0} rx={16} ry={6} fill="#7c3aed" stroke="#0a1628" strokeWidth={1.5} />
    <Ellipse cx={-2} cy={-3} rx={14} ry={4} fill="#a78bfa" stroke="#0a1628" strokeWidth={1.2} />
    <Circle cx={-10} cy={-5} r={2.5} fill="#1a1035" stroke="#0a1628" strokeWidth={1.2} />
  </G>
);

const AccVisor = (
  <G transform="translate(50 30)">
    <Path d="M-18 0 Q-18 -8 0 -8 Q18 -8 18 0 L18 2 L-18 2 Z" fill="#0d2847" stroke="#0a1628" strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M-15 -1 Q-15 -6 0 -6 Q15 -6 15 -1" fill="#22d3ee" opacity={0.4} />
  </G>
);

// ── 10 avatar variants ─────────────────────────────────────────────────────

export const AvatarSaver: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="saver" size={size} bodyColor="#22d3ee" bodyDark="#0e7490" bellyColor="#cffafe" expression="happy" prop={PropCoin} bgPattern="rays" />
);

export const AvatarLearner: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="learner" size={size} bodyColor="#3b82f6" bodyDark="#1e3a8a" bellyColor="#dbeafe" expression="focused" prop={PropBook} accessory={AccGraduation} bgPattern="rays" />
);

export const AvatarStrongSaver: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="strongsaver" size={size} bodyColor="#3b82f6" bodyDark="#1e3a8a" bellyColor="#dbeafe" expression="smug" prop={PropPiggy} accessory={AccHardHat} bgPattern="rays" />
);

export const AvatarAnalyst: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="analyst" size={size} bodyColor="#a78bfa" bodyDark="#5b21b6" bellyColor="#ede9fe" expression="focused" prop={PropTablet} accessory={AccGlasses} bgPattern="rays" />
);

export const AvatarDefender: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="defender" size={size} bodyColor="#3b82f6" bodyDark="#1e3a8a" bellyColor="#dbeafe" expression="smug" prop={PropShield} accessory={AccCrown} bgPattern="rays" />
);

export const AvatarInvestor: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="investor" size={size} bodyColor="#22d3ee" bodyDark="#0e7490" bellyColor="#cffafe" expression="wink" prop={PropRocket} accessory={AccVisor} bgPattern="rays" />
);

export const AvatarGrower: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="grower" size={size} bodyColor="#16a34a" bodyDark="#14532d" bellyColor="#dcfce7" expression="happy" prop={PropPlant} bgPattern="rays" />
);

export const AvatarStrategist: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="strategist" size={size} bodyColor="#1e3a8a" bodyDark="#0a1628" bellyColor="#dbeafe" expression="smug" prop={PropChess} accessory={AccBeret} bgPattern="rays" />
);

export const AvatarTrader: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="trader" size={size} bodyColor="#dc2626" bodyDark="#7f1d1d" bellyColor="#fee2e2" expression="focused" prop={PropChart} accessory={AccVisor} bgPattern="rays" />
);

export const AvatarExplorer: React.FC<IconProps> = ({ size = 88 }) => (
  <AvatarBase id="explorer" size={size} bodyColor="#22d3ee" bodyDark="#0e7490" bellyColor="#cffafe" expression="happy" prop={PropGlobe} bgPattern="rays" />
);

// ── Lookup by shop item id ─────────────────────────────────────────────────

const AVATAR_SVG_BY_ID: Record<string, React.FC<IconProps>> = {
  'avatar-saver': AvatarSaver,
  'avatar-learner': AvatarLearner,
  'avatar-strong-saver': AvatarStrongSaver,
  'avatar-analyst': AvatarAnalyst,
  'avatar-defender': AvatarDefender,
  'avatar-investor': AvatarInvestor,
  'avatar-grower': AvatarGrower,
  'avatar-strategist': AvatarStrategist,
  'avatar-trader': AvatarTrader,
  'avatar-explorer': AvatarExplorer,
};

export function getAvatarSvgIcon(itemId: string): React.FC<IconProps> | null {
  return AVATAR_SVG_BY_ID[itemId] ?? null;
}
