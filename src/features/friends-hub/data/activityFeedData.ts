export interface ActivityFeedItem {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  action: string;
  detail?: string;
  timestamp: string; // relative label
  type: 'xp' | 'duel' | 'donation' | 'group_buy' | 'streak' | 'level';
}

export const ACTIVITY_FEED_ITEMS: ActivityFeedItem[] = [
  {
    id: 'act-001',
    memberId: 'mem-001',
    memberName: 'יונתן',
    memberAvatar: '🐺',
    action: 'ניצח בדו-קרב',
    detail: 'נגד נועה',
    timestamp: 'לפני 5 דק\'',
    type: 'duel',
  },
  {
    id: 'act-002',
    memberId: 'mem-002',
    memberName: 'נועה',
    memberAvatar: '🦋',
    action: 'השלימה שיעור',
    detail: '+120 XP',
    timestamp: 'לפני 18 דק\'',
    type: 'xp',
  },
  {
    id: 'act-003',
    memberId: 'mem-003',
    memberName: 'אריאל',
    memberAvatar: '🦁',
    action: 'רצף 7 ימים! 🔥',
    timestamp: 'לפני 30 דק\'',
    type: 'streak',
  },
  {
    id: 'act-004',
    memberId: 'mem-001',
    memberName: 'יונתן',
    memberAvatar: '🐺',
    action: 'תרם 10 מטבעות',
    detail: 'לאריאל',
    timestamp: 'לפני שעה',
    type: 'donation',
  },
  {
    id: 'act-005',
    memberId: 'mem-004',
    memberName: 'מיכל',
    memberAvatar: '🐬',
    action: 'הצטרפה לרכישה',
    detail: 'קניון ת"א',
    timestamp: 'לפני שעתיים',
    type: 'group_buy',
  },
  {
    id: 'act-006',
    memberId: 'mem-005',
    memberName: 'עידו',
    memberAvatar: '🦊',
    action: 'עלה לרמה 5',
    detail: '🎉',
    timestamp: 'לפני 3 שעות',
    type: 'level',
  },
];

const TYPE_COLORS: Record<ActivityFeedItem['type'], string> = {
  xp: '#a78bfa',
  duel: '#ef4444',
  donation: '#16a34a',
  group_buy: '#f5c842',
  streak: '#f97316',
  level: '#60a5fa',
};

export function getTypeColor(type: ActivityFeedItem['type']): string {
  return TYPE_COLORS[type];
}
