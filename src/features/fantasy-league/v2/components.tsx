import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FANTASY, F2_SECTORS, type FantasySectorId } from '../../../constants/theme';
import {
  F2TickerTile,
  F2CaptainBadge,
  F2RankCrest,
  F2Avatar,
  F2Chevron,
  F2Trophy,
  F2Crown,
} from './icons';
import {
  F2Spark,
  F2Return,
  F2LiveDot,
  F2Tag,
  F2AIScoreRing,
  type SparkPath,
} from './atoms';
import { F2RiskMark, F2Flame, F2TierShield, type TierKey } from './icons';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';

const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ─── ScoreboardHero — gameweek headline card ────────────────────────────────
interface ScoreboardHeroProps {
  /** Cumulative portfolio return, allocation-weighted (e.g. +2.34). */
  returnPercent: number;
  rank: number;
  rankDelta: number;
  prevRank: number;
  /** Captain's contribution to return (% delta from non-leveraged baseline). */
  captainBoost?: number;
  gameweek?: number;
}
export function F2ScoreboardHero({
  returnPercent,
  rank,
  rankDelta,
  prevRank,
  captainBoost,
  gameweek = 14,
}: ScoreboardHeroProps): React.ReactElement {
  const goingUp = rankDelta > 0;
  const positive = returnPercent >= 0;
  const returnColor = positive ? FANTASY.positiveDark : FANTASY.negativeDark;
  return (
    <View style={{
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: FANTASY.primary,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      elevation: 4,
    }}>
      <LinearGradient
        colors={['#dbeafe', '#ffffff'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 16,
          borderWidth: 1.5,
          borderColor: '#bfdbfe',
          borderRadius: 18,
        }}
      >
        {/* Sun-glow decoration */}
        <View style={{
          position: 'absolute',
          top: -20,
          left: -20,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(250,204,21,0.18)',
        }} />

        <View style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View>
            <F2LiveDot color={FANTASY.positive} label={`GAMEWEEK ${gameweek} · LIVE`} />
            <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <Text style={[
                {
                  fontSize: 40,
                  fontWeight: '900',
                  color: returnColor,
                  lineHeight: 40,
                  letterSpacing: -1.5,
                },
                NUM_STYLE,
              ]}>
                {positive ? '+' : ''}{returnPercent.toFixed(2)}%
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: FANTASY.inkMuted, ...RTL, marginTop: 2 }}>
              תשואה מצטברת על התיק
            </Text>
            {captainBoost != null && Math.abs(captainBoost) > 0.01 && (
              <View style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 4,
                backgroundColor: FANTASY.goldSoft,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 999,
                marginTop: 6,
                alignSelf: 'flex-start',
              }}>
                <F2CaptainBadge size={12} />
                <Text style={[
                  { fontSize: 10, fontWeight: '900', color: FANTASY.warningDark },
                  NUM_STYLE,
                ]}>
                  {captainBoost >= 0 ? '+' : ''}{captainBoost.toFixed(2)}% ממנוף
                </Text>
              </View>
            )}
          </View>

          <View style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: FANTASY.borderStrong,
            paddingVertical: 10,
            paddingHorizontal: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 6,
            elevation: 2,
          }}>
            <Text style={{
              fontSize: 8,
              color: FANTASY.inkFaint,
              fontWeight: '800',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}>
              דירוג
            </Text>
            <Text style={[
              {
                fontSize: 28,
                fontWeight: '900',
                color: FANTASY.warningDark,
                lineHeight: 28,
                marginTop: 2,
              },
              NUM_STYLE,
            ]}>
              #{rank}
            </Text>
            {rankDelta !== 0 && (
              <View style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 3,
                marginTop: 4,
              }}>
                <F2Chevron
                  size={9}
                  dir={goingUp ? 'up' : 'down'}
                  color={goingUp ? FANTASY.positiveDark : FANTASY.negativeDark}
                />
                <Text style={[
                  {
                    fontSize: 10,
                    fontWeight: '900',
                    color: goingUp ? FANTASY.positiveDark : FANTASY.negativeDark,
                  },
                  NUM_STYLE,
                ]}>
                  {Math.abs(rankDelta)} מ-#{prevRank}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── LivePick — portfolio row ───────────────────────────────────────────────
interface LivePickProps {
  ticker: string;
  name: string;
  sector: FantasySectorId;
  todayChange: number;
  /** Stock's own cumulative return % since Sunday (before leverage). */
  totalChange: number;
  isCaptain?: boolean;
  /** Coins allocated to this pick — when provided, shown as a chip. */
  allocation?: number;
  spark?: SparkPath;
  onPress?: () => void;
}
export function F2LivePick({
  ticker,
  name,
  sector,
  todayChange,
  totalChange,
  isCaptain = false,
  allocation,
  spark = 'wave',
  onPress,
}: LivePickProps): React.ReactElement {
  const s = F2_SECTORS[sector];
  const mult = isCaptain ? 2 : 1;
  // Effective return = raw stock return × leverage multiplier.
  const effectiveReturn = totalChange * mult;
  const positive = effectiveReturn >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: FANTASY.surfaceCard,
        borderRadius: 14,
        borderWidth: isCaptain ? 2 : 1,
        borderColor: isCaptain ? '#facc15' : FANTASY.border,
        padding: 10,
        paddingHorizontal: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        opacity: pressed ? 0.92 : 1,
        shadowColor: isCaptain ? '#facc15' : '#0f172a',
        shadowOpacity: isCaptain ? 0.2 : 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: isCaptain ? 12 : 2,
        elevation: isCaptain ? 4 : 1,
        overflow: 'hidden',
      })}
    >
      {/* sector accent stripe on right edge */}
      <View style={{
        position: 'absolute',
        top: 8,
        bottom: 8,
        right: 0,
        width: 4,
        backgroundColor: s.color,
        borderRadius: 999,
      }} />

      {/* Ticker tile with captain badge */}
      <View>
        <F2TickerTile ticker={ticker} sector={sector} size={42} radius={11} />
        {isCaptain && (
          <View style={{ position: 'absolute', top: -5, left: -5 }}>
            <F2CaptainBadge size={20} />
          </View>
        )}
      </View>

      {/* Name + today change + allocation */}
      <View style={{ flex: 1, minWidth: 0, marginRight: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.ink, ...RTL }} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: s.color }}>{s.short}</Text>
          <Text style={{ color: FANTASY.borderHigh, fontSize: 8 }}>·</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: FANTASY.inkMuted }}>
            היום:{' '}
            <Text style={[
              {
                color: todayChange >= 0 ? FANTASY.positiveDark : FANTASY.negativeDark,
                fontWeight: '900',
              },
              NUM_STYLE,
            ]}>
              {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(1)}%
            </Text>
          </Text>
        </View>
        {allocation != null && allocation > 0 && (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: FANTASY.inkFaint }}>השקעה:</Text>
            <Text style={[{ fontSize: 10, fontWeight: '900', color: FANTASY.inkLabel }, NUM_STYLE]}>
              {allocation.toLocaleString('en-US')} 🪙
            </Text>
          </View>
        )}
      </View>

      {/* Sparkline */}
      <F2Spark path={spark} width={56} height={22} strokeWidth={1.6} />

      {/* Effective return block — leveraged % shown prominently */}
      <View style={{
        alignItems: 'center',
        minWidth: 58,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: isCaptain
          ? undefined
          : positive ? FANTASY.positiveSoft : FANTASY.negativeSoft,
        borderWidth: isCaptain ? 0 : 1,
        borderColor: positive ? FANTASY.positiveStroke : FANTASY.negativeStroke,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {isCaptain && (
          <LinearGradient
            colors={['#facc15', '#f59e0b'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 } as any}
          />
        )}
        <Text style={[
          {
            fontSize: 14,
            fontWeight: '900',
            color: isCaptain
              ? '#451a03'
              : positive ? FANTASY.positiveDark : FANTASY.negativeDark,
            lineHeight: 16,
          },
          NUM_STYLE,
        ]}>
          {effectiveReturn >= 0 ? '+' : ''}{effectiveReturn.toFixed(1)}%
        </Text>
        <Text style={{
          fontSize: 7,
          fontWeight: '800',
          letterSpacing: 0.4,
          color: isCaptain
            ? '#451a03'
            : positive ? FANTASY.positiveDark : FANTASY.negativeDark,
          opacity: 0.75,
          marginTop: 1,
        }}>
          {mult !== 1 ? `${totalChange.toFixed(1)}%×${mult}` : 'תשואה'}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── QuickAction tile ───────────────────────────────────────────────────────
interface QuickActionProps {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  badge?: string | number;
  onPress?: () => void;
}
export function F2QuickAction({ label, sub, icon, badge, onPress }: QuickActionProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: FANTASY.surfaceCard,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: FANTASY.border,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 4,
        opacity: pressed ? 0.88 : 1,
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 1,
      })}
    >
      {badge != null && (
        <View style={{
          position: 'absolute',
          top: -4,
          left: -4,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: FANTASY.negative,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#fff',
          zIndex: 1,
        }}>
          <Text style={[{ fontSize: 10, fontWeight: '900', color: '#fff' }, NUM_STYLE]}>
            {badge}
          </Text>
        </View>
      )}
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: FANTASY.primaryTint,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '900', color: FANTASY.ink, ...RTL }}>
        {label}
      </Text>
      {sub && (
        <Text style={{ fontSize: 9, color: FANTASY.inkMuted, fontWeight: '700', ...RTL }} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </Pressable>
  );
}

