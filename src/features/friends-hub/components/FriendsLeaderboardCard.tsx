import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  cancelAnimation,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { UserPlus } from 'lucide-react-native';

import { STITCH, DUO } from '../../../constants/theme';
import { useEconomy } from '../../economy/useEconomy';
import { AvatarImage } from '../../avatars/AvatarImage';
import { useAuthStore } from '../../auth/useAuthStore';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { tapHaptic } from '../../../utils/haptics';
import { FinnCue } from './FinnCue';

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
    return () => cancelAnimation(shimmer);
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

/**
 * "אלופי המטבעות" — the friends coin leaderboard.
 *
 * P0-2: the fabricated board (10 invented FRIEND_PROFILES with made-up
 * `coinsWon`, plus a 20-45s auto-approve timer) has been removed. There is no
 * real server leaderboard endpoint yet and the only real social graph is
 * `referrals`, so this card shows an HONEST self-standing (the user's own real
 * coins) + an honest empty state + the real invite CTA. When a server
 * friends-leaderboard lands, the ranked rows come back — with real people only.
 */
export function FriendsLeaderboardCard(): React.ReactElement {
  const router = useRouter();
  const { data: economyData } = useEconomy();
  const myCoins = economyData?.coins ?? 0;
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const displayName = useAuthStore((s) => s.displayName);
  const selfName = displayName?.trim() ? displayName : 'אני';

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
            הלוח מול החברים שלכם
          </Text>
        </View>
      </View>

      {/* ── Your real standing (self-data only) — C11: grouped into one label,
           C2: the coins number + decorative coin read as "N מטבעות" ── */}
      <View
        accessible
        accessibilityLabel={`${selfName} (אני), המטבעות שלכם: ${myCoins.toLocaleString('he-IL')} מטבעות`}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          gap: 10,
          backgroundColor: '#e0f2fe',
        }}
      >
        <AvatarImage avatarId={myAvatarId} size={32} />
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}
            numberOfLines={1}
          >
            {selfName} (אני)
          </Text>
          <Text style={{ fontSize: 11, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
            המטבעות שלכם
          </Text>
        </View>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }} importantForAccessibility="no-hide-descendants">
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ fontSize: 15, fontWeight: '900', color: DUO.blue, fontVariant: ['tabular-nums'] }}
          >
            {myCoins.toLocaleString('he-IL')}
          </Text>
          <GoldCoinIcon size={14} />
        </View>
      </View>

      {/* ── Honest empty state — no fabricated opponents ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', lineHeight: 18 }}>
          הלוח מול חברים ייפתח כשתוסיפו את החברים הראשונים שלכם. חפשו חבר והוסיפו אותו — ותהיו הראשונים בצמרת.
        </Text>
      </View>

      {/* ── Finn coach line ── */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <FinnCue variant="tablet" text="חפשו חבר והוסיפו אותו כדי לפתוח את לוח האלופים" tone="gold" />
      </View>

      {/* ── Find-friends CTA — search the real user base and add them ── */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14 }}>
        <PremiumCta
          label="מצאו חברים"
          colors={['#38bdf8', DUO.blue]}
          glow={DUO.blue}
          icon={<UserPlus size={17} color="#ffffff" strokeWidth={2.6} />}
          accessibilityLabel="מצאו חברים — חפשו והוסיפו חברים לרשימה"
          onPress={() => {
            tapHaptic();
            router.push('/friends-list' as never);
          }}
        />
      </View>
    </View>
  );
}
