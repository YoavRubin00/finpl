import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  rank: 1 | 2 | 3;
  name: string;
  returnPercent: number;
  isLocal: boolean;
  avatarEmoji?: string;
}

const PODIUM_CFG: Record<1 | 2 | 3, {
  height: number;
  gradient: readonly [string, string, string];
  border: string;
  numberColor: string;
  starCount: number;
  avatarBg: string;
  avatarStar: string;
}> = {
  1: { height: 100, gradient: ['#fef3c7', '#fbbf24', '#d97706'], border: '#92570a', numberColor: '#3b1f00', starCount: 5, avatarBg: '#fef3c7', avatarStar: '#fef3c7' },
  2: { height: 72,  gradient: ['#f1f5f9', '#cbd5e1', '#94a3b8'], border: '#64748b', numberColor: '#1e293b', starCount: 3, avatarBg: '#f1f5f9', avatarStar: 'rgba(255,255,255,0.85)' },
  3: { height: 58,  gradient: ['#bae6fd', '#7dd3fc', '#0284c7'], border: '#075985', numberColor: '#0a1e3a', starCount: 2, avatarBg: '#e0f2fe', avatarStar: 'rgba(255,255,255,0.85)' },
};

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

export function PodiumCharacter({ rank, name, returnPercent, isLocal, avatarEmoji }: Props): React.ReactElement {
  const cfg = PODIUM_CFG[rank];
  const positive = returnPercent >= 0;
  const stars = Array.from({ length: cfg.starCount }, (_, i) => i);

  return (
    <View
      style={{ alignItems: 'center', gap: 6, minWidth: 88 }}
      accessibilityRole="text"
      accessibilityLabel={`מקום ${rank}, ${name}${isLocal ? ', את/ה' : ''}, תשואה ${positive ? 'חיובית' : 'שלילית'} של ${Math.abs(returnPercent).toFixed(1)} אחוז`}
    >
      {/* Crown for #1 */}
      {rank === 1 ? (
        <Text style={{ fontSize: 22 }}>👑</Text>
      ) : (
        <View style={{ height: 22 }} />
      )}

      {/* Stars (above avatar) */}
      <View style={{ flexDirection: 'row-reverse', gap: 2, height: 12 }}>
        {stars.map((s) => (
          <View
            key={s}
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: cfg.avatarStar,
            }}
          />
        ))}
      </View>

      {/* Avatar circle */}
      <View
        style={{
          width: rank === 1 ? 64 : 52,
          height: rank === 1 ? 64 : 52,
          borderRadius: 999,
          backgroundColor: isLocal ? '#fef3c7' : cfg.avatarBg,
          borderWidth: 3,
          borderColor: isLocal ? '#f59e0b' : cfg.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: rank === 1 ? 32 : 26 }}>{avatarEmoji ?? '🦈'}</Text>
      </View>

      {/* Name */}
      <Text
        style={[
          { fontSize: 12, fontWeight: '800', color: isLocal ? '#92400e' : '#0f172a' },
          RTL,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>

      {/* Return % pill */}
      <View
        style={{
          backgroundColor: positive ? '#dcfce7' : '#fee2e2',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '900', color: positive ? '#15803d' : '#b91c1c' }}>
          {positive ? '+' : ''}{returnPercent.toFixed(2)}%
        </Text>
      </View>

      {/* Podium block */}
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          width: 80,
          height: cfg.height,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderTopWidth: 3,
          borderColor: cfg.border,
          marginTop: 4,
          shadowColor: cfg.border,
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', color: cfg.numberColor }}>{rank}</Text>
        {isLocal ? (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginTop: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#78350f' }}>את/ה</Text>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}