// ─── H2H card ──────────────────────────────────────────────────────────────
interface H2HSide { name: string; returnPercent: number; picks: number }
interface H2HCardProps { me: H2HSide; opp: H2HSide }
export function F2H2HCard({ me, opp }: H2HCardProps): React.ReactElement {
  // Map signed returns onto a 0–100 gap meter — winner takes more of the bar.
  const denom = Math.max(0.01, Math.abs(me.returnPercent) + Math.abs(opp.returnPercent));
  // Tilt by signed delta: positive delta = me on the right side of the bar.
  const delta = me.returnPercent - opp.returnPercent;
  const mePct = Math.max(8, Math.min(92, 50 + (delta / denom) * 50));
  const winning = me.returnPercent > opp.returnPercent;
  const tied = Math.abs(me.returnPercent - opp.returnPercent) < 0.01;
  const fmt = (r: number): string => `${r >= 0 ? '+' : ''}${r.toFixed(2)}%`;
  return (
    <LinearGradient
      colors={['#ffffff', FANTASY.surfaceLow] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: FANTASY.borderStrong,
        padding: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <Text style={{
          fontSize: 10,
          fontWeight: '900',
          color: FANTASY.primary,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}>
          קרב השבוע · H2H
        </Text>
        <F2Tag color={tied ? FANTASY.inkMuted : winning ? FANTASY.positive : FANTASY.negative} tone="soft">
          {tied ? 'תיקו' : winning ? 'מנצח' : 'מפסיד'}
        </F2Tag>
      </View>

      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
        {/* Me */}
        <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
          <F2Avatar name={me.name} size={44} />
          <Text style={{ fontSize: 11, fontWeight: '900', color: FANTASY.ink }}>{me.name}</Text>
          <Text style={[
            {
              fontSize: 18,
              fontWeight: '900',
              color: me.returnPercent >= 0
                ? (winning ? FANTASY.positiveDark : FANTASY.ink)
                : FANTASY.negativeDark,
              lineHeight: 20,
            },
            NUM_STYLE,
          ]}>
            {fmt(me.returnPercent)}
          </Text>
          <Text style={{ fontSize: 8, color: FANTASY.inkFaint, fontWeight: '800' }}>
            תיק · {me.picks} מניות
          </Text>
        </View>

        {/* Center: gap meter */}
        <View style={{ flex: 1.5, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 9, color: FANTASY.inkFaint, fontWeight: '800', letterSpacing: 0.6 }}>
            פער
          </Text>
          <Text style={[
            {
              fontSize: 16,
              fontWeight: '900',
              color: winning ? FANTASY.positiveDark : tied ? FANTASY.inkMuted : FANTASY.negativeDark,
            },
            NUM_STYLE,
          ]}>
            {tied
              ? '—'
              : `${winning ? '+' : '−'}${Math.abs(me.returnPercent - opp.returnPercent).toFixed(2)}%`}
          </Text>
          <View style={{
            width: '100%',
            height: 6,
            borderRadius: 999,
            backgroundColor: FANTASY.surfaceMuted,
            overflow: 'hidden',
          }}>
            <View style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: `${mePct}%`,
              backgroundColor: winning ? FANTASY.positive : FANTASY.negative,
            }} />
          </View>
        </View>

        {/* Opp */}
        <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
          <F2Avatar name={opp.name} size={44} />
          <Text style={{ fontSize: 11, fontWeight: '900', color: FANTASY.ink }}>{opp.name}</Text>
          <Text style={[
            {
              fontSize: 18,
              fontWeight: '900',
              color: opp.returnPercent >= 0
                ? (winning ? FANTASY.ink : FANTASY.positiveDark)
                : FANTASY.negativeDark,
              lineHeight: 20,
            },
            NUM_STYLE,
          ]}>
            {fmt(opp.returnPercent)}
          </Text>
          <Text style={{ fontSize: 8, color: FANTASY.inkFaint, fontWeight: '800' }}>
            תיק · {opp.picks} מניות
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Leaderboard row ────────────────────────────────────────────────────────
type LeaderChange = '+1' | '-1' | 'new' | 'same';
// `ZonePosition` kept as a type-only export for backward compat with callers
// that may still pass `position` — it has no visual effect anymore.
type ZonePosition = 'promoted' | 'demoted' | 'stable';

interface LeaderRowProps {
  rank: number;
  name: string;
  /** Player's cumulative portfolio return (%). Drives ranking and display. */
  returnPercent: number;
  change?: LeaderChange;
  isLocal?: boolean;
  /** Deprecated — promotion/relegation visuals removed. Accepted but ignored. */
  position?: ZonePosition;
  onPress?: () => void;
}
export function F2LeaderRow({
  rank,
  name,
  returnPercent,
  change = 'same',
  isLocal = false,
  onPress,
}: LeaderRowProps): React.ReactElement {
  const positive = returnPercent >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: isLocal ? '#fffbeb' : FANTASY.surfaceCard,
        borderRadius: 12,
        borderWidth: isLocal ? 2 : 1,
        borderColor: isLocal ? '#facc15' : FANTASY.border,
        opacity: pressed ? 0.95 : 1,
        shadowColor: isLocal ? '#facc15' : '#0f172a',
        shadowOpacity: isLocal ? 0.2 : 0.03,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: isLocal ? 12 : 1,
        elevation: isLocal ? 3 : 1,
        overflow: 'hidden',
      })}
    >
      <View style={{ width: 32, alignItems: 'center' }}>
        {rank <= 3 ? (
          <F2RankCrest rank={rank as 1 | 2 | 3} size={26} />
        ) : (
          <Text style={[{ fontSize: 13, fontWeight: '800', color: FANTASY.inkFaint }, NUM_STYLE]}>
            #{rank}
          </Text>
        )}
      </View>

      {/* Change indicator */}
      <View style={{ width: 14, alignItems: 'center' }}>
        {change === '+1' && <F2Chevron size={10} dir="up" color={FANTASY.positive} />}
        {change === '-1' && <F2Chevron size={10} dir="down" color={FANTASY.negative} />}
        {change === 'new' && <F2Tag color={FANTASY.cyan}>NEW</F2Tag>}
        {change === 'same' && <Text style={{ color: FANTASY.borderHigh, fontSize: 12 }}>·</Text>}
      </View>

      <F2Avatar name={name} size={32} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: FANTASY.ink, ...RTL }} numberOfLines={1}>
            {name}
          </Text>
          {isLocal && (
            <View style={{
              backgroundColor: '#fff',
              paddingVertical: 1,
              paddingHorizontal: 5,
              borderRadius: 3,
            }}>
              <Text style={{
                color: FANTASY.warningDark,
                fontSize: 8,
                fontWeight: '900',
                letterSpacing: 0.5,
              }}>
                את/ה
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        backgroundColor: positive ? FANTASY.positiveSoft : FANTASY.negativeSoft,
        borderWidth: 1,
        borderColor: positive ? FANTASY.positiveStroke : FANTASY.negativeStroke,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
      }}>
        <Text style={[
          {
            fontSize: 13,
            fontWeight: '900',
            color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
          },
          NUM_STYLE,
        ]}>
          {positive ? '+' : ''}{returnPercent.toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Header (app screen header) ─────────────────────────────────────────────
interface HeaderProps {
  title: string;
  eyebrow?: string;
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}
export function F2Header({ title, eyebrow, back, right, onBack }: HeaderProps): React.ReactElement {
  return (
    <View style={{
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row-reverse',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    }}>
      <View style={{ flex: 1 }}>
        {eyebrow && (
          <Text style={{
            fontSize: 10,
            fontWeight: '800',
            color: FANTASY.primary,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 3,
            ...RTL,
          }}>
            {eyebrow}
          </Text>
        )}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
          {back && (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="חזור"
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: pressed ? FANTASY.surfaceMuted : FANTASY.surfaceCard,
                borderWidth: 1,
                borderColor: FANTASY.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0f172a',
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 3,
                elevation: 2,
              })}
            >
              <F2Chevron size={18} dir="right" color={FANTASY.ink} />
            </Pressable>
          )}
          <Text style={{
            fontSize: 22,
            fontWeight: '900',
            color: FANTASY.ink,
            letterSpacing: -0.3,
            ...RTL,
          }}>
            {title}
          </Text>
        </View>
      </View>
      {right}
    </View>
  );
}

