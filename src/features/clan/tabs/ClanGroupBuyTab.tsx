import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Modal, Image } from 'react-native';

const EMPTY_PROJECTS_URI = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/empty-no-projects.png';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useGroupBuyStore } from '../useGroupBuyStore';
import { PROJECT_TEMPLATES, SELF_ID } from '../clanData';
import type { GroupBuyProject, ContributionCurrency } from '../clanTypes';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import { GroupBuyPropertyCard } from '../components/GroupBuyPropertyCard';
import { MonetizationChip } from '../components/MonetizationChip';

export function ClanGroupBuyTab(): React.ReactElement {
  const projects = useGroupBuyStore((s) => s.projects);
  const ownedAssets = useGroupBuyStore((s) => s.ownedAssets);
  const contribute = useGroupBuyStore((s) => s.contribute);
  const startProject = useGroupBuyStore((s) => s.startProject);
  const getSelfShare = useGroupBuyStore((s) => s.getSelfShare);
  const canClaimPayout = useGroupBuyStore((s) => s.canClaimPayout);
  const claimPayout = useGroupBuyStore((s) => s.claimPayout);

  const [showStartModal, setShowStartModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState<GroupBuyProject | null>(null);
  const [contributeCurrency, setContributeCurrency] = useState<ContributionCurrency>('coins');
  const [contributeAmount, setContributeAmount] = useState(500);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const fundedProjects = projects.filter((p) => p.status === 'funded');

  // Portfolio totals
  const totalDailyCoins = ownedAssets.reduce((acc, a) => {
    const myShare = a.shares[SELF_ID] ?? 0;
    return acc + a.dailyYieldCoins * myShare;
  }, 0);
  const totalDailyGems = ownedAssets.reduce((acc, a) => {
    const myShare = a.shares[SELF_ID] ?? 0;
    return acc + a.dailyYieldGems * myShare;
  }, 0);
  const ownedCount = ownedAssets.length;

  function handleContribute(): void {
    if (!showContributeModal) return;
    contribute(showContributeModal.id, contributeCurrency, contributeAmount);
    setShowContributeModal(null);
  }

  function handleStartProject(templateId: string): void {
    const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    startProject(
      tpl.name,
      tpl.emoji,
      tpl.descriptionHebrew,
      tpl.goalCurrency,
      tpl.goalAmount,
      tpl.dailyYieldCoins,
      tpl.dailyYieldGems,
    );
    setShowStartModal(false);
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}>
      {/* Portfolio header */}
      {ownedCount > 0 && (
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={{ marginHorizontal: 16, marginBottom: 12 }}
        >
          <View
            style={{
              backgroundColor: '#0d2040',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(212,160,23,0.25)',
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>📊</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '900',
                  color: '#ffffff',
                  writingDirection: 'rtl',
                }}
              >
                התיק שלי
              </Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: CLAN.tierGoldLight }}>
                  {ownedCount}
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl' }}>
                  נכסים
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#4ade80' }}>
                  {Math.round(totalDailyCoins)}🪙
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl' }}>
                  {S.portfolioDailyYield}
                </Text>
              </View>
              {totalDailyGems > 0 && (
                <>
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#a78bfa' }}>
                      {totalDailyGems.toFixed(1)}💎
                    </Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl' }}>
                      ג׳מים יומי
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Start project CTA */}
      <Animated.View
        entering={FadeInDown.delay(40).duration(280)}
        style={{ marginHorizontal: 16, marginBottom: 14 }}
      >
        <Pressable
          onPress={() => setShowStartModal(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
          })}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '900',
              color: '#0a1628',
              writingDirection: 'rtl',
            }}
          >
            {S.startProject} 🏗️
          </Text>
        </Pressable>
        <View style={{ marginTop: 6 }}>
          <MonetizationChip label={S.chip_accelerate} onPress={() => router.push('/pricing')} />
        </View>
      </Animated.View>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.5)',
              writingDirection: 'rtl',
              textAlign: 'right',
              paddingHorizontal: 16,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {S.activeProjects}
          </Text>
          {activeProjects.map((project, i) => {
            const selfShare = getSelfShare(project.id);
            const isContributor = project.contributorIds.includes(SELF_ID);
            return (
              <GroupBuyPropertyCard
                key={project.id}
                project={project}
                selfShare={selfShare}
                isContributor={isContributor}
                onContribute={() => setShowContributeModal(project)}
                onNavigate={() => router.push(`/clan/project/${project.id}`)}
                index={i}
              />
            );
          })}
        </>
      )}

      {activeProjects.length === 0 && fundedProjects.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Image
            source={{ uri: EMPTY_PROJECTS_URI }}
            style={{ width: 160, height: 160, marginBottom: 12 }}
            resizeMode="contain"
            accessible={false}
          />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, writingDirection: 'rtl' }}>
            {S.noProjects}
          </Text>
        </View>
      )}

      {/* Owned assets */}
      {ownedAssets.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.5)',
              writingDirection: 'rtl',
              textAlign: 'right',
              paddingHorizontal: 16,
              marginTop: 12,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {S.fundedAssets}
          </Text>
          {ownedAssets.map((asset, i) => {
            const matchingProject = projects.find((p) => p.id === asset.sourceProjectId);
            const fakeProject: GroupBuyProject = matchingProject ?? {
              id: asset.id,
              name: asset.name,
              emoji: asset.emoji,
              descriptionHebrew: '',
              goalCurrency: 'fantasyCash',
              goalAmount: 1,
              raisedAmount: 1,
              status: 'funded',
              startedAt: asset.acquiredAt,
              dailyYieldCoins: asset.dailyYieldCoins,
              dailyYieldGems: asset.dailyYieldGems,
              createdBy: SELF_ID,
              contributorIds: Object.keys(asset.shares),
            };
            return (
              <GroupBuyPropertyCard
                key={asset.id}
                project={fakeProject}
                selfShare={asset.shares[SELF_ID] ?? 0}
                isContributor
                isFunded
                canClaimPayout={canClaimPayout(asset.id)}
                onContribute={() => {}}
                onNavigate={() => router.push(`/clan/project/${asset.sourceProjectId}`)}
                onClaim={() => claimPayout(asset.id)}
                index={i}
              />
            );
          })}
        </>
      )}

      {/* Start Project Modal */}
      <Modal
        visible={showStartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStartModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setShowStartModal(false)}
        >
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: '#1a3a5c',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                gap: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: '#ffffff',
                  writingDirection: 'rtl',
                  textAlign: 'right',
                }}
              >
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
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '800',
                        color: '#ffffff',
                        writingDirection: 'rtl',
                      }}
                    >
                      {tpl.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                        writingDirection: 'rtl',
                      }}
                      numberOfLines={1}
                    >
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
      <Modal
        visible={showContributeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContributeModal(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setShowContributeModal(null)}
        >
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: '#1a3a5c',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                gap: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: '#ffffff',
                  writingDirection: 'rtl',
                  textAlign: 'right',
                }}
              >
                {S.contribute} — {showContributeModal?.name}
              </Text>

              {/* Currency */}
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {(['coins', 'gems', 'fantasyCash'] as ContributionCurrency[]).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setContributeCurrency(c)}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor:
                        contributeCurrency === c ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: contributeCurrency === c ? '#0a1628' : 'rgba(255,255,255,0.7)',
                        writingDirection: 'rtl',
                      }}
                    >
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
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor:
                        contributeAmount === amt ? CLAN.tierGoldLight : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor:
                        contributeAmount === amt ? CLAN.tierGold : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: contributeAmount === amt ? '#0a1628' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {amt.toLocaleString('he-IL')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleContribute}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '900',
                    color: '#0a1628',
                    writingDirection: 'rtl',
                  }}
                >
                  השקע {contributeAmount.toLocaleString('he-IL')}{' '}
                  {contributeCurrency === 'coins'
                    ? '🪙'
                    : contributeCurrency === 'gems'
                    ? '💎'
                    : 'FC'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
