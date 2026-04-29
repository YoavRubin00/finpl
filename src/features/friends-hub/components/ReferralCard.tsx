import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useReferralStore } from '../../social/useReferralStore';
import { DUO } from '../../../constants/theme';

export function ReferralCard(): React.ReactElement {
  const referralCode = useReferralStore((s) => s.referralCode);
  const canCollectFn = useReferralStore((s) => s.canCollectDividend);
  const collectDividend = useReferralStore((s) => s.collectDividend);
  const referredFriends = useReferralStore((s) => s.referredFriends);
  const referredCount = referredFriends.length;
  const canCollect = canCollectFn();

  const [copied, setCopied] = React.useState(false);

  async function handleCopy(): Promise<void> {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e3e5',
        padding: 16,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <Text style={{ fontSize: 20 }}>💎</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '900',
            color: '#191c1e',
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          הזמן חברים
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: DUO.blue }}>
          {referredCount} חברים
        </Text>
      </View>

      {/* Referral code */}
      <Pressable
        onPress={handleCopy}
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#e0e3e5',
          borderStyle: 'dashed',
          padding: 10,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#191c1e', letterSpacing: 2 }}>
          {referralCode}
        </Text>
        <Text style={{ fontSize: 12, color: copied ? DUO.green : DUO.blue, fontWeight: '700' }}>
          {copied ? 'הועתק ✓' : 'העתק'}
        </Text>
      </Pressable>

      {/* CTA */}
      {canCollect && (
        <Pressable
          onPress={() => collectDividend()}
          style={({ pressed }) => ({
            backgroundColor: pressed ? DUO.greenDark : DUO.green,
            borderRadius: 10,
            paddingVertical: 8,
            alignItems: 'center',
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', writingDirection: 'rtl' }}>
            קבל דיבידנד 💎
          </Text>
        </Pressable>
      )}
    </View>
  );
}