import React from 'react';
import { View, Text } from 'react-native';
import { STITCH, DUO } from '../../../constants/theme';
import { useEconomy } from '../../economy/useEconomy';
import { AvatarImage } from '../../avatars/AvatarImage';
import { useAuthStore } from '../../auth/useAuthStore';
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

// All-game coin leaders — seeded until a real global leaderboard API exists.
const GAME_LEADERS: LeaderEntry[] = [
  { id: 'gl-1', name: 'נועה, המשקיעה', avatarId: 'avatar-investor', coins: 14_520 },
  { id: 'gl-2', name: 'איתי, המגן', avatarId: 'avatar-defender', coins: 12_140 },
  { id: 'gl-3', name: 'שירה, הסוחרת', avatarId: 'avatar-trader', coins: 9_860 },
  { id: 'gl-4', name: 'דניאל, האסטרטג', avatarId: 'avatar-strategist', coins: 7_430 },
  { id: 'gl-5', name: 'יעל, המנתחת', avatarId: 'avatar-analyst', coins: 6_210 },
];

export function FriendsLeaderboardCard(): React.ReactElement {
  const { data: economyData } = useEconomy();
  const myCoins = economyData?.coins ?? 0;
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const displayName = useAuthStore((s) => s.displayName);

  const selfEntry: LeaderEntry = {
    id: 'self',
    name: displayName?.trim() ? displayName : 'אני',
    avatarId: myAvatarId,
    coins: myCoins,
    isSelf: true,
  };

  // Always the game-wide top 5 by coin profit; you join the board when you earn it.
  const ranked = [...GAME_LEADERS, selfEntry].sort((a, b) => b.coins - a.coins);
  const selfRank = ranked.findIndex((e) => e.isSelf) + 1;
  const top5 = ranked.slice(0, 5);
  const selfInTop5 = top5.some((e) => e.isSelf);

  const nextTarget = selfInTop5
    ? null
    : GAME_LEADERS[GAME_LEADERS.length - 1].coins - myCoins + 1;

  const finn: { variant: FinnCueVariant; text: string } = selfInTop5
    ? selfRank === 1
      ? { variant: 'dancing', text: 'מקום ראשון בכל המשחק! תפסתם בשיניים' }
      : { variant: 'happy', text: `מקום ${selfRank} בכל המשחק — הצמרת בטווח נשיכה` }
    : {
        variant: 'tablet',
        text: `עוד ${(nextTarget ?? 0).toLocaleString('he-IL')} מטבעות והשם שלכם על הלוח`,
      };

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
            5 המרוויחים הגדולים בכל המשחק
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
              alignItems: 'baseline',
              gap: 3,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '900',
                color: i === 0 ? STITCH.tertiaryGold : DUO.blue,
                fontVariant: ['tabular-nums'],
              }}
            >
              {entry.coins.toLocaleString('he-IL')}
            </Text>
            <Text style={{ fontSize: 12 }}>🪙</Text>
          </View>
        </View>
      ))}

      {/* ── Self rank when outside the board ── */}
      {!selfInTop5 && (
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
          <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 3 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: DUO.blue, fontVariant: ['tabular-nums'] }}>
              {myCoins.toLocaleString('he-IL')}
            </Text>
            <Text style={{ fontSize: 12 }}>🪙</Text>
          </View>
        </View>
      )}

      {/* ── Finn coach line ── */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest }}>
        <FinnCue variant={finn.variant} text={finn.text} tone="gold" />
      </View>
    </View>
  );
}