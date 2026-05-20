/**
 * ChampionCard — Hearthstone-style hero showcase card.
 *
 * Source: `assets/DESIGN/Design System_files/premium-cards.jsx` (ChampionCard).
 *
 * Title behavior — gender-neutral by design:
 *   • The original design shipped a hardcoded gendered title ("מלכת התקציבים").
 *   • We dropped that. The optional `title` prop is OFF by default. When set,
 *     callers MUST use unisex titles that read identically for all genders
 *     (e.g. "אגדה", "מאסטר", "פלטינום", "VIP").
 *
 * Usage:
 *   <ChampionCard name="מאיה כהן" level={7} rank={12} xp={8420} streak={47} />
 *   <ChampionCard name="..." title="אגדה" ... />   // unisex titles only
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { Crown, Zap } from 'lucide-react-native';

interface Props {
  name: string;
  /** OPTIONAL — only pass unisex titles ("אגדה", "מאסטר", "פלטינום", "VIP",
   *  metal tiers like "ברונזה" / "זהב" / "פלטינה"). Avoid gendered titles. */
  title?: string;
  level?: number;
  rank?: number;
  xp?: number;
  streak?: number;
  /** First letter for the avatar circle. Used only when `avatar` is not provided. */
  initial?: string;
  /** OPTIONAL — full avatar visual (e.g. an SVG mascot). When supplied, takes
   *  precedence over `initial`. The card centers it inside the 80px halo'd circle. */
  avatar?: React.ReactNode;
  avatarBgColors?: readonly [string, string];
}

export const ChampionCard = React.memo(function ChampionCard({
  name,
  title,
  level = 1,
  rank,
  xp = 0,
  streak = 0,
  initial,
  avatar,
  avatarBgColors = ['#7c3aed', '#ec4899'],
}: Props) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rot]);
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const initialChar = initial ?? (name.charAt(0) || '?');

  return (
    <LinearGradient
      colors={['#d4a017', '#f5c842', '#fbbf24']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.outer}
    >
      <LinearGradient
        colors={['#1a1035', '#0d2847']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.inner}
      >
        {/* rank crown — top-right (RTL anchored to user's right) */}
        {rank !== undefined && (
          <LinearGradient
            colors={['#fbbf24', '#d4a017']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.rankPill}
          >
            <Crown size={12} color="#1a1035" />
            <Text style={styles.rankText} allowFontScaling={false}>#{rank}</Text>
          </LinearGradient>
        )}

        {/* level pill — top-left */}
        <View style={styles.levelPill}>
          <Text style={styles.levelText} allowFontScaling={false}>שלב {level}</Text>
        </View>

        {/* Avatar with rotating halo. SVG-based so the gradient stays clipped
            to a circle (LinearGradient + rotation otherwise renders as a
            visible rotating square). */}
        <View style={styles.avatarBox}>
          <Animated.View style={[styles.halo, haloStyle]}>
            <Svg width={100} height={100} viewBox="0 0 100 100">
              <Defs>
                <SvgLinearGradient id="haloGold" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#d4a017" stopOpacity={1} />
                  <Stop offset="0.25" stopColor="#fbbf24" stopOpacity={0.2} />
                  <Stop offset="0.5" stopColor="#f5c842" stopOpacity={1} />
                  <Stop offset="0.75" stopColor="#fbbf24" stopOpacity={0.2} />
                  <Stop offset="1" stopColor="#d4a017" stopOpacity={1} />
                </SvgLinearGradient>
              </Defs>
              <Circle cx={50} cy={50} r={47} fill="none" stroke="url(#haloGold)" strokeWidth={6} />
            </Svg>
          </Animated.View>
          {avatar ? (
            <View style={[styles.avatar, styles.avatarTransparent]}>
              {avatar}
            </View>
          ) : (
            <LinearGradient
              colors={avatarBgColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarInitial} allowFontScaling={false}>{initialChar}</Text>
            </LinearGradient>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1} allowFontScaling={false}>{name}</Text>

        {/* Title row — only rendered when an explicit unisex title is supplied.
            No bracket characters around it: in RTL the Latin guillemets « »
            mangle Hebrew glyph layout on some Android system fonts. Plain
            text inside a gold-bg pill reads cleanly on every locale. */}
        {title && (
          <View style={styles.titlePill}>
            <Text style={styles.title} numberOfLines={1} allowFontScaling={false}>{title}</Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Stat value={String(rank ?? '—')} label="דירוג" icon={<Crown size={12} color="#fbbf24" />} />
          <View style={styles.statDivider} />
          <Stat value={String(streak)} label="רצף" emoji="🔥" />
          <View style={styles.statDivider} />
          <Stat value={xp.toLocaleString('he-IL')} label="XP" icon={<Zap size={14} color="#fbbf24" />} />
        </View>
      </LinearGradient>
    </LinearGradient>
  );
});

function Stat({ value, label, icon, emoji }: { value: string; label: string; icon?: React.ReactNode; emoji?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        {icon ?? (emoji && <Text style={{ fontSize: 12 }}>{emoji}</Text>)}
      </View>
      <Text style={styles.statValue} allowFontScaling={false}>{value}</Text>
      <Text style={styles.statLabel} allowFontScaling={false}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 22,
    padding: 3,
    shadowColor: '#d4a017',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  inner: {
    borderRadius: 19,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  rankPill: {
    position: 'absolute',
    top: 10,
    insetInlineEnd: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#fef3c7',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1a1035',
    fontVariant: ['tabular-nums'] as const,
  },
  levelPill: {
    position: 'absolute',
    top: 10,
    insetInlineStart: 10,
    backgroundColor: 'rgba(212,160,23,0.18)',
    borderWidth: 1,
    borderColor: '#d4a017',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  avatarBox: {
    width: 92,
    height: 92,
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fef3c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  avatarTransparent: {
    backgroundColor: 'rgba(13, 40, 71, 0.85)',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fef3c7',
    marginBottom: 2,
    writingDirection: 'rtl' as const,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  titlePill: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.55)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 0.8,
    writingDirection: 'rtl' as const,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
    marginTop: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fef3c7',
    fontVariant: ['tabular-nums'] as const,
    lineHeight: 14,
  },
  statLabel: {
    fontSize: 8,
    color: '#94a8c2',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
