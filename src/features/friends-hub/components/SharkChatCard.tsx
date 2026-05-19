import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscriptionStore } from '../../subscription/useSubscriptionStore';
import { DUO, STITCH, LEAGUE_GOLD } from '../../../constants/theme';
import { SafeLottie } from '../../../components/ui/SafeLottie';
import { tapHaptic } from '../../../utils/haptics';
import { FriendsCard } from '../shared/FriendsCard';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function SharkChatCard(): React.ReactElement {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const chatMessagesToday = useSubscriptionStore((s) => s.chatMessagesToday);
  const chatLimit = 3;
  const remaining = isPro() ? null : Math.max(0, chatLimit - chatMessagesToday);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
      <FriendsCard accentColor={DUO.blue}>
        {/* ── Header — Lottie shark + title + remaining chip ── */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: DUO.blueSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SafeLottie
              source={require('../../../../assets/lottie/wired-flat-1173-shark-hover-pinch.json')}
              style={{ width: 52, height: 52 }}
              autoPlay
              loop
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                { fontSize: 16, fontWeight: '900', color: STITCH.onSurface, letterSpacing: -0.3 },
                RTL,
              ]}
            >
              קפטן שארק
            </Text>
            <Text
              style={[{ fontSize: 12, fontWeight: '700', color: STITCH.onSurfaceVariant, marginTop: 2 }, RTL]}
            >
              AI פיננסי אישי · שאלו כל דבר
            </Text>
          </View>
          {remaining !== null && (
            <View
              style={{
                backgroundColor: remaining > 0 ? DUO.blueSurface : '#fee2e2',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
              accessibilityRole="text"
              accessibilityLabel={`${remaining} מתוך ${chatLimit} הודעות נותרו`}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  color: remaining > 0 ? DUO.blueDark : '#b91c1c',
                }}
              >
                {remaining}/{chatLimit}
              </Text>
            </View>
          )}
        </View>

        {/* ── Pro chip (compact, in-card) ── */}
        {!isPro() && (
          <Pressable
            onPress={() => {
              tapHaptic();
              router.push('/pricing');
            }}
            accessibilityRole="button"
            accessibilityLabel="שדרוג ל-Pro: הודעות ללא הגבלה"
            hitSlop={8}
            style={({ pressed }) => ({
              alignSelf: 'flex-end',
              marginBottom: 12,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={[LEAGUE_GOLD.bgFrom, LEAGUE_GOLD.bgTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '900', color: LEAGUE_GOLD.ink }}>⭐ Pro</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: LEAGUE_GOLD.ink }}>
                הודעות ללא הגבלה
              </Text>
            </LinearGradient>
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
          hitSlop={6}
          style={({ pressed }) => ({
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <LinearGradient
            colors={[DUO.blue, DUO.blueDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 13,
              alignItems: 'center',
              borderRadius: 13,
              borderBottomWidth: 4,
              borderBottomColor: 'rgba(0,0,0,0.18)',
              shadowColor: DUO.blueDark,
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
              שוחחו עם הכריש 🦈
            </Text>
          </LinearGradient>
        </Pressable>
      </FriendsCard>
    </View>
  );
}
