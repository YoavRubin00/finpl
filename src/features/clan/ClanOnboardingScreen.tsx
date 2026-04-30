import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSquadsStore } from '../social/useSquadsStore';
import { CLAN } from '../../constants/theme';
import { S } from './strings';

export function ClanOnboardingScreen(): React.ReactElement {
  const [mode, setMode] = useState<'pick' | 'create' | 'join'>('pick');
  const [clanName, setClanName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const createSquad = useSquadsStore((s) => s.createSquad);
  const joinSquad = useSquadsStore((s) => s.joinSquad);

  function handleCreate(): void {
    if (!clanName.trim()) return;
    createSquad(clanName.trim());
    router.replace('/clan');
  }

  function handleJoin(): void {
    if (!inviteCode.trim()) return;
    const success = joinSquad(inviteCode.trim().toUpperCase());
    if (success) {
      router.replace('/clan');
    } else {
      setError('קוד לא נמצא. נסה שוב.');
    }
  }

  if (mode === 'pick') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CLAN.bg, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 }}>
          <Text style={{ fontSize: 48 }}>🛡️</Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '900',
              color: '#ffffff',
              writingDirection: 'rtl',
              textAlign: 'center',
            }}
          >
            {S.onboarding_title}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.6)',
              writingDirection: 'rtl',
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {S.onboarding_subtitle}
          </Text>

          {/* Features list */}
          {[S.onboarding_feature1, S.onboarding_feature2, S.onboarding_feature3].map((f, i) => (
            <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16, color: CLAN.tierGold }}>✦</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', writingDirection: 'rtl' }}>
                {f}
              </Text>
            </View>
          ))}

          <View style={{ gap: 12, width: '100%', marginTop: 12 }}>
            <Pressable
              onPress={() => setMode('create')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0a1628' }}>
                {S.onboarding_create}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('join')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                {S.onboarding_join}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'create') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CLAN.bg, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
            {S.createClan}
          </Text>
          <TextInput
            value={clanName}
            onChangeText={setClanName}
            placeholder="שם הקבוצה"
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={24}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 14,
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'right',
              writingDirection: 'rtl',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          />
          <Pressable
            onPress={handleCreate}
            disabled={!clanName.trim()}
            style={({ pressed }) => ({
              backgroundColor: clanName.trim() ? (pressed ? CLAN.tierGold : CLAN.tierGoldLight) : 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0a1628' }}>
              צור קבוצה 🛡️
            </Text>
          </Pressable>
          <Pressable onPress={() => setMode('pick')}>
            <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, writingDirection: 'rtl' }}>
              חזור
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Join mode
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CLAN.bg, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
          {S.joinClan}
        </Text>
        <TextInput
          value={inviteCode}
          onChangeText={(t) => { setInviteCode(t); setError(''); }}
          placeholder="קוד הזמנה (6 תווים)"
          placeholderTextColor="rgba(255,255,255,0.3)"
          maxLength={6}
          autoCapitalize="characters"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 14,
            color: '#ffffff',
            fontSize: 18,
            fontWeight: '900',
            textAlign: 'center',
            letterSpacing: 4,
            borderWidth: 1,
            borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.15)',
          }}
        />
        {!!error && (
          <Text style={{ color: '#ef4444', textAlign: 'center', fontSize: 13 }}>{error}</Text>
        )}
        <Pressable
          onPress={handleJoin}
          disabled={inviteCode.length < 4}
          style={({ pressed }) => ({
            backgroundColor: inviteCode.length >= 4 ? (pressed ? CLAN.tierGold : CLAN.tierGoldLight) : 'rgba(255,255,255,0.1)',
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0a1628' }}>
            הצטרף לקבוצה
          </Text>
        </Pressable>
        <Pressable onPress={() => { setMode('pick'); setError(''); }}>
          <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            חזור
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}