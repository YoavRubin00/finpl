import React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';

export type ClanTab = 'overview' | 'chat' | 'donations' | 'groupbuy' | 'members';

const TABS: { id: ClanTab; label: string; emoji: string }[] = [
  { id: 'overview',   label: S.tabOverview,   emoji: '🏠' },
  { id: 'chat',       label: S.tabChat,        emoji: '💬' },
  { id: 'donations',  label: S.tabDonations,   emoji: '🎁' },
  { id: 'groupbuy',   label: S.tabGroupBuy,    emoji: '🏬' },
  { id: 'members',    label: S.tabMembers,     emoji: '👥' },
];

interface ClanTabBarProps {
  activeTab: ClanTab;
  onTabChange: (tab: ClanTab) => void;
}

export function ClanTabBar({ activeTab, onTabChange }: ClanTabBarProps): React.ReactElement {
  return (
    <Animated.View entering={FadeInDown.duration(280)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 6,
          flexDirection: 'row-reverse',
        }}
      >
        {TABS.map((tab, i) => {
          const isActive = tab.id === activeTab;
          return (
            <Animated.View
              key={tab.id}
              entering={FadeInDown.delay(i * 60).duration(280)}
            >
              <Pressable
                onPress={() => onTabChange(tab.id)}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? CLAN.tierGold
                    : 'rgba(255,255,255,0.08)',
                  borderWidth: isActive ? 0 : 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ fontSize: 14 }}>{tab.emoji}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#0a1628' : 'rgba(255,255,255,0.7)',
                    writingDirection: 'rtl',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Bottom separator */}
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
    </Animated.View>
  );
}