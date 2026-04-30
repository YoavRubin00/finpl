import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useDuelsStore } from '../../social/useDuelsStore';
import { useClashStore } from '../../friends-clash/useClashStore';
import { STITCH, DUO } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { FinnCue } from './FinnCue';

export function DuelsClashCard(): React.ReactElement {
  const record = useDuelsStore((s) => s.record);
  const invites = useClashStore((s) => s.invites);

  const pendingClash = invites.filter((inv) => inv.status === 'pending');
  const total = (record?.wins ?? 0) + (record?.losses ?? 0) + (record?.draws ?? 0);
  const winRate = total > 0 ? Math.round(((record?.wins ?? 0) / total) * 100) : 0;

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
      {/* ── Orange accent strip (RTL: right edge) ── */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#ea580c', opacity: 0.9, zIndex: 1 }} />

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
            backgroundColor: '#fff7ed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>⚔️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
            תחרויות
          </Text>
          <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
            דו-קרב ו-CLASH
          </Text>
        </View>
        {pendingClash.length > 0 && (
          <View
            style={{
              backgroundColor: '#ef4444',
              borderRadius: 12,
              paddingHorizontal: 9,
              paddingVertical: 4,
              minWidth: 26,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff' }}>
              {pendingClash.length}
            </Text>
          </View>
        )}
      </View>

      {/* ── Stats grid ── */}
      <View
        style={{
          flexDirection: 'row-reverse',
          paddingHorizontal: 12,
          paddingBottom: 14,
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: STITCH.surfaceHighest,
          paddingTop: 12,
        }}
      >
        {[
          { label: 'ניצחונות', value: record?.wins ?? 0, color: DUO.green, bg: '#dcfce7' },
          { label: 'הפסדים', value: record?.losses ?? 0, color: '#ef4444', bg: '#fee2e2' },
          { label: 'תיקו', value: record?.draws ?? 0, color: STITCH.onSurfaceVariant, bg: STITCH.surfaceLow },
          { label: '% ניצחון', value: `${winRate}%`, color: DUO.blue, bg: DUO.blueSurface },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              alignItems: 'center',
              backgroundColor: stat.bg,
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '900', color: stat.color }}>
              {stat.value}
            </Text>
            <Text style={{ fontSize: 10, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'center', marginTop: 2 }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Finn coach line ── */}
      <View style={{ paddingHorizontal: 12, paddingBottom: pendingClash.length > 0 ? 10 : 14 }}>
        <FinnCue
          variant={pendingClash.length > 0 ? 'fire' : 'standard'}
          text={
            pendingClash.length > 0
              ? `${pendingClash[0].opponentName} חושב שהוא טוב ממך. הוכח לו אחרת`
              : 'בלי דו-קרב אין צמיחה. תזרוק כפפה'
          }
          tone="orange"
        />
      </View>

      {/* ── Pending CLASH alert ── */}
      {pendingClash.length > 0 && (
        <View
          style={{
            backgroundColor: '#fff7ed',
            marginHorizontal: 14,
            marginBottom: 14,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#fed7aa',
          }}
        >
          <Text style={{ fontSize: 13, color: '#c2410c', fontWeight: '700', writingDirection: 'rtl', flex: 1 }}>
            {pendingClash[0].opponentName} מאתגר אותך!
          </Text>
          <Pressable
            onPress={() => {
              tapHaptic();
              router.push('/clash' as never);
            }}
            accessibilityRole="button"
            accessibilityLabel="קבל את האתגר"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#c2410c' : '#ea580c',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingTop: 7,
              paddingBottom: 7,
              borderBottomWidth: 4,
              borderBottomColor: '#9a3412',
              transform: [{ translateY: pressed ? 2 : 0 }],
              shadowColor: '#ea580c',
              shadowOpacity: 0.3,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>קבל אתגר</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
