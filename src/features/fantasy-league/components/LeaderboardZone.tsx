import React from 'react';
import { View, Text } from 'react-native';
import { ZONE } from '../../../constants/theme';

type ZoneKey = 'promote' | 'safe' | 'relegate';

interface DividerProps {
  zone: ZoneKey;
  rangeLabel?: string;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function ZoneDivider({ zone, rangeLabel }: DividerProps): React.ReactElement {
  const cfg = ZONE[zone];
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginTop: 14,
        marginBottom: 8,
        paddingHorizontal: 4,
      }}
      accessibilityRole="header"
    >
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 6,
          backgroundColor: cfg.tint,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.bar }} />
        <Text style={[{ fontSize: 11, fontWeight: '900', color: cfg.text }, RTL]}>{cfg.label}</Text>
      </View>
      {rangeLabel ? (
        <Text style={[{ fontSize: 11, color: '#64748b', flex: 1 }, RTL]}>{rangeLabel}</Text>
      ) : null}
      <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
    </View>
  );
}

interface RowProps {
  rank: number;
  name: string;
  returnPercent: number;
  isLocal: boolean;
  zone: ZoneKey;
  isNew?: boolean;
  medalEmoji?: string;
  avatarEmoji?: string;
}

export function LeaderboardRow({
  rank,
  name,
  returnPercent,
  isLocal,
  zone,
  isNew,
  medalEmoji,
  avatarEmoji,
}: RowProps): React.ReactElement {
  const positive = returnPercent >= 0;
  const cfg = ZONE[zone];
  const pillBg = positive ? '#dcfce7' : '#fee2e2';
  const pillText = positive ? '#15803d' : '#b91c1c';
  const arrow = positive ? '↗' : '↘';

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: isLocal ? '#fef3c7' : '#ffffff',
        borderRadius: 12,
        marginBottom: 6,
        borderWidth: isLocal ? 2 : 1,
        borderColor: isLocal ? '#f59e0b' : '#f1f5f9',
        shadowColor: '#0f172a',
        shadowOpacity: isLocal ? 0.06 : 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
      accessibilityRole="text"
      accessibilityLabel={`${name}${isLocal ? ', אתה' : ''}, מקום ${rank}, ${positive ? 'עלייה' : 'ירידה'} ${Math.abs(returnPercent).toFixed(1)} אחוז`}
    >
      <View style={{ minWidth: 32, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#475569' }}>
          {medalEmoji ?? `#${rank}`}
        </Text>
      </View>

      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cfg.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>{avatarEmoji ?? '🦈'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              { fontSize: 14, fontWeight: '800', color: '#0f172a' },
              RTL,
              isLocal && { color: '#92400e' },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {isLocal ? (
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#b45309' }}>(את/ה)</Text>
          ) : null}
          {isNew ? (
            <View style={{ backgroundColor: '#fbbf24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#78350f', letterSpacing: 0.5 }}>NEW</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 11, color: cfg.text, fontWeight: '700' }}>{arrow}</Text>
          <Text style={[{ fontSize: 11, color: cfg.text }, RTL]}>{cfg.label}</Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: pillBg,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
          minWidth: 72,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '900', color: pillText }}>
          {positive ? '+' : ''}{returnPercent.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}
