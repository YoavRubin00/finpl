import React, { useEffect } from 'react';
import { View, Text, Pressable, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLG, Stop, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  cancelAnimation,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { FANTASY, F2_SECTORS, type FantasySectorId } from '../../../constants/theme';
import { F2Chevron, F2Clock, F2Check } from './icons';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';

const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ─── Section title ──────────────────────────────────────────────────────────
interface SectionProps {
  children: React.ReactNode;
  action?: string;
  hint?: string;
  onActionPress?: () => void;
}
export function F2Section({ children, action, hint, onActionPress }: SectionProps): React.ReactElement {
  return (
    <View style={{
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      marginBottom: 6,
    }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: FANTASY.ink, ...RTL }}>{children as any}</Text>
        {hint && (
          <Text style={{ fontSize: 10, color: FANTASY.inkFaint, fontWeight: '700' }}>{hint}</Text>
        )}
      </View>
      {action && (
        <Pressable
          onPress={onActionPress}
          style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}
          hitSlop={8}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: FANTASY.primary }}>{action}</Text>
          <F2Chevron size={10} dir="left" color={FANTASY.primary} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────
interface PanelProps {
  children: React.ReactNode;
  pad?: number;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}
export function F2Panel({ children, pad = 14, accent, style }: PanelProps): React.ReactElement {
  return (
    <View
      style={[
        {
          backgroundColor: FANTASY.surfaceCard,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: FANTASY.border,
          padding: pad,
          shadowColor: '#0f172a',
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 2,
          elevation: 1,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {accent && (
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 4,
          backgroundColor: accent,
        }} />
      )}
      {children}
    </View>
  );
}

// ─── Tag (soft/solid) ───────────────────────────────────────────────────────
interface TagProps {
  children: React.ReactNode;
  color?: string;
  tone?: 'solid' | 'soft';
  size?: 'sm' | 'md';
}
export function F2Tag({ children, color = FANTASY.primary, tone = 'soft', size = 'sm' }: TagProps): React.ReactElement {
  const isSoft = tone === 'soft';
  const fs = size === 'sm' ? 10 : 11;
  const py = size === 'sm' ? 3 : 4;
  const px = size === 'sm' ? 8 : 10;
  return (
    <View style={{
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isSoft ? `${color}1a` : color,
      borderWidth: isSoft ? 1 : 0,
      borderColor: isSoft ? `${color}55` : 'transparent',
      paddingVertical: py,
      paddingHorizontal: px,
      borderRadius: 999,
      alignSelf: 'flex-start',
    }}>
      {typeof children === 'string' ? (
        <Text style={{ fontSize: fs, fontWeight: '900', color: isSoft ? color : '#fff', letterSpacing: 0.3 }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// ─── LiveDot (pulsing) ──────────────────────────────────────────────────────
interface LiveDotProps { color?: string; label?: string }
export function F2LiveDot({ color = FANTASY.positive, label = 'LIVE' }: LiveDotProps): React.ReactElement {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(op);
  }, [op]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
      <Animated.View
        style={[
          {
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: color,
          },
          dotStyle,
        ]}
      />
      <Text style={{ fontSize: 10, fontWeight: '900', color, letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

// ─── Return pill (▲/▼ + pct) ────────────────────────────────────────────────
interface ReturnProps { pct: number; big?: boolean; signed?: boolean }
export function F2Return({ pct, big = false, signed = true }: ReturnProps): React.ReactElement {
  const positive = pct >= 0;
  const fs = big ? 14 : 11;
  const arrowSize = big ? 11 : 9;
  return (
    <View style={{
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 3,
      backgroundColor: positive ? FANTASY.positiveSoft : FANTASY.negativeSoft,
      paddingVertical: big ? 4 : 2,
      paddingHorizontal: big ? 10 : 7,
      borderRadius: 999,
      alignSelf: 'flex-start',
    }}>
      <Svg width={arrowSize} height={arrowSize} viewBox="0 0 24 24" style={positive ? undefined : { transform: [{ rotate: '180deg' }] as any }}>
        <Path d="M4 16 L12 8 L20 16" fill="none" stroke={positive ? FANTASY.positiveDark : FANTASY.negativeDark} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={[
        {
          fontSize: fs,
          fontWeight: '900',
          color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
        },
        NUM_STYLE,
      ]}>
        {signed && positive ? '+' : ''}{pct.toFixed(2)}%
      </Text>
    </View>
  );
}

// ─── Chip (filter chip row) ─────────────────────────────────────────────────
interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}
export function F2Chip({ children, active = false, color = FANTASY.primary, onPress }: ChipProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: active ? `${color}15` : FANTASY.surfaceCard,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? color : FANTASY.borderStrong,
        opacity: pressed ? 0.85 : 1,
        alignSelf: 'flex-start',
      })}
    >
      <Text style={{
        fontSize: 11,
        fontWeight: '800',
        color: active ? color : FANTASY.inkLabel,
      }}>
        {children as any}
      </Text>
    </Pressable>
  );
}

// ─── Button (primary/gold/success/danger/ghost) ─────────────────────────────
type BtnTone = 'primary' | 'gold' | 'success' | 'danger' | 'ghost';
type BtnSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  tone?: BtnTone;
  size?: BtnSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  full?: boolean;
}

const BTN_TONE: Record<BtnTone, { g: readonly [string, string]; border: string; color: string; shadow: string }> = {
  primary: { g: ['#005bb1', '#0077d6'], border: '#1e3a8a', color: '#fff',    shadow: 'rgba(0,91,177,0.25)' },
  gold:    { g: ['#facc15', '#f59e0b'], border: '#92400e', color: '#451a03', shadow: 'rgba(245,158,11,0.3)' },
  success: { g: ['#16a34a', '#22c55e'], border: '#14532d', color: '#fff',    shadow: 'rgba(22,163,74,0.25)' },
  danger:  { g: ['#dc2626', '#ef4444'], border: '#7f1d1d', color: '#fff',    shadow: 'rgba(220,38,38,0.25)' },
  ghost:   { g: ['#ffffff', '#ffffff'], border: '#e5e7eb', color: '#0f172a', shadow: 'transparent' },
};

const BTN_SIZE: Record<BtnSize, { py: number; px: number; fs: number; br: number }> = {
  sm: { py: 8, px: 14, fs: 12, br: 10 },
  md: { py: 12, px: 18, fs: 13, br: 12 },
  lg: { py: 14, px: 20, fs: 14, br: 14 },
};

export function F2Button({
  children,
  tone = 'primary',
  size = 'md',
  icon,
  iconRight,
  onPress,
  disabled = false,
  full = true,
}: ButtonProps): React.ReactElement {
  const t = BTN_TONE[tone];
  const sz = BTN_SIZE[size];
  const isGhost = tone === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: full ? '100%' : undefined,
        borderRadius: sz.br,
        overflow: 'hidden',
        opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        shadowColor: t.shadow,
        shadowOpacity: 0.6,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: isGhost ? 0 : 6,
      })}
    >
      <LinearGradient
        colors={t.g}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: sz.br,
          paddingVertical: sz.py,
          paddingHorizontal: sz.px,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row-reverse',
          gap: 6,
          borderWidth: isGhost ? 1.5 : 0,
          borderColor: isGhost ? t.border : 'transparent',
          borderBottomWidth: 3,
          borderBottomColor: t.border,
        }}
      >
        {icon}
        <Text style={{
          color: t.color,
          fontSize: sz.fs,
          fontWeight: '900',
          letterSpacing: 0.3,
        }}>
          {children as any}
        </Text>
        {iconRight}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────────────────
