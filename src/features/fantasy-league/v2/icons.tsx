import React from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path, Rect, Circle, Ellipse, Defs, LinearGradient, Stop, G,
  Text as SvgText,
} from 'react-native-svg';
import { LinearGradient as LG } from 'expo-linear-gradient';
import { F2_SECTORS, type FantasySectorId } from '../../../constants/theme';

const NUM_FONT = 'System';

interface IconProps { size?: number; color?: string }

// ─── Sector glyphs ──────────────────────────────────────────────────────────
export function SectorTech({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={6} width={12} height={12} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Rect x={9.5} y={9.5} width={5} height={5} fill={color} />
      <Path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function SectorBanks({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9 L12 4 L21 9" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M3 9 H21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6 11 V17 M10 11 V17 M14 11 V17 M18 11 V17" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M3 19 H21" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function SectorEnergy({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2 L4 14 H10 L9 22 L20 9 H14 Z" fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

export function SectorHealth({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 13 H8 L10 9 L14 17 L16 13 H21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={3} cy={13} r={1.2} fill={color} />
      <Circle cx={21} cy={13} r={1.2} fill={color} />
    </Svg>
  );
}

export function SectorCrypto({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3 L20 8 L20 16 L12 21 L4 16 L4 8 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 3 L12 21 M4 8 L20 16 M20 8 L4 16" stroke={color} strokeWidth={1.2} opacity={0.55} />
    </Svg>
  );
}

export function SectorConsumer({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8 H19 L17.5 19 Q17.3 20 16.3 20 H7.7 Q6.7 20 6.5 19 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M9 8 V5.5 Q9 3 12 3 Q15 3 15 5.5 V8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Spec-growth: rocket (FinPlay specific — replaces "consumer" in design)
export function SectorSpecGrowth({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2 Q16 6 16 12 Q16 18 12 22 Q8 18 8 12 Q8 6 12 2 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={12} cy={10} r={2} fill={color} />
      <Path d="M8 16 L6 20 M16 16 L18 20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Israel: Star of David
export function SectorIsrael({ size = 24, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3 L18.5 14 L5.5 14 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 21 L5.5 10 L18.5 10 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

const SECTOR_GLYPH: Record<FantasySectorId, (p: IconProps) => React.ReactElement> = {
  tech: SectorTech,
  spec_growth: SectorSpecGrowth,
  banks: SectorBanks,
  energy: SectorEnergy,
  israel: SectorIsrael,
  health: SectorHealth,
  crypto: SectorCrypto,
  consumer: SectorConsumer,
};

// ─── Sector tile (gradient with glyph) ──────────────────────────────────────
interface SectorTileProps { sector: FantasySectorId; size?: number; radius?: number }
export function F2SectorTile({ sector, size = 40, radius = 10 }: SectorTileProps): React.ReactElement {
  const s = F2_SECTORS[sector];
  const Glyph = SECTOR_GLYPH[sector];
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0 }}>
      <LG
        colors={[s.g1, s.g2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        }}
      >
        <Glyph size={size * 0.55} color="#ffffff" />
      </LG>
    </View>
  );
}

// ─── Ticker tile (gradient with ticker letters) ─────────────────────────────
interface TickerTileProps { ticker: string; sector: FantasySectorId; size?: number; radius?: number }
export function F2TickerTile({ ticker, sector, size = 48, radius = 12 }: TickerTileProps): React.ReactElement {
  const s = F2_SECTORS[sector];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        flexShrink: 0,
        shadowColor: s.color,
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <LG
        colors={[s.g1, s.g2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Glossy highlight */}
        <View
          style={{
            position: 'absolute',
            top: 2,
            left: 4,
            right: 4,
            height: '40%',
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: radius * 0.5,
          }}
        />
        <Text
          style={{
            color: '#ffffff',
            fontSize: size * 0.27,
            fontWeight: '900',
            letterSpacing: 0.3,
            fontVariant: ['tabular-nums'],
          }}
        >
          {ticker}
        </Text>
      </LG>
    </View>
  );
}

// ─── Tier shields (silver / gold / diamond) ─────────────────────────────────
export type TierKey = 'silver' | 'gold' | 'diamond';
const TIER_PALETTE: Record<TierKey, { g1: string; g2: string; edge: string }> = {
  silver:  { g1: '#e2e8f0', g2: '#94a3b8', edge: '#475569' },
  gold:    { g1: '#fef3c7', g2: '#facc15', edge: '#a16207' },
  diamond: { g1: '#a5f3fc', g2: '#0891b2', edge: '#155e75' },
};

interface TierShieldProps { tier: TierKey; size?: number }
export function F2TierShield({ tier, size = 56 }: TierShieldProps): React.ReactElement {
  const c = TIER_PALETTE[tier];
  const uid = `tshield-${tier}-${size}`;
  const uidHL = `${uid}-hl`;
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 56 62" fill="none">
      <Defs>
        <LinearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={c.g1} />
          <Stop offset="50%" stopColor={c.g2} />
          <Stop offset="100%" stopColor={c.edge} />
        </LinearGradient>
        <LinearGradient id={uidHL} x1="0" y1="0" x2="1" y2="0.6">
          <Stop offset="0%" stopColor="#fff" stopOpacity={0.6} />
          <Stop offset="60%" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M28 2 L52 8 V32 Q52 48 28 60 Q4 48 4 32 V8 Z" fill={`url(#${uid})`} stroke={c.edge} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M28 2 L52 8 V20 Q42 16 28 16 Q14 16 4 20 V8 Z" fill={`url(#${uidHL})`} />
      {tier === 'silver' && (
        <Path d="M19 26 L28 36 L37 26 L33 22 L28 28 L23 22 Z" fill="#fff" opacity={0.95} />
      )}
      {tier === 'gold' && (
        <G x={28} y={34}>
          <Path
            d="M0 -10 L3.3 -3 L11 -2.2 L5.3 3.2 L6.6 11 L0 7 L-6.6 11 L-5.3 3.2 L-11 -2.2 L-3.3 -3 Z"
            fill="#fff"
            stroke={c.edge}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
        </G>
      )}
      {tier === 'diamond' && (
        <G x={28} y={32}>
          <Path d="M-10 -2 L-5 -10 L5 -10 L10 -2 L0 12 Z" fill="#fff" stroke={c.edge} strokeWidth={1} strokeLinejoin="round" />
          <Path d="M-10 -2 L-5 -10 L0 -2 M0 -2 L5 -10 L10 -2 M-5 -10 L0 -2 L5 -10" stroke={c.edge} strokeWidth={0.6} opacity={0.5} />
        </G>
      )}
    </Svg>
  );
}

// ─── Rank crest (replaces 🥇🥈🥉) ───────────────────────────────────────────
const RANK_PALETTE: Record<1 | 2 | 3, { g1: string; g2: string; edge: string; text: string }> = {
  1: { g1: '#fef3c7', g2: '#facc15', edge: '#a16207', text: '#78350f' },
  2: { g1: '#f1f5f9', g2: '#cbd5e1', edge: '#475569', text: '#1e293b' },
  3: { g1: '#fed7aa', g2: '#fb923c', edge: '#9a3412', text: '#7c2d12' },
};

interface RankCrestProps { rank: 1 | 2 | 3; size?: number }
export function F2RankCrest({ rank, size = 28 }: RankCrestProps): React.ReactElement {
  const c = RANK_PALETTE[rank];
  const uid = `crest-${rank}-${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Defs>
        <LinearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={c.g1} />
          <Stop offset="100%" stopColor={c.g2} />
        </LinearGradient>
      </Defs>
      <Path d="M14 2 L26 6 V14 Q26 22 14 26 Q2 22 2 14 V6 Z" fill={`url(#${uid})`} stroke={c.edge} strokeWidth={1.2} strokeLinejoin="round" />
      <SvgText
        x={14}
        y={18}
        fontSize={11}
        fontWeight="900"
        textAnchor="middle"
        fill={c.text}
        fontFamily={NUM_FONT}
      >
        {String(rank)}
      </SvgText>
    </Svg>
  );
}

// ─── Captain / Vice badge ───────────────────────────────────────────────────
interface CaptainBadgeProps { size?: number; vice?: boolean }
export function F2CaptainBadge({ size = 22, vice = false }: CaptainBadgeProps): React.ReactElement {
  const fill = vice ? '#94a3b8' : '#facc15';
  const stroke = vice ? '#475569' : '#a16207';
  const text = vice ? 'V' : 'C';
  const textColor = vice ? '#fff' : '#78350f';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10.5} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={7.5} fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.5} />
      <SvgText
        x={12}
        y={16}
        fontSize={11}
        fontWeight="900"
        textAnchor="middle"
        fill={textColor}
        fontFamily={NUM_FONT}
      >
        {text}
      </SvgText>
    </Svg>
  );
}

// ─── Shark AI mark (replaces 🦈 emoji) ──────────────────────────────────────
export function F2SharkMark({ size = 32 }: { size?: number }): React.ReactElement {
  const uid = `shark-${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Defs>
        <LinearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#22d3ee" />
          <Stop offset="100%" stopColor="#0e7490" />
        </LinearGradient>
      </Defs>
      <Circle cx={16} cy={16} r={15} fill={`url(#${uid})`} stroke="#0e7490" strokeWidth={1.2} />
      <Ellipse cx={16} cy={14} rx={11} ry={4.5} fill="#fff" opacity={0.18} />
      <Path d="M9 21 L13 11 L17 21 M10.5 18 H15.5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M20 11 V21 M20 11 L23 11 M20 21 L23 21 M20 16 L22.5 16" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// ─── Monogram avatar (replaces animal emoji) ────────────────────────────────
const AVATAR_PALETTES = [
  { g1: '#005bb1', g2: '#0891b2' },
  { g1: '#7c3aed', g2: '#a78bfa' },
  { g1: '#ea580c', g2: '#f59e0b' },
  { g1: '#0891b2', g2: '#06b6d4' },
  { g1: '#dc2626', g2: '#f97316' },
  { g1: '#16a34a', g2: '#22c55e' },
  { g1: '#1d4ed8', g2: '#3b82f6' },
  { g1: '#be185d', g2: '#ec4899' },
  { g1: '#0f766e', g2: '#14b8a6' },
  { g1: '#a16207', g2: '#facc15' },
];

interface AvatarProps { name: string; size?: number }
export function F2Avatar({ name, size = 36 }: AvatarProps): React.ReactElement {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const p = AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
  const initials = name.replace(/\s+/g, '').slice(0, 2);
  const uid = `mono-${Math.abs(h)}-${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Defs>
        <LinearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={p.g1} />
          <Stop offset="100%" stopColor={p.g2} />
        </LinearGradient>
      </Defs>
      <Circle cx={18} cy={18} r={17} fill={`url(#${uid})`} />
      <Circle cx={18} cy={18} r={17} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={0.8} />
      <Ellipse cx={18} cy={12} rx={11} ry={6} fill="#fff" opacity={0.18} />
      <SvgText
        x={18}
        y={23}
        fontSize={14}
        fontWeight="900"
        textAnchor="middle"
        fill="#fff"
        fontFamily="System"
      >
        {initials}
      </SvgText>
    </Svg>
  );
}

// ─── Risk diamonds (1/2/3 filled) ───────────────────────────────────────────
type RiskLevel = 'low' | 'med' | 'high';
const RISK_MAP: Record<RiskLevel, { n: 1 | 2 | 3; color: string }> = {
  low: { n: 1, color: '#16a34a' },
  med: { n: 2, color: '#f59e0b' },
  high: { n: 3, color: '#dc2626' },
};

interface RiskMarkProps { level: RiskLevel; size?: number }
export function F2RiskMark({ level, size = 16 }: RiskMarkProps): React.ReactElement {
  const { n, color } = RISK_MAP[level];
  return (
    <Svg width={size * 1.6} height={size} viewBox="0 0 24 14" fill="none">
      {[0, 1, 2].map((i) => (
        <Path
          key={i}
          d="M5 1 L9 7 L5 13 L1 7 Z"
          transform={`translate(${i * 7} 0)`}
          fill={i < n ? color : '#e5e7eb'}
          stroke={i < n ? color : '#cbd5e1'}
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
}

// ─── Form dots (W/L/D recent results) ───────────────────────────────────────
type FormResult = 'w' | 'l' | 'd';
const FORM_COLORS: Record<FormResult, string> = { w: '#16a34a', l: '#dc2626', d: '#9ca3af' };

interface FormDotsProps { form: FormResult[]; size?: number }
export function F2FormDots({ form, size = 8 }: FormDotsProps): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {form.map((r, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 2,
            backgroundColor: FORM_COLORS[r] ?? '#e5e7eb',
          }}
        />
      ))}
    </View>
  );
}

// ─── Utility icons ──────────────────────────────────────────────────────────
export function F2Trophy({ size = 20, color = '#a16207' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4 H17 V11 Q17 16 12 16 Q7 16 7 11 Z" fill="#facc15" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M7 6 H3.5 V8.5 Q3.5 11.5 7 12" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M17 6 H20.5 V8.5 Q20.5 11.5 17 12" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M9 16 V19 H15 V16 M7.5 21 H16.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function F2Bolt({ size = 14, color = '#f59e0b' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2 L4 14 H10 L9 22 L20 9 H14 Z" fill={color} stroke={color === '#fff' ? '#a16207' : '#78350f'} strokeWidth={0.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function F2Star({ size = 14, color = '#facc15', filled = true }: IconProps & { filled?: boolean }): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3 L14.8 9.2 L21.5 9.9 L16.3 14.5 L17.8 21 L12 17.5 L6.2 21 L7.7 14.5 L2.5 9.9 L9.2 9.2 Z"
        fill={filled ? color : 'none'}
        stroke={filled ? '#a16207' : color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function F2Eye({ size = 14, color = '#6b7280' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12 Q7 5 12 5 Q17 5 22 12 Q17 19 12 19 Q7 19 2 12 Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} fill={color} />
    </Svg>
  );
}

export function F2Users({ size = 14, color = '#6b7280' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={9} r={3.2} stroke={color} strokeWidth={1.6} />
      <Circle cx={17} cy={10} r={2.6} stroke={color} strokeWidth={1.6} />
      <Path d="M2.5 19 Q3 14 9 14 Q15 14 15.5 19" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M15 19 Q15.5 16 17 16 Q20.5 16 21.5 19" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function F2Lock({ size = 14, color = '#6b7280' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={11} width={15} height={10} rx={2} stroke={color} strokeWidth={1.6} />
      <Path d="M8 11 V7.5 Q8 4 12 4 Q16 4 16 7.5 V11" stroke={color} strokeWidth={1.6} fill="none" />
      <Circle cx={12} cy={16} r={1.4} fill={color} />
    </Svg>
  );
}

export function F2Clock({ size = 14, color = '#6b7280' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path d="M12 7 V12 L15.5 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function F2Swap({ size = 16, color = '#005bb1' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8 H18 L15 5 M20 16 H6 L9 19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function F2Plus({ size = 14, color = '#005bb1' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4 V20 M4 12 H20" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

export function F2Check({ size = 14, color = '#fff' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12 L10 18 L20 6" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

type ChevDir = 'left' | 'right' | 'up' | 'down';
const CHEV_ROTATE: Record<ChevDir, string> = { left: '0deg', right: '180deg', up: '90deg', down: '-90deg' };
interface ChevronProps { size?: number; dir?: ChevDir; color?: string }
export function F2Chevron({ size = 12, dir = 'left', color = '#9ca3af' }: ChevronProps): React.ReactElement {
  return (
    <View style={{ transform: [{ rotate: CHEV_ROTATE[dir] }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M15 5 L8 12 L15 19" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

export function F2Flame({ size = 14, color = '#f97316' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22 Q4 18 4 12 Q4 7 8 4 Q9 8 12 8 Q14 5 13 2 Q19 5 20 12 Q20 18 12 22 Z" fill={color} stroke="#9a3412" strokeWidth={0.8} strokeLinejoin="round" />
      <Path d="M12 22 Q8 19 8 14 Q8 11 11 9 Q11 13 13 13 Q14 11 14 9 Q17 12 17 14 Q17 19 12 22 Z" fill="#fbbf24" />
    </Svg>
  );
}

export function F2Crown({ size = 18, color = '#facc15' }: IconProps): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 9 L6 16 L10 5 L14 16 L18 5 L22 9 L20 19 L4 19 Z" fill={color} stroke="#78350f" strokeWidth={1.2} strokeLinejoin="round" />
      <Circle cx={6} cy={16} r={1.2} fill="#dc2626" />
      <Circle cx={14} cy={16} r={1.2} fill="#0891b2" />
      <Circle cx={18} cy={16} r={1.2} fill="#a78bfa" />
    </Svg>
  );
}
