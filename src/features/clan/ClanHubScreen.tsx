import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSquadsStore } from '../social/useSquadsStore';
import { CLAN } from '../../constants/theme';
import { ClanHeader } from './components/ClanHeader';
import { ClanTabBar, type ClanTab } from './components/ClanTabBar';
import { ClanOverviewTab } from './tabs/ClanOverviewTab';
import { ClanChatTab } from './tabs/ClanChatTab';
import { ClanDonationsTab } from './tabs/ClanDonationsTab';
import { ClanGroupBuyTab } from './tabs/ClanGroupBuyTab';
import { ClanMembersTab } from './tabs/ClanMembersTab';

export function ClanHubScreen(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ClanTab>('overview');

  function renderTab(): React.ReactElement {
    switch (activeTab) {
      case 'overview':   return <ClanOverviewTab />;
      case 'chat':       return <ClanChatTab />;
      case 'donations':  return <ClanDonationsTab />;
      case 'groupbuy':   return <ClanGroupBuyTab />;
      case 'members':    return <ClanMembersTab />;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CLAN.bg }} edges={['top']}>
      <ClanHeader onSettingsPress={() => {}} />
      <ClanTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={{ flex: 1 }}>
        {renderTab()}
      </View>
    </SafeAreaView>
  );
}