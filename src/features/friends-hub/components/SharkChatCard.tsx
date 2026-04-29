import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSubscriptionStore } from '../../subscription/useSubscriptionStore';
import { DUO } from '../../../constants/theme';
import { MonetizationChip } from '../../clan/components/MonetizationChip';
import { SafeLottie } from '../../../components/ui/SafeLottie';

export function SharkChatCard(): React.ReactElement {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const chatMessagesToday = useSubscriptionStore((s) => s.chatMessagesToday);
  const chatLimit = 3;
  const remaining = isPro() ? null : Math.max(0, chatLimit - chatMessagesToday);

  function handleOpen(): void {
    router.push('/chat');
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
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, gap: 10 }}>
        <SafeLottie
          source={require('../../../../assets/lottie/wired-flat-1173-shark-hover-pinch.json')}
          style={{ width: 48, height: 48 }}
          autoPlay
          loop
        />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '900',
              color: '#191c1e',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            דבר עם שארק
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', writingDirection: 'rtl' }}>
            ייעוץ פיננסי אישי מה-AI
          </Text>
        </View>
        {remaining !== null && (
          <View
            style={{
              backgroundColor: remaining > 0 ? DUO.blueSurface : '#fee2e2',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: remaining > 0 ? DUO.blue : '#ef4444',
              }}
            >
              {remaining}/{chatLimit}
            </Text>
          </View>
        )}
      </View>

      {!isPro() && (
        <MonetizationChip
          label="Pro: הודעות ללא הגבלה"
          onPress={() => router.push('/pricing')}
        />
      )}

      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => ({
          backgroundColor: pressed ? DUO.blueDark : DUO.blue,
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: 'center',
          marginTop: 8,
        })}
      >
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff', writingDirection: 'rtl' }}>
          שאל את שארק 🦈
        </Text>
      </Pressable>
    </View>
  );
}