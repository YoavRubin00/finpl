import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { UserPlus } from 'lucide-react-native';

import { STITCH, DUO } from '../../../constants/theme';
import { useEconomy } from '../../economy/useEconomy';
import { AvatarImage } from '../../avatars/AvatarImage';
import { useAuthStore } from '../../auth/useAuthStore';
import { useFriendsStore } from '../../friends/useFriendsStore';
import { FRIEND_PROFILES } from '../../friends/friendsData';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { tapHaptic } from '../../../utils/haptics';
import { FinnCue, type FinnCueVariant } from './FinnCue';

const MEDAL = ['🥇', '🥈', '🥉'];
const TOP3_BG = ['#fef9c3', '#f8fafc', '#fff7ed'];
const TOP3_BORDER = ['#fde68a', '#e2e8f0', '#fed7aa'];

interface LeaderEntry {
  id: string;
  name: string;
  avatarId: string | null;
  coins: number;
  isSelf?: boolean;
}

/**
 * Premium CTA button — fantasy-league button language: gradient + border +
 * glow shadow + bold label + shimmer that respects reduced-motion.
 */
function PremiumCta({
  label,
  colors,
  glow,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  colors: readonly [string, string, ...string[]];
  glow: string;
  onPress: () => void;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}): React.ReactElement {
  const reduced = useReducedMotion();
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduced, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-70, 70]) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      style={({ pressed }) => ({
        borderRadius: 14,
        shadowColor: glow,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 14,
          paddingVertical: 13,
          paddingHorizontal: 16,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.55)',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, bottom: 0, width: 70 }, shimmerStyle]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {icon}
        <Text
          maxFontSizeMultiplier={1.15}
          style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function FriendsLeaderboardCard(): React.ReactElement {
  const router = useRouter();
  const { data: economyData } = useEconomy();
  const myCoins = economyData?.coins ?? 0;
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const displayName = useAuthStore((s) => s.displayName);

  // The board is the user's REAL friends — resolved reactively from the
  // friends store (no fabricated leaders).
  const friendIds = useFriendsStore(useShallow((s) => s.friendIds));
  const isEmpty = friendIds.length === 0;

  const friendEntries: LeaderEntry[] = FRIEND_PROFILES.filter((p) =>
    friendIds.includes(p.id),
  ).map((p) => ({ id: p.id, name: p.name, avatarId: p.avatarId, coins: p.coinsWon }));

  const selfEntry: LeaderEntry = {
    id: 'self',
    name: displayName?.trim() ? displayName : 'אני',
    avatarId: myAvatarId,
    coins: myCoins,
    isSelf: true,
  };

  const ranked = [...friendEntries, selfEntry].sort((a, b) => b.coins - a.coins);
  const selfRank = ranked.findIndex((e) => e.isSelf) + 1;
  const top5 = ranked.slice(0, 5);
  const selfInTop5 = top5.some((e) => e.isSelf);

  const finn: { variant: FinnCueVariant; text: string } = isEmpty
    ? { variant: 'tablet', text: 'הלוח מחכה לחברים הראשונים שלכם' }
    : selfRank === 1
      ? { variant: 'dancing', text: 'מקום ראשון מול החברים! תפסתם בשיניים' }
      : { variant: 'happy', text: `מקום ${selfRank} מול החברים — הצמרת בטווח נשיכה` };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: STITCH.surfaceHighest,
        overflow: 'hidden',
        shadowColor: '#3e3c8f',
        shadowOpacity: 0.09,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* ── Gold accent strip (RTL: right edge) ── */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: STITCH.tertiaryGoldBright, opacity: 0.9, zIndex: 1 }} />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 14,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: STITCH.surfaceHighest,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: STITCH.tertiaryGoldLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>🏆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
            אלופי המטבעות
          </Text>
          <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
            אתם מול החברים שלכם
          </Text>
        </View>
      </View>

      {/* ── Rows ── */}
      {top5.map((entry, i) => (
        <View
          key={entry.id}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 16,
            gap: 10,
            backgroundColor: entry.isSelf ? '#e0f2fe' : i < 3 ? TOP3_BG[i] : '#ffffff',
            borderBottomWidth: i < top5.length - 1 ? 1 : 0,
            borderBottomColor: i < 3 ? TOP3_BORDER[i] : STITCH.surfaceHighest,
          }}
        >
          {/* Rank */}
          <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: STITCH.onSurfaceVariant, textAlign: 'center' }}>
              {MEDAL[i] ?? `#${i + 1}`}
            </Text>
          </View>

          {/* Avatar — the real game mascots */}
          <AvatarImage avatarId={entry.avatarId} size={30} />

          {/* Name */}
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: i === 0 || entry.isSelf ? '900' : '700',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
            numberOfLines={1}
          >
            {entry.name}{entry.isSelf ? ' (אני)' : ''}
          </Text>

          {/* Coin profit */}
          <View
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: 14,
                fontWeight: '900',
                color: i === 0 ? STITCH.tertiaryGold : DUO.blue,
                fontVariant: ['tabular-nums'],
              }}
            >
              {entry.coins.toLocaleString('he-IL')}
            </Text>
            <GoldCoinIcon size={14} />
          </View>
        </View>
      ))}

      {/* ── Self rank when outside the board ── */}
      {!isEmpty && !selfInTop5 && (
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 16,
            gap: 10,
            backgroundColor: '#e0f2fe',
            borderTopWidth: 1,
            borderTopColor: '#bae6fd',
          }}
        >
          <View style={{ width: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: DUO.blue }}>#{selfRank}</Text>
          </View>
          <AvatarImage avatarId={myAvatarId} size={30} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
            {selfEntry.name} (אני)
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text
              maxFontSizeMultiplier={1.15}
              style={{ fontSize: 14, fontWeight: '900', color: DUO.blue, fontVariant: ['tabular-nums'] }}
            >
              {myCoins.toLocaleString('he-IL')}
            </Text>
            <GoldCoinIcon size={14} />
          </View>
        </View>
      )}

      {/* ── Finn coach line ── */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: isEmpty ? 8 : 12, borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest }}>
        <FinnCue variant={finn.variant} text={finn.text} tone="gold" />
      </View>

      {/* ── Empty-state CTA — add your first friends ── */}
      {isEmpty && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 14 }}>
          <PremiumCta
            label="הוסיפו חברים"
            colors={['#38bdf8', DUO.blue]}
            glow={DUO.blue}
            icon={<UserPlus size={17} color="#ffffff" strokeWidth={2.6} />}
            accessibilityLabel="הוסיפו חברים ללוח"
            onPress={() => {
              tapHaptic();
              router.push('/friends-list' as never);
            }}
          />
        </View>
      )}
    </View>
  );
}
