import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import type { GroupBuyProject } from '../clanTypes';

const PROPERTY_IMAGES: Record<string, string> = {
  '🏬': 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/mall.png',
  '🏢': 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/tower.png',
  '🍽️': 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/restaurant.png',
  '🪙': 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/gold-coin.png',
};

function getBgColor(emoji: string): string {
  if (emoji === '🏬') return '#0d2030';
  if (emoji === '🏢') return '#091830';
  if (emoji === '🍽️') return '#22120d';
  return '#1f1604';
}

interface GroupBuyPropertyCardProps {
  project: GroupBuyProject;
  selfShare: number;
  isContributor: boolean;
  isFunded?: boolean;
  canClaimPayout?: boolean;
  onContribute: () => void;
  onNavigate: () => void;
  onClaim?: () => void;
  index?: number;
}

export function GroupBuyPropertyCard({
  project,
  selfShare,
  isContributor,
  isFunded = false,
  canClaimPayout = false,
  onContribute,
  onNavigate,
  onClaim,
  index = 0,
}: GroupBuyPropertyCardProps): React.ReactElement {
  const pct = project.goalAmount > 0 ? project.raisedAmount / project.goalAmount : 0;
  const bgColor = getBgColor(project.emoji);
  const propertyImage = PROPERTY_IMAGES[project.emoji];

  return (
    <Animated.View
      entering={FadeInDown.delay(60 + index * 70).duration(280)}
      style={{ marginHorizontal: 16, marginBottom: 14 }}
    >
      <Pressable
        onPress={onNavigate}
        accessibilityLabel={`${project.name} — פרטי פרויקט`}
        accessibilityRole="button"
        style={{ borderRadius: 18, overflow: 'hidden' }}
      >
        <View
          style={{
            backgroundColor: bgColor,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: isFunded ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Hero image strip */}
          <View style={{ height: 120, overflow: 'hidden' }}>
            {propertyImage ? (
              <Image
                source={{ uri: propertyImage }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                accessible={false}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  backgroundColor: bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 56 }}>{project.emoji}</Text>
              </View>
            )}
            {/* Dark gradient overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 48,
                backgroundColor: 'rgba(10,22,40,0.6)',
              }}
            />

            {isFunded && (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 12,
                  backgroundColor: CLAN.tierGold,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#0a1628' }}>מומן 🏆</Text>
              </View>
            )}

            {!isFunded && (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 12,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(212,160,23,0.4)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: CLAN.tierGoldLight }}>
                  {Math.round(pct * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ padding: 14 }}>
            {/* Name */}
            <Text
              style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right', marginBottom: 6 }}
              numberOfLines={1}
            >
              {project.name}
            </Text>

            {/* Description */}
            <Text
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 10 }}
              numberOfLines={1}
            >
              {project.descriptionHebrew}
            </Text>

            {/* Progress bar (active only) */}
            {!isFunded && (
              <View
                style={{
                  height: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${pct * 100}%`,
                    backgroundColor: CLAN.donationGreen,
                    borderRadius: 4,
                  }}
                />
              </View>
            )}

            {/* Stats */}
            <View
              style={{
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', writingDirection: 'rtl' }}>
                {S.dailyYield}: {project.dailyYieldCoins}🪙
                {project.dailyYieldGems > 0 ? ` ${project.dailyYieldGems}💎` : ''}
              </Text>
              {selfShare > 0 ? (
                <Text style={{ fontSize: 12, color: '#4ade80', fontWeight: '700' }}>
                  {S.yourShare}: {Math.round(selfShare * 100)}%
                </Text>
              ) : !isFunded ? (
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {S.investorCount(project.contributorIds.length)}
                </Text>
              ) : null}
            </View>

            {/* CTAs */}
            {isFunded && onClaim ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  if (canClaimPayout) onClaim();
                }}
                disabled={!canClaimPayout}
                accessibilityLabel={canClaimPayout ? S.claimPayout : S.claimedToday}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: canClaimPayout
                    ? pressed
                      ? CLAN.tierGold
                      : CLAN.tierGoldLight
                    : 'rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '900',
                    color: canClaimPayout ? '#0a1628' : 'rgba(255,255,255,0.3)',
                    writingDirection: 'rtl',
                  }}
                >
                  {canClaimPayout ? S.claimPayout : S.claimedToday}
                </Text>
              </Pressable>
            ) : !isContributor ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onContribute();
                }}
                accessibilityLabel={`${S.contribute} — ${project.name}`}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0a1628', writingDirection: 'rtl' }}>
                  {S.contribute} 🏗️
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onContribute();
                }}
                accessibilityLabel={`${S.investMore} — ${project.name}`}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.12)',
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(74,222,128,0.35)',
                })}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#4ade80', writingDirection: 'rtl' }}>
                  {S.investMore} ✓
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}