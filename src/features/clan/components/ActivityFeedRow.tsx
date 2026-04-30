import React from 'react';
import { View, Text } from 'react-native';
import type { ClanChatSystemMessage, ClanChatEvent } from '../clanTypes';

const EVENT_ICONS: Record<ClanChatEvent, string> = {
  member_joined: '🎉',
  member_left: '👋',
  donation_sent: '🤝',
  donation_request: '🙋',
  group_buy_started: '🏗️',
  group_buy_funded: '🏆',
  group_buy_payout: '💰',
  chest_unlocked: '🎁',
  weekly_reset: '🔄',
  tier_promoted: '🥇',
};

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffM = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH >= 24) return `לפני ${Math.floor(diffH / 24)}י׳`;
  if (diffH >= 1) return `לפני ${diffH}ש׳`;
  if (diffM >= 1) return `לפני ${diffM} דק׳`;
  return 'עכשיו';
}

interface ActivityFeedRowProps {
  event: ClanChatSystemMessage;
}

export function ActivityFeedRow({ event }: ActivityFeedRowProps): React.ReactElement {
  const icon = EVENT_ICONS[event.event] ?? '📌';

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 7,
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ fontSize: 16, width: 22, textAlign: 'center' }} accessible={false}>{icon}</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 12,
          color: 'rgba(255,255,255,0.78)',
          writingDirection: 'rtl',
          textAlign: 'right',
          lineHeight: 17,
        }}
        numberOfLines={1}
      >
        {event.body}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.35)',
          minWidth: 60,
          textAlign: 'right',
        }}
      >
        {timeAgo(event.sentAt)}
      </Text>
    </View>
  );
}