export type SparkPath = 'up' | 'down' | 'flat' | 'wave' | 'rising' | 'crash' | 'rally';
const SPARK_PATHS: Record<SparkPath, string> = {
  up:     'M0 22 L20 18 L40 13 L60 8 L80 3',
  down:   'M0 3 L20 7 L40 12 L60 18 L80 22',
  flat:   'M0 12 L20 11 L40 13 L60 10 L80 12',
  wave:   'M0 14 L20 7 L40 16 L60 9 L80 12',
  rising: 'M0 20 L15 18 L30 19 L45 14 L60 11 L80 4',
  crash:  'M0 5 L18 6 L32 10 L48 15 L65 20 L80 22',
  rally:  'M0 18 L20 15 L40 19 L55 9 L75 6 L80 4',
};

interface SparkProps {
  path: SparkPath;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  withFill?: boolean;
}
export function F2Spark({
  path,
  width = 80,
  height = 24,
  color,
  strokeWidth = 1.8,
  withFill = true,
}: SparkProps): React.ReactElement {
  const auto = path === 'down' || path === 'crash' ? FANTASY.negative : path === 'flat' ? '#6b7280' : FANTASY.positive;
  const c = color ?? auto;
  const uid = `spark-${path}-${width}-${height}`;
  return (
    <Svg width={width} height={height} viewBox="0 0 80 24">
      {withFill && (
        <>
          <Defs>
            <SvgLG id={uid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={c} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={c} stopOpacity={0} />
            </SvgLG>
          </Defs>
          <Path d={`${SPARK_PATHS[path]} L80 24 L0 24 Z`} fill={`url(#${uid})`} />
        </>
      )}
      <Path d={SPARK_PATHS[path]} fill="none" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── AI Score Ring ──────────────────────────────────────────────────────────
interface AIScoreRingProps { score: number; size?: number; label?: boolean }
export function F2AIScoreRing({ score, size = 44, label = false }: AIScoreRingProps): React.ReactElement {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = score >= 80 ? FANTASY.positive : score >= 60 ? FANTASY.warning : FANTASY.negative;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={3.5} />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </Svg>
      </View>
      <Text style={[
        {
          fontSize: size * 0.32,
          fontWeight: '900',
          color,
          lineHeight: size * 0.32 * 1.05,
        },
        NUM_STYLE,
      ]}>
        {Math.round(score)}
      </Text>
      {label && (
        <Text style={{
          fontSize: 7,
          color: FANTASY.inkFaint,
          fontWeight: '800',
          letterSpacing: 0.4,
          marginTop: -2,
        }}>
          AI
        </Text>
      )}
    </View>
  );
}

// ─── Budget bar ─────────────────────────────────────────────────────────────
interface BudgetBarProps { used: number; total?: number; currency?: string }
export function F2BudgetBar({ used, total = 100, currency = 'M' }: BudgetBarProps): React.ReactElement {
  const pct = Math.min(100, (used / total) * 100);
  const remaining = total - used;
  const status = pct < 60 ? 'good' : pct < 90 ? 'warn' : 'bad';
  const trackColor = status === 'good' ? FANTASY.positive : status === 'warn' ? FANTASY.warning : FANTASY.negative;
  return (
    <View style={{
      backgroundColor: FANTASY.surfaceCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: FANTASY.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      shadowColor: '#0f172a',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
    }}>
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <Text style={{
          fontSize: 10,
          color: FANTASY.inkFaint,
          fontWeight: '800',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}>
          תקציב
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
          <GoldCoinIcon size={14} />
          <Text style={[{ fontSize: 16, fontWeight: '900', color: FANTASY.ink }, NUM_STYLE]}>
            {remaining.toFixed(1)}{currency}
          </Text>
          <Text style={{ fontSize: 10, color: FANTASY.inkMuted, fontWeight: '700' }}>
            / {total}{currency} סה״כ
          </Text>
        </View>
      </View>
      <View style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: FANTASY.surfaceMuted,
        overflow: 'hidden',
        flexDirection: 'row-reverse',
      }}>
        <LinearGradient
          colors={[trackColor, `${trackColor}aa`] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: `${pct}%`, borderRadius: 999 }}
        />
      </View>
    </View>
  );
}

