import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useGroupBuyStore } from '../useGroupBuyStore';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { PROJECT_TEMPLATES, SELF_ID } from '../clanData';
import type { GroupBuyProject, ContributionCurrency } from '../clanTypes';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import { SegmentedProgressBar } from '../components/SegmentedProgressBar';
import { GoldRibbon } from '../components/GoldRibbon';
import { MonetizationChip } from '../components/MonetizationChip';

export function ClanGroupBuyTab(): React.ReactElement {
  const projects = useGroupBuyStore((s) => s.projects);
  const ownedAssets = useGroupBuyStore((s) => s.ownedAssets);
  const contribute = useGroupBuyStore((s) => s.contribute);
  const startProject = useGroupBuyStore((s) => s.startProject);
  const getSelfShare = useGroupBuyStore((s) => s.getSelfShare);
  const canClaimPayout = useGroupBuyStore((s) => s.canClaimPayout);
  const claimPayout = useGroupBuyStore((s) => s.claimPayout);

  const coins = useEconomyStore((s) => s.coins);

  const [showStartModal, setShowStartModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState<GroupBuyProject | null>(null);
  const [contributeCurrency, setContributeCurrency] = useState<ContributionCurrency>('coins');
  const [contributeAmount, setContributeAmount] = useState(500);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const fundedProjects = projects.filter((p) => p.status === 'funded');

  function handleContribute(): void {
    if (!showContributeModal) return;
    contribute(showContributeModal.id, contributeCurrency, contributeAmount);
    setShowContributeModal(null);
  }

  function handleStartProject(templateId: string): void {
    const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    startProject(tpl.name, tpl.emoji, tpl.descriptionHebrew, tpl.goalCurrency, tpl.goalAmount, tpl.dailyYieldCoins, tpl.dailyYieldGems);
    setShowStartModal(false);
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}>
      {/* Header CTA */}
      <Animated.View entering={FadeInDown.duration(280)} style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <Pressable
          onPress={() => setShowStartModal(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a1628', writingDirection: 'rtl' }}>
            {S.startProject} 🏗️
          </Text>
        </Pressable>
        <View style={{ marginTop: 6 }}>
          <MonetizationChip
            label={S.chip_accelerate}
            onPress={() => router.push('/pricing')}
          />
        </View>
      </Animated.View>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <>
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {S.activeProjects}
          </Text>
          {activeProjects.map((project, i) => {
            const pct = project.goalAmount > 0 ? project.raisedAmount / project.goalAmount : 0;
            const selfShare = getSelfShare(project.id);
            const isContributor = project.contributorIds.includes(SELF_ID);

            return (
              <Animated.View
                key={project.id}
                entering={FadeInDown.delay(60 + i * 60).duration(260)}
                style={{ marginHorizontal: 16, marginBottom: 12 }}
              >
                <Pressable
                  onPress={() => router.push(`/clan/project/${project.id}`)}
                  style={{
                    backgroundColor: CLAN.cardBg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    padding: 14,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 28 }}>{project.emoji}</Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
                        {project.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }} numberOfLines={1}>
                        {project.descriptionHebrew}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: CLAN.tierGoldLight }}>
                        {Math.round(pct * 100)}%
                      </Text>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>מומן</Text>
                    </View>
                  </View>

                  <SegmentedProgressBar
                    segments={[{ value: pct, color: CLAN.donationGreen }]}
                    height={8}
                  />

                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', writingDirection: 'rtl' }}>
                      {project.contributorIds.length} תורמים
                    </Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      יומי: {project.dailyYieldCoins}🪙 {project.dailyYieldGems > 0 ? `${project.dailyYieldGems}💎` : ''}
                    </Text>
                  </View>

                  {!isContributor && (
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); setShowContributeModal(project); }}
                      style={({ pressed }) => ({
                        marginTop: 10,
                        backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
                        borderRadius: 10,
                        paddingVertical: 8,
                        alignItems: 'center',
                      })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#0a1628', writingDirection: 'rtl' }}>
                        {S.contribute}
                      </Text>
                    </Pressable>
                  )}
                  {isContributor && selfShare > 0 && (
                    <Text style={{ marginTop: 8, fontSize: 12, color: '#4ade80', textAlign: 'right', writingDirection: 'rtl', fontWeight: '700' }}>
                      {S.contributed} — {Math.round(selfShare * 100)}% מהרכישה שלך
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </>
      )}

      {activeProjects.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🏗️</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, writingDirection: 'rtl' }}>
            {S.noProjects}
          </Text>
        </View>
      )}

      {/* Funded / owned assets */}
      {(fundedProjects.length > 0 || ownedAssets.length > 0) && (
        <>
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', paddingHorizontal: 16, marginTop: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {S.fundedAssets}
          </Text>
          {ownedAssets.map((asset, i) => {
            const canClaim = canClaimPayout(asset.id);
            return (
              <Animated.View
                key={asset.id}
                entering={FadeInDown.delay(i * 60).duration(260)}
                style={{ marginHorizontal: 16, marginBottom: 12, position: 'relative' }}
              >
                <View style={{ backgroundColor: CLAN.cardBg, borderRadius: 14, borderWidth: 1.5, borderColor: CLAN.tierGold, padding: 14 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 28 }}>{asset.emoji}</Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
                        {asset.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: CLAN.tierGoldLight, writingDirection: 'rtl' }}>
                        {S.passiveIncome}: {asset.dailyYieldCoins}🪙 {asset.dailyYieldGems > 0 ? `${asset.dailyYieldGems}💎` : ''}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => claimPayout(asset.id)}
                    disabled={!canClaim}
                    style={({ pressed }) => ({
                      backgroundColor: canClaim ? (pressed ? CLAN.tierGold : CLAN.tierGoldLight) : 'rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      paddingVertical: 8,
                      alignItems: 'center',
                    })}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '900', color: canClaim ? '#0a1628' : 'rgba(255,255,255,0.3)', writingDirection: 'rtl' }}>
                      {canClaim ? S.claimPayout : S.claimedToday}
                    </Text>
                  </Pressable>
                </View>
                <GoldRibbon label="מומן! 🏆" />
              </Animated.View>
            );
          })}
        </>
      )}

      {/* Start Project Modal */}
      <Modal visible={showStartModal} transparent animationType="slide" onRequestClose={() => setShowStartModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowStartModal(false)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: '#1a3a5c', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
                {S.chooseTemplate}
              </Text>
              {PROJECT_TEMPLATES.map((tpl) => (
                <Pressable
                  key={tpl.id}
                  onPress={() => handleStartProject(tpl.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  })}
                >
                  <Text style={{ fontSize: 28 }}>{tpl.emoji}</Text>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff', writingDirection: 'rtl' }}>
                      {tpl.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }} numberOfLines={1}>
                      יעד: {tpl.goalAmount.toLocaleString('he-IL')} · יומי: {tpl.dailyYieldCoins}🪙
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={showContributeModal !== null} transparent animationType="slide" onRequestClose={() => setShowContributeModal(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowContributeModal(null)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: '#1a3a5c', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
                {S.contribute} — {showContributeModal?.name}
              </Text>

              {/* Currency */}
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {(['coins', 'gems', 'fantasyCash'] as ContributionCurrency[]).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setContributeCurrency(c)}
                    style={{
                      flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center',
                      backgroundColor: contributeCurrency === c ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: contributeCurrency === c ? '#0a1628' : 'rgba(255,255,255,0.7)', writingDirection: 'rtl' }}>
                      {c === 'coins' ? '🪙' : c === 'gems' ? '💎' : '₪ FC'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Amount presets */}
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {[100, 500, 1000, 5000].map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => setContributeAmount(amt)}
                    style={{
                      flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                      backgroundColor: contributeAmount === amt ? CLAN.tierGoldLight : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: contributeAmount === amt ? CLAN.tierGold : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: contributeAmount === amt ? '#0a1628' : 'rgba(255,255,255,0.7)' }}>
                      {amt.toLocaleString('he-IL')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleContribute}
                style={({ pressed }) => ({ backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' })}
              >
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a1628', writingDirection: 'rtl' }}>
                  השקע {contributeAmount.toLocaleString('he-IL')} {contributeCurrency === 'coins' ? '🪙' : contributeCurrency === 'gems' ? '💎' : 'FC'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}