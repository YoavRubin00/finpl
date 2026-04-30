import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscriptionStore } from '../../subscription/useSubscriptionStore';
import { DUO } from '../../../constants/theme';
import { SafeLottie } from '../../../components/ui/SafeLottie';
import { tapHaptic } from '../../../utils/haptics';
import { FRIENDS_HUB_ASSETS } from '../cloudAssets';

export function SharkChatCard(): React.ReactElement {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const chatMessagesToday = useSubscriptionStore((s) => s.chatMessagesToday);
  const chatLimit = 3;
  const remaining = isPro() ? null : Math.max(0, chatLimit - chatMessagesToday);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#005bb1',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={['#1e3a5f', '#005bb1', '#2d74ce']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14, gap: 12 }}>
          <SafeLottie
            source={require('../../../../assets/lottie/wired-flat-1173-shark-hover-pinch.json')}
            style={{ width: 56, height: 56 }}
            autoPlay
            loop
          />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#ffffff',
                writingDirection: 'rtl',
                textAlign: 'right',
                letterSpacing: -0.3,
              }}
            >
              קפטן שארק
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.75)',
                writingDirection: 'rtl',
                textAlign: 'right',
                marginTop: 2,
              }}
            >
              AI פיננסי אישי — שאל כל שאלה
            </Text>
          </View>
          {remaining !== null && (
            <View
              style={{
                backgroundColor: remaining > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.25)',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: remaining > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(239,68,68,0.4)',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: remaining > 0 ? '#ffffff' : '#fca5a5',
                }}
              >
                {remaining}/{chatLimit}
              </Text>
            </View>
          )}
        </View>

        {/* ── Pro banner (gold zebra-stripe) ── */}
        {!isPro() && (
          <Pressable
            onPress={() => {
              tapHaptic();
              router.push('/pricing');
            }}
            accessibilityRole="button"
            accessibilityLabel="שדרג ל-Pro: הודעות ללא הגבלה"
            style={({ pressed }) => ({
              alignSelf: 'stretch',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
              marginBottom: 4,
            })}
          >
            <View style={{ width: '100%', aspectRatio: 4, position: 'relative' }}>
              <ExpoImage
                source={FRIENDS_HUB_ASSETS.proBannerDecor}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                contentFit="contain"
                cachePolicy="disk"
                accessible={false}
              />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '900',
                      color: '#fde68a',
                      writingDirection: 'rtl',
                      letterSpacing: 0.3,
                    }}
                  >
                    ⭐ Pro: הודעות ללא הגבלה
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* ── CTA ── */}
        <Pressable
          onPress={() => {
            tapHaptic();
            router.push('/chat');
          }}
          accessibilityRole="button"
          accessibilityLabel="פתח צ'אט עם קפטן שארק"
          style={({ pressed }) => ({
            backgroundColor: pressed ? 'rgba(255,255,255,0.85)' : '#ffffff',
            borderRadius: 13,
            paddingVertical: 13,
            alignItems: 'center',
            marginTop: !isPro() ? 10 : 0,
            borderBottomWidth: 4,
            borderBottomColor: 'rgba(0, 91, 177, 0.45)',
            transform: [{ translateY: pressed ? 2 : 0 }],
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: DUO.blue, writingDirection: 'rtl' }}>
            דברו עם הכריש 🦈
          </Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
