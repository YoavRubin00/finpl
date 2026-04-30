import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useFantasyStore } from '../../fantasy-league/useFantasyStore';
import { TIER_CONFIGS, getCompetitionEnd, getCompetitionPhase, getNextDraftOpen } from '../../fantasy-league/fantasyData';
import { STITCH, DUO } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

const PHASE_LABEL: Record<string, string> = {
  pre_draft: 'הליגה הבאה נפתחת',
  draft: 'דראפט פתוח עכשיו',
  competition: 'התחרות בעיצומה',
  results: 'תוצאות הליגה',
};

function daysHoursLeft(target: Date): { days: number; hours: number } {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0 };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return { days, hours };
}

export function FantasyLeagueCard(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const getLeaderboardWithLocal = useFantasyStore((s) => s.getLeaderboardWithLocal);
  const getAverageReturn = useFantasyStore((s) => s.getAverageReturn);

  const phase = getCompetitionPhase();
  const phaseLabel = PHASE_LABEL[phase] ?? PHASE_LABEL.pre_draft;

  const target = phase === 'pre_draft' || phase === 'results' ? getNextDraftOpen() : getCompetitionEnd();
  const { days, hours } = daysHoursLeft(target);

  const hasEntry = currentEntry !== null;
  const tierLabel = hasEntry ? TIER_CONFIGS[currentEntry.tier]?.label ?? '—' : 'לא בליגה';
  const tierEmoji = hasEntry ? TIER_CONFIGS[currentEntry.tier]?.emoji ?? '🏆' : '📈';

  const picksCount = currentEntry?.picks.length ?? 0;
  const avgReturn = hasEntry ? getAverageReturn() : 0;
  const returnPositive = avgReturn >= 0;

  const board = hasEntry ? getLeaderboardWithLocal() : [];
  const localEntry = board.find((e) => e.isLocal);
  const selfRank = localEntry?.rank ?? '--';
  const top3 = board.slice(0, 3);

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        router.push('/fantasy' as never);
      }}
      accessibilityRole="button"
      accessibilityLabel={`פנטזיליג מניות, ${phaseLabel}, לחץ לכניסה`}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 18,
        overflow: 'hidden',
        opacity: pressed ? 0.95 : 1,
        shadowColor: '#3e3c8f',
        shadowOpacity: 0.09,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      })}
    >
      <View
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: STITCH.surfaceHighest,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {/* ── Teal accent strip ── */}
        <View style={{ height: 4, backgroundColor: '#0891b2', opacity: 0.75 }} />

        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 12,
            gap: 10,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: '#cffafe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24 }}>{tierEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
              פנטזיליג מניות
            </Text>
            <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
              {phaseLabel} · {days > 0 ? `${days} ימים` : `${hours} שעות`}
            </Text>
          </View>
          <Text style={{ fontSize: 20, color: STITCH.primary }}>‹</Text>
        </View>

        {/* ── My stats row ── */}
        <View
          style={{
            flexDirection: 'row-reverse',
            paddingHorizontal: 12,
            paddingBottom: 12,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: STITCH.surfaceHighest,
            paddingTop: 12,
          }}
        >
          {[
            { label: 'דירוג', value: `#${selfRank}`, color: DUO.blue, bg: DUO.blueSurface },
            {
              label: 'ליגה',
              value: tierLabel.replace('ליגת ', ''),
              color: STITCH.onSurface,
              bg: STITCH.surfaceLow,
            },
            {
              label: hasEntry ? 'תשואה ממוצעת' : 'בחירות',
              value: hasEntry ? `${returnPositive ? '+' : ''}${avgReturn.toFixed(1)}%` : `${picksCount}/5`,
              color: hasEntry ? (returnPositive ? DUO.green : DUO.red) : STITCH.onSurface,
              bg: hasEntry ? (returnPositive ? '#dcfce7' : '#fee2e2') : STITCH.surfaceLow,
            },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: stat.bg,
                borderRadius: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '900', color: stat.color }} numberOfLines={1}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 10, color: STITCH.onSurfaceVariant, marginTop: 2, writingDirection: 'rtl' }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Mini leaderboard preview ── */}
        {top3.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest, paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
            {top3.map((entry, i) => (
              <View key={entry.playerId} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, width: 22, textAlign: 'center' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </Text>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }} numberOfLines={1}>
                  {entry.displayName}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: entry.returnPercent >= 0 ? DUO.green : DUO.red }}>
                  {entry.returnPercent >= 0 ? '+' : ''}{entry.returnPercent.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}