// ─── MarketCard — compact stock card for draft grid ────────────────────────
interface MarketCardProps {
  ticker: string;
  name: string;
  sector: FantasySectorId;
  /** This-week return % (e.g. +1.40) — shown as a chip near the name. */
  change: number;
  aiScore: number;
  spark?: SparkPath;
  selected?: boolean;
  hot?: boolean;
  /** Real-world currency symbol — '$' for US stocks, '₪' for Israeli. */
  currency?: '$' | '₪';
  /** Last market price in the real currency (reference only — not game coins). */
  price?: number;
  onPress?: () => void;
}
export function F2MarketCard({
  ticker,
  name,
  sector,
  change,
  aiScore,
  spark = 'wave',
  selected = false,
  hot = false,
  currency = '$',
  price,
  onPress,
}: MarketCardProps): React.ReactElement {
  const s = F2_SECTORS[sector];
  const priceText = price != null
    ? currency === '₪'
      ? `${price.toLocaleString('en-US', { maximumFractionDigits: 2 })} ₪`
      : `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : null;
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        padding: 10,
        shadowColor: selected ? s.color : '#0f172a',
        shadowOpacity: selected ? 0.3 : 0.04,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: selected ? 14 : 2,
        elevation: selected ? 5 : 1,
        overflow: 'hidden',
        backgroundColor: FANTASY.surfaceCard,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? s.color : FANTASY.border,
      }}
    >
      {/* Header row: ticker tile + name + last price */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <F2TickerTile ticker={ticker} sector={sector} size={36} radius={9} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
            <Text
              style={{ fontSize: 12, fontWeight: '900', color: FANTASY.ink, ...RTL, lineHeight: 14, flexShrink: 1 }}
              numberOfLines={1}
            >
              {name}
            </Text>
            {hot && <F2Flame size={11} color="#f97316" />}
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <F2Return pct={change} />
            {priceText && (
              <Text style={{
                fontSize: 10,
                fontWeight: '800',
                color: FANTASY.inkMuted,
                fontVariant: ['tabular-nums'],
              }}>
                {priceText}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Sparkline + AI score ring */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <F2Spark path={spark} width={70} height={26} strokeWidth={1.8} withFill={true} />
        <F2AIScoreRing score={aiScore} size={36} />
      </View>

      {/* Add / Selected button — primary CTA */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={selected ? `הסר את ${name}` : `הוסף את ${name}`}
        accessibilityState={{ selected }}
        style={({ pressed }) => ({
          borderRadius: 10,
          overflow: 'hidden',
          opacity: pressed ? 0.88 : 1,
          shadowColor: selected ? s.color : FANTASY.primary,
          shadowOpacity: 0.4,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 8,
          elevation: 4,
        })}
      >
        {selected ? (
          <View style={{
            paddingVertical: 9,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: s.color,
            borderBottomWidth: 3,
            borderBottomColor: s.color,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: s.color }}>✓</Text>
            <Text style={{ fontSize: 12, fontWeight: '900', color: s.color, letterSpacing: 0.2 }}>
              נבחר
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: FANTASY.inkFaint }}>
              · לחץ אחר להחלפה
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={[s.g1, s.g2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 10,
              borderRadius: 10,
              borderBottomWidth: 3,
              borderBottomColor: s.color,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', lineHeight: 16 }}>+</Text>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>
              הוסף לתיק
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

// ─── Podium (top 3) ─────────────────────────────────────────────────────────
interface PodiumEntry {
  rank: 1 | 2 | 3;
  name: string;
  returnPercent: number;
  isLocal?: boolean;
}
interface PodiumProps {
  winners: PodiumEntry[];
}

const PODIUM_CFG: Record<1 | 2 | 3, {
  height: number;
  gradient: readonly [string, string, string];
  border: string;
  numberColor: string;
  avatarBg: string;
}> = {
  1: { height: 110, gradient: ['#fef3c7', '#fbbf24', '#d97706'] as const, border: '#92570a', numberColor: '#3b1f00', avatarBg: '#fef3c7' },
  2: { height: 78,  gradient: ['#f1f5f9', '#cbd5e1', '#94a3b8'] as const, border: '#64748b', numberColor: '#1e293b', avatarBg: '#f1f5f9' },
  3: { height: 62,  gradient: ['#bae6fd', '#7dd3fc', '#0284c7'] as const, border: '#075985', numberColor: '#0a1e3a', avatarBg: '#e0f2fe' },
};

export function F2Podium({ winners }: PodiumProps): React.ReactElement {
  // Order visually: 2nd · 1st · 3rd
  const ordered: (PodiumEntry | null)[] = [null, null, null];
  winners.forEach((w) => {
    if (w.rank === 1) ordered[1] = w;
    else if (w.rank === 2) ordered[0] = w;
    else if (w.rank === 3) ordered[2] = w;
  });

  return (
    <LinearGradient
      colors={['#fffbeb', '#ffffff'] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: FANTASY.goldStroke,
        paddingTop: 24,
        paddingHorizontal: 16,
        paddingBottom: 0,
        overflow: 'hidden',
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        gap: 10,
      }}>
        {ordered.map((w, i) => {
          if (!w) return <View key={`empty-${i}`} style={{ flex: 1 }} />;
          const cfg = PODIUM_CFG[w.rank];
          return (
            <View key={w.rank} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
                {w.rank === 1 && <F2Crown size={28} />}
              </View>

              {/* Avatar ring */}
              <LinearGradient
                colors={cfg.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 3,
                  borderWidth: 3,
                  borderColor: cfg.border,
                  shadowColor: cfg.border,
                  shadowOpacity: w.rank === 1 ? 0.4 : 0.2,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: w.rank === 1 ? 16 : 8,
                  elevation: w.rank === 1 ? 8 : 4,
                }}
              >
                <F2Avatar name={w.name} size={56} />
              </LinearGradient>

              <Text style={{
                fontSize: 13,
                fontWeight: '900',
                color: FANTASY.ink,
                ...RTL,
              }} numberOfLines={1}>
                {w.name}
              </Text>

              {/* Return % pill */}
              {(() => {
                const positive = w.returnPercent >= 0;
                return (
                  <View style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    gap: 3,
                    backgroundColor: positive ? FANTASY.positiveSoft : FANTASY.negativeSoft,
                    borderWidth: 1,
                    borderColor: positive ? FANTASY.positiveStroke : FANTASY.negativeStroke,
                    paddingVertical: 3,
                    paddingHorizontal: 9,
                    borderRadius: 999,
                  }}>
                    <Text style={[
                      {
                        fontSize: 13,
                        fontWeight: '900',
                        color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
                      },
                      NUM_STYLE,
                    ]}>
                      {positive ? '+' : ''}{w.returnPercent.toFixed(2)}%
                    </Text>
                  </View>
                );
              })()}

              {/* Podium block */}
              <LinearGradient
                colors={cfg.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  width: '100%',
                  height: cfg.height,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopWidth: 3,
                  borderColor: cfg.border,
                  marginTop: 4,
                }}
              >
                <F2RankCrest rank={w.rank} size={36} />
                {w.isLocal && (
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    borderRadius: 999,
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                    marginTop: 4,
                  }}>
                    <Text style={{
                      fontSize: 9,
                      fontWeight: '900',
                      color: cfg.numberColor,
                    }}>
                      את/ה
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

// ─── Prizes grid (3 prizes — XP / Gems / Coins) ─────────────────────────────
interface PrizesGridProps {
  xp: number;
  gems: number;
  coins: number;
}
export function F2PrizesGrid({ xp, gems, coins }: PrizesGridProps): React.ReactElement {
  const prizes = [
    { label: 'XP', amount: `+${xp.toLocaleString('en-US')}`, bg: FANTASY.purpleSoft, color: FANTASY.purple, emoji: '⚡' },
    { label: 'יהלומים', amount: `+${gems}`, bg: FANTASY.primarySoft, color: FANTASY.primary, emoji: '💎' },
    { label: 'מטבעות', amount: `+${coins.toLocaleString('en-US')}`, bg: FANTASY.goldSoft, color: FANTASY.warningDark, emoji: '💰' },
  ];
  return (
    <View style={{
      backgroundColor: FANTASY.surfaceCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: FANTASY.borderStrong,
      padding: 14,
      shadowColor: '#0f172a',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    }}>
      <Text style={{
        fontSize: 13,
        fontWeight: '900',
        color: FANTASY.ink,
        ...RTL,
        marginBottom: 10,
      }}>
        הפרסים שלך
      </Text>
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        {prizes.map((p) => (
          <View
            key={p.label}
            style={{
              flex: 1,
              backgroundColor: p.bg,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 8,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
            <Text style={[
              { fontSize: 16, fontWeight: '900', color: p.color, lineHeight: 16 },
              NUM_STYLE,
            ]}>
              {p.amount}
            </Text>
            <Text style={{
              fontSize: 10,
              fontWeight: '800',
              color: p.color,
              letterSpacing: 0.3,
            }}>
              {p.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Pick allocation + ×2 leverage row ──────────────────────────────────────
// Combines: coin-allocation stepper (+/-) and ×2 leverage toggle in one card.
interface PickAllocationRowProps {
  ticker: string;
  name: string;
  sector: FantasySectorId;
  allocation: number;
  poolMax: number;
  step?: number;
  isLeverage: boolean;
  poolRemaining: number;
  readOnly?: boolean;
  onAllocationChange: (amount: number) => void;
  onToggleLeverage: () => void;
}
export function F2PickAllocationRow({
  ticker,
  name,
  sector,
  allocation,
  poolMax,
  step,
  isLeverage,
  poolRemaining,
  readOnly = false,
  onAllocationChange,
  onToggleLeverage,
}: PickAllocationRowProps): React.ReactElement {
  const s = F2_SECTORS[sector];
  // Default step = 5% of pool, rounded to nearest 10.
  const stp = step ?? Math.max(10, Math.round((poolMax * 0.05) / 10) * 10);
  const pct = poolMax > 0 ? Math.round((allocation / poolMax) * 100) : 0;
  const canDec = !readOnly && allocation > 0;
  const canInc = !readOnly && poolRemaining > 0;

  return (
    <View
      style={{
        backgroundColor: isLeverage ? '#fffbeb' : FANTASY.surfaceCard,
        borderRadius: 12,
        borderWidth: isLeverage ? 2 : 1,
        borderColor: isLeverage ? '#facc15' : FANTASY.border,
        paddingVertical: 10,
        paddingHorizontal: 10,
        shadowColor: isLeverage ? '#facc15' : '#0f172a',
        shadowOpacity: isLeverage ? 0.25 : 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: isLeverage ? 12 : 2,
        elevation: isLeverage ? 4 : 1,
        gap: 8,
      }}
    >
      {/* Top row: ticker + name + leverage toggle */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
        <F2TickerTile ticker={ticker} sector={sector} size={36} radius={9} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: FANTASY.ink, ...RTL }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '800', color: s.color, marginTop: 2 }}>{s.short}</Text>
        </View>
        <Pressable
          onPress={readOnly ? undefined : onToggleLeverage}
          disabled={readOnly}
          accessibilityRole="button"
          accessibilityLabel={`מנף את ${name} פי 2`}
          style={({ pressed }) => ({
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: isLeverage ? '#facc15' : '#fff',
            borderWidth: isLeverage ? 0 : 1.5,
            borderColor: isLeverage ? 'transparent' : FANTASY.borderStrong,
            borderBottomWidth: 3,
            borderBottomColor: isLeverage ? '#92400e' : FANTASY.silver,
            opacity: readOnly ? (isLeverage ? 0.95 : 0.5) : pressed ? 0.85 : 1,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 3,
          })}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: isLeverage ? '#78350f' : FANTASY.inkFaint }}>
            מנף
          </Text>
          <Text style={[{ fontSize: 11, fontWeight: '900', color: isLeverage ? '#78350f' : FANTASY.inkFaint }, NUM_STYLE]}>
            ×2
          </Text>
        </Pressable>
      </View>

      {/* Allocation stepper row */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => onAllocationChange(allocation - stp)}
          disabled={!canDec}
          accessibilityRole="button"
          accessibilityLabel="הפחת הקצאה"
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: canDec ? '#fff' : FANTASY.surfaceLow,
            borderWidth: 1.5,
            borderColor: FANTASY.borderStrong,
            borderBottomWidth: 3,
            borderBottomColor: FANTASY.silver,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canDec ? 0.4 : pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: '900', color: FANTASY.ink, lineHeight: 18 }}>−</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }}>
            <Text style={[{ fontSize: 17, fontWeight: '900', color: FANTASY.ink }, NUM_STYLE]}>
              {allocation.toLocaleString('en-US')}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: FANTASY.inkMuted }}>🪙</Text>
            <Text style={[{ fontSize: 10, fontWeight: '700', color: FANTASY.inkFaint }, NUM_STYLE]}>
              · {pct}%
            </Text>
          </View>
          {/* Allocation share bar */}
          <View style={{
            width: '100%',
            height: 4,
            backgroundColor: FANTASY.surfaceMuted,
            borderRadius: 999,
            overflow: 'hidden',
            flexDirection: 'row-reverse',
            marginTop: 4,
          }}>
            <View
              style={{
                width: `${pct}%`,
                height: '100%',
                backgroundColor: isLeverage ? '#f59e0b' : s.color,
                borderRadius: 999,
              }}
            />
          </View>
        </View>

        <Pressable
          onPress={() => onAllocationChange(allocation + stp)}
          disabled={!canInc}
          accessibilityRole="button"
          accessibilityLabel="הגדל הקצאה"
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: canInc ? FANTASY.primary : FANTASY.surfaceLow,
            borderWidth: canInc ? 0 : 1.5,
            borderColor: FANTASY.borderStrong,
            borderBottomWidth: 3,
            borderBottomColor: canInc ? FANTASY.primaryDark : FANTASY.silver,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canInc ? 0.4 : pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: '900', color: canInc ? '#fff' : FANTASY.ink, lineHeight: 18 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── League Arena Card ──────────────────────────────────────────────────────
// League showcase: tier shield, rank, neutral position bar.
// No promotion/relegation zones — tier is a fixed stake choice.

interface LeagueArenaCardProps {
  tier: TierKey;
  tierLabel: string;
  rank: number;
  totalPlayers: number;
  weekDay?: number;
  weekTotalDays?: number;
}

export function F2LeagueArenaCard({
  tier,
  tierLabel,
  rank,
  totalPlayers,
  weekDay,
  weekTotalDays = 5,
}: LeagueArenaCardProps): React.ReactElement {
  // Where the player sits in the league (right = top in RTL; left = bottom).
  const ladderPct = Math.min(100, Math.max(0, ((totalPlayers - rank + 1) / totalPlayers) * 100));
  const isLeading = rank <= 3;

  return (
    <LinearGradient
      colors={['#eff6ff', '#ffffff'] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#bfdbfe',
        padding: 14,
        shadowColor: FANTASY.primary,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 18,
        elevation: 5,
        overflow: 'hidden',
      }}
    >
      {/* Glow blob in corner */}
      <View style={{
        position: 'absolute',
        top: -24,
        right: -24,
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: FANTASY.primary,
        opacity: 0.08,
      }} />

      {/* Top row: shield + tier name + rank chip */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
        <F2TierShield tier={tier} size={62} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{
            fontSize: 9,
            fontWeight: '900',
            color: FANTASY.inkFaint,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            ...RTL,
          }}>
            הליגה שלך
          </Text>
          <Text style={{
            fontSize: 18,
            fontWeight: '900',
            color: FANTASY.ink,
            ...RTL,
            marginTop: 1,
          }} numberOfLines={1}>
            {tierLabel}
          </Text>
          <Text style={{
            fontSize: 11,
            color: FANTASY.inkMuted,
            fontWeight: '700',
            ...RTL,
            marginTop: 2,
          }}>
            {totalPlayers} שחקנים מתחרים
          </Text>
        </View>

        {/* Rank chip — neutral primary color, no zone tinting */}
        <View style={{
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 14,
          borderWidth: 2,
          borderColor: FANTASY.primary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          shadowColor: FANTASY.primary,
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 8,
            color: FANTASY.inkFaint,
            fontWeight: '900',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}>
            דירוג
          </Text>
          <Text style={[
            {
              fontSize: 24,
              fontWeight: '900',
              color: FANTASY.primary,
              lineHeight: 26,
              marginTop: 2,
            },
            NUM_STYLE,
          ]}>
            #{rank}
          </Text>
        </View>
      </View>

      {/* Positive motivational line — no threat language */}
      <Text style={{
        marginTop: 10,
        fontSize: 12,
        fontWeight: '800',
        color: FANTASY.primary,
        textAlign: 'center',
        writingDirection: 'rtl',
      }}>
        {isLeading
          ? '🔥 אתה מוביל — תחזיק חזק עד הסוף'
          : 'המשך לעלות לראש הטבלה — כל אחוז נחשב'}
      </Text>

      {/* Neutral position bar — single track with player marker (no red/green zones) */}
      <View style={{ marginTop: 10 }}>
        <View style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: FANTASY.surfaceMuted,
          borderWidth: 1,
          borderColor: FANTASY.borderStrong,
        }} />
        {/* Player position marker */}
        <View style={{
          position: 'absolute',
          top: -3,
          right: `${ladderPct}%`,
          marginRight: -7,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: '#fff',
          borderWidth: 2.5,
          borderColor: FANTASY.primary,
          shadowColor: FANTASY.primary,
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 3,
        }} />
      </View>

      {/* Optional gameweek progress dots */}
      {weekDay != null && (
        <View style={{ marginTop: 10, flexDirection: 'row-reverse', gap: 3, alignItems: 'center' }}>
          <Text style={{
            fontSize: 9,
            fontWeight: '800',
            color: FANTASY.inkFaint,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginLeft: 4,
          }}>
            יום {weekDay}/{weekTotalDays}
          </Text>
          {Array.from({ length: weekTotalDays }).map((_, i) => {
            const done = i < weekDay;
            const current = i === weekDay - 1;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: current
                    ? FANTASY.gold
                    : done
                      ? FANTASY.goldStroke
                      : FANTASY.surfaceMuted,
                }}
              />
            );
          })}
        </View>
      )}
    </LinearGradient>
  );
}

// ─── Ambient backdrop ───────────────────────────────────────────────────────
type AmbientTone = 'sky' | 'gold' | 'purple';
const AMBIENT: Record<AmbientTone, { c1: string; c2: string }> = {
  sky:    { c1: '#f0f9ff', c2: FANTASY.bg },
  gold:   { c1: '#fffbeb', c2: FANTASY.bg },
  purple: { c1: '#faf5ff', c2: FANTASY.bg },
};

interface AmbientProps { tone?: AmbientTone }
export function F2Ambient({ tone = 'sky' }: AmbientProps): React.ReactElement {
  const t = AMBIENT[tone];
  return (
    <LinearGradient
      colors={[t.c1, t.c2] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    />
  );
}