// ─── Gameweek meter ─────────────────────────────────────────────────────────
interface GameweekMeterProps { day: number; total?: number; deadline?: string }
export function F2GameweekMeter({ day, total = 7, deadline }: GameweekMeterProps): React.ReactElement {
  return (
    <LinearGradient
      colors={[FANTASY.warningSoft, FANTASY.surfaceCard] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: FANTASY.warningStroke,
        paddingVertical: 10,
        paddingHorizontal: 14,
        shadowColor: FANTASY.warning,
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <F2LiveDot color={FANTASY.positive} label="GAMEWEEK" />
          <Text style={[{ fontSize: 11, fontWeight: '900', color: FANTASY.warningDark }, NUM_STYLE]}>
            {day} / {total}
          </Text>
        </View>
        {deadline && (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <F2Clock size={11} color={FANTASY.warningDark} />
            <Text style={[{ fontSize: 10, fontWeight: '800', color: FANTASY.warningDark }, NUM_STYLE]}>
              {deadline}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row-reverse', gap: 3 }}>
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < day;
          const current = i === day - 1;
          return current ? (
            <LinearGradient
              key={i}
              colors={['#facc15', '#f59e0b'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                shadowColor: '#f59e0b',
                shadowOpacity: 0.6,
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 4,
                elevation: 3,
              }}
            />
          ) : (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                backgroundColor: filled ? FANTASY.goldStroke : FANTASY.surfaceMuted,
              }}
            />
          );
        })}
      </View>
    </LinearGradient>
  );
}

