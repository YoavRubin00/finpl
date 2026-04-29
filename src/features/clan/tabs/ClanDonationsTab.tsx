import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Modal, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDonationsStore } from '../useDonationsStore';
import { SELF_ID, DAILY_DONATION_CAP_COINS, DAILY_DONATION_CAP_GEMS, MAX_DONATION_PER_TAP_COINS, MAX_DONATION_PER_TAP_GEMS } from '../clanData';
import type { DonationRequest, ClanCurrency } from '../clanTypes';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import { MonetizationChip } from '../components/MonetizationChip';
import { router } from 'expo-router';

export function ClanDonationsTab(): React.ReactElement {
  const requests = useDonationsStore((s) => s.getOpenRequests)();
  const donate = useDonationsStore((s) => s.donate);
  const createRequest = useDonationsStore((s) => s.createRequest);
  const getRemainingCap = useDonationsStore((s) => s.getRemainingCap);
  const selfReputation = useDonationsStore((s) => s.selfReputation);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestCurrency, setRequestCurrency] = useState<ClanCurrency>('coins');
  const [requestAmount, setRequestAmount] = useState('20');
  const [requestNote, setRequestNote] = useState('');

  const coinsRemaining = getRemainingCap('coins');
  const gemsRemaining = getRemainingCap('gems');

  function handleDonate(req: DonationRequest, currency: ClanCurrency, amount: number): void {
    donate(req.id, currency, amount);
  }

  function handleCreateRequest(): void {
    const amount = parseInt(requestAmount, 10);
    if (!amount || amount <= 0) return;
    createRequest(requestCurrency, amount, requestNote.trim() || undefined);
    setShowRequestModal(false);
    setRequestNote('');
    setRequestAmount('20');
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}>
      {/* Stats strip */}
      <Animated.View
        entering={FadeInDown.duration(280)}
        style={{
          flexDirection: 'row-reverse',
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: CLAN.cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 14,
          gap: 16,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: CLAN.tierGoldLight }}>
            {selfReputation}
          </Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }}>
            מוניטין
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: coinsRemaining > 0 ? '#4ade80' : '#ef4444' }}>
            {coinsRemaining}/{DAILY_DONATION_CAP_COINS} 🪙
          </Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }}>
            תקרה יומית מטבעות
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: gemsRemaining > 0 ? '#4ade80' : '#ef4444' }}>
            {gemsRemaining}/{DAILY_DONATION_CAP_GEMS} 💎
          </Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }}>
            תקרה יומית ג'מים
          </Text>
        </View>
      </Animated.View>

      {/* Upsell chip */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <MonetizationChip
          label={S.chip_donation_cap}
          onPress={() => router.push('/pricing')}
        />
      </View>

      {/* Request donation CTA */}
      <Animated.View entering={FadeInDown.delay(60).duration(280)} style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <Pressable
          onPress={() => setShowRequestModal(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a1628', writingDirection: 'rtl' }}>
            {S.requestDonation} 🙋
          </Text>
        </Pressable>
      </Animated.View>

      {/* Section title */}
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {S.openRequests}
      </Text>

      {requests.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🎁</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, writingDirection: 'rtl' }}>
            {S.noRequests}
          </Text>
        </View>
      )}

      {requests.map((req, i) => {
        const isSelf = req.requesterId === SELF_ID;
        const pct = Math.min(1, req.amountReceived / req.amountRequested);
        const hoursLeft = Math.max(0, Math.floor((new Date(req.expiresAt).getTime() - Date.now()) / 3_600_000));
        const donateAmount = req.currency === 'coins' ? MAX_DONATION_PER_TAP_COINS : MAX_DONATION_PER_TAP_GEMS;
        const canDonate = !isSelf && (req.currency === 'coins' ? coinsRemaining : gemsRemaining) >= donateAmount;

        return (
          <Animated.View
            key={req.id}
            entering={FadeInDown.delay(100 + i * 60).duration(260)}
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: CLAN.cardBg,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isSelf ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
              padding: 14,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 24 }}>{req.requesterAvatar}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff', writingDirection: 'rtl' }}>
                  {isSelf ? S.myRequest : req.requesterName}
                </Text>
                {req.note && (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }}>
                    {req.note}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {S.expiresIn(hoursLeft)}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: '#4ade80', borderRadius: 4 }} />
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 64, textAlign: 'right' }}>
                {S.progress(req.amountReceived, req.amountRequested)} {req.currency === 'coins' ? '🪙' : '💎'}
              </Text>
            </View>

            {/* Donate button */}
            {!isSelf && (
              <Pressable
                onPress={() => canDonate && handleDonate(req, req.currency, donateAmount)}
                disabled={!canDonate}
                style={({ pressed }) => ({
                  backgroundColor: canDonate ? (pressed ? '#15803d' : CLAN.donationGreen) : 'rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  paddingVertical: 8,
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: canDonate ? '#ffffff' : 'rgba(255,255,255,0.3)', writingDirection: 'rtl' }}>
                  {canDonate
                    ? (req.currency === 'coins' ? S.donateCoins(donateAmount) : S.donateGems(donateAmount))
                    : S.dailyCapReached}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        );
      })}

      {/* Request Modal */}
      <Modal visible={showRequestModal} transparent animationType="slide" onRequestClose={() => setShowRequestModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setShowRequestModal(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: '#1a3a5c', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
                {S.requestDonation}
              </Text>

              {/* Currency toggle */}
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {(['coins', 'gems'] as ClanCurrency[]).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setRequestCurrency(c)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                      backgroundColor: requestCurrency === c ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: requestCurrency === c ? '#0a1628' : 'rgba(255,255,255,0.7)', writingDirection: 'rtl' }}>
                      {c === 'coins' ? '🪙 מטבעות' : '💎 ג\'מים'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Amount */}
              <TextInput
                value={requestAmount}
                onChangeText={setRequestAmount}
                keyboardType="numeric"
                placeholder="סכום"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, color: '#ffffff', fontSize: 16, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
              />

              {/* Note */}
              <TextInput
                value={requestNote}
                onChangeText={setRequestNote}
                placeholder={S.donationNote}
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={60}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, color: '#ffffff', fontSize: 14, textAlign: 'right', writingDirection: 'rtl', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
              />

              <Pressable
                onPress={handleCreateRequest}
                style={({ pressed }) => ({ backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' })}
              >
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a1628', writingDirection: 'rtl' }}>
                  שלח בקשה
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
