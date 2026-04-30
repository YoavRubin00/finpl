import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useReferralStore } from '../../social/useReferralStore';
import { STITCH, DUO } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';

export function ReferralCard(): React.ReactElement {
  const referralCode = useReferralStore((s) => s.referralCode);
  const canCollectFn = useReferralStore((s) => s.canCollectDividend);
  const collectDividend = useReferralStore((s) => s.collectDividend);
  const referredFriends = useReferralStore((s) => s.referredFriends);
  const referredCount = referredFriends.length;
  const canCollect = canCollectFn();

  const [copied, setCopied] = React.useState(false);

  async function handleCopy(): Promise<void> {
    tapHaptic();
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

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
      {/* ── Green accent strip ── */}
      <View style={{ height: 4, backgroundColor: '#16a34a', opacity: 0.7 }} />

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
            backgroundColor: '#dcfce7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>💎</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
            הזמן חברים
          </Text>
          <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
            {referredCount > 0 ? `${referredCount} חברים הצטרפו דרכך` : 'שתף את הקוד ותרוויח ביחד'}
          </Text>
        </View>
        {referredCount > 0 && (
          <View
            style={{
              backgroundColor: '#dcfce7',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: '#86efac',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#15803d' }}>{referredCount}</Text>
          </View>
        )}
      </View>

      {/* ── Code box ── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest, paddingTop: 14, gap: 10 }}>
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={`העתק קוד הזמנה: ${referralCode}`}
          style={({ pressed }) => ({
            backgroundColor: pressed ? STITCH.surfaceLow : STITCH.surfaceLowest,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: copied ? '#86efac' : STITCH.surfaceHighest,
            borderStyle: 'dashed',
            padding: 14,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '900',
              color: STITCH.onSurface,
              letterSpacing: 3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {referralCode}
          </Text>
          <View
            style={{
              backgroundColor: copied ? '#dcfce7' : DUO.blueSurface,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: copied ? '#16a34a' : DUO.blue,
              }}
            >
              {copied ? 'הועתק ✓' : 'העתק'}
            </Text>
          </View>
        </Pressable>

        {canCollect && (
          <Pressable
            onPress={() => {
              successHaptic();
              collectDividend();
            }}
            accessibilityRole="button"
            accessibilityLabel="קבל דיבידנד על חברים שהזמנת"
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#15803d' : '#16a34a',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 4,
              borderBottomColor: '#14532d',
              transform: [{ translateY: pressed ? 2 : 0 }],
              shadowColor: '#16a34a',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
              קבל דיבידנד 💎
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