// ─── Slot rail (draft progress) ─────────────────────────────────────────────
export interface SlotRailItem { sector: FantasySectorId; ticker?: string }
interface SlotRailProps { slots: SlotRailItem[]; current: number }
export function F2SlotRail({ slots, current }: SlotRailProps): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 4, paddingHorizontal: 2 }}>
      {slots.map((slot, i) => {
        const s = F2_SECTORS[slot.sector];
        const isCurrent = i === current;
        const isDone = !!slot.ticker;
        return (
          <React.Fragment key={`slot-${i}`}>
            {i > 0 && (
              <View style={{
                width: 14,
                height: 2,
                marginTop: 22,
                backgroundColor: isDone || (isCurrent && slots[i - 1]?.ticker) ? s.color : FANTASY.borderStrong,
                borderRadius: 999,
              }} />
            )}
            <View style={{ alignItems: 'center', gap: 5, flex: 1 }}>
              <View style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                borderWidth: isCurrent ? 2.5 : isDone ? 0 : 2,
                borderColor: isCurrent ? s.color : FANTASY.borderStrong,
                borderStyle: isCurrent ? 'dashed' : 'solid',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: isCurrent ? FANTASY.surfaceCard : isDone ? 'transparent' : FANTASY.surfaceLow,
                shadowColor: isCurrent ? s.color : isDone ? s.color : 'transparent',
                shadowOpacity: isCurrent ? 0.25 : isDone ? 0.3 : 0,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 6,
                elevation: isCurrent || isDone ? 4 : 0,
              }}>
                {isDone ? (
                  <LinearGradient
                    colors={[s.g1, s.g2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.2 }, NUM_STYLE]}>
                      {slot.ticker}
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={{ fontSize: 18, color: isCurrent ? s.color : FANTASY.borderHigh }}>
                    {/* placeholder; we render glyph via parent if needed */}
                    {s.short.slice(0, 2)}
                  </Text>
                )}
                {isDone && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    backgroundColor: '#fff',
                    borderWidth: 2,
                    borderColor: s.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <F2Check size={9} color={s.color} />
                  </View>
                )}
              </View>
              <Text style={{
                fontSize: 9,
                fontWeight: '800',
                color: isCurrent ? s.color : isDone ? FANTASY.inkLabel : FANTASY.inkFaint,
              }}>
                {s.short}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Currency cluster (XP + Coins) ──────────────────────────────────────────
interface CurrencyProps { amount: number | string; icon: React.ReactNode }
export function F2Currency({ amount, icon }: CurrencyProps): React.ReactElement {
  return (
    <View style={{
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
      backgroundColor: FANTASY.surfaceCard,
      borderWidth: 1,
      borderColor: FANTASY.borderStrong,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 999,
      shadowColor: '#0f172a',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
    }}>
      {icon}
      <Text style={[{ fontSize: 12, fontWeight: '900', color: FANTASY.ink }, NUM_STYLE]}>
        {typeof amount === 'number' ? amount.toLocaleString('en-US') : amount}
      </Text>
    </View>
  );
}

// ─── Wallet cluster (XP + Coins icons — uses real app GoldCoinIcon) ─────────
function XPBoltIcon({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2 L4 14 H10 L9 22 L20 9 H14 Z" fill="#a78bfa" stroke="#3b1d80" strokeWidth={1} />
    </Svg>
  );
}

interface WalletProps { xp?: number; coins?: number; showXp?: boolean }
export function F2WalletCluster({ xp = 0, coins = 0, showXp = true }: WalletProps): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
      {showXp && <F2Currency amount={xp} icon={<XPBoltIcon size={14} />} />}
      <F2Currency amount={coins} icon={<GoldCoinIcon size={16} />} />
    </View>
  );
}

// ─── Stat (label · value) ───────────────────────────────────────────────────
interface StatProps {
  label: string;
  value: string | number;
  accent?: boolean;
  color?: string;
  mono?: boolean;
}
export function F2Stat({ label, value, accent = false, color, mono = true }: StatProps): React.ReactElement {
  return (
    <View style={{ alignItems: 'flex-end', gap: 1 }}>
      <Text style={{
        fontSize: 9,
        color: FANTASY.inkFaint,
        fontWeight: '800',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}>
        {label}
      </Text>
      <Text style={[
        {
          fontSize: accent ? 14 : 12,
          fontWeight: '900',
          color: color ?? (accent ? FANTASY.primary : FANTASY.ink),
        },
        mono ? NUM_STYLE : undefined,
      ]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Score (big readable number) ────────────────────────────────────────────
interface ScoreProps { points: number; size?: number; color?: string; label?: string }
export function F2Score({ points, size = 44, color = FANTASY.ink, label }: ScoreProps): React.ReactElement {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={[
        {
          fontSize: size,
          fontWeight: '900',
          color,
          lineHeight: size * 0.9,
          letterSpacing: -1,
        },
        NUM_STYLE,
      ]}>
        {points}
      </Text>
      {label && (
        <Text style={{
          fontSize: 9,
          color: FANTASY.inkFaint,
          fontWeight: '800',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}>
          {label}
        </Text>
      )}
    </View>
  );
}
