export type NotificationChannelId =
  | "streak"
  | "chest"
  | "challenge"
  | "dailyChallenge"
  | "squadInvite"
  | "squadChest"
  | "morning"
  | "inactivity"
  | "marketHook"
  | "aiInsight"
  | "upgradeNudge";

export interface ScheduledNotification {
  channelId: NotificationChannelId;
  /** Expo notification identifier, needed to cancel */
  identifier: string;
}

export interface NotificationPreferences {
  streak: boolean;
  chest: boolean;
  challenge: boolean;
  dailyChallenge: boolean;
  squadInvite: boolean;
  squadChest: boolean;
  morning: boolean;
  inactivity: boolean;
  marketHook: boolean;
  aiInsight: boolean;
  upgradeNudge: boolean;
}

export interface NotificationState {
  permissionGranted: boolean;
  scheduled: ScheduledNotification[];
  bannerDismissed: boolean;
  preferences: NotificationPreferences;
  lastScheduledDate: string | null;
  lastFinnCopyTitle: string | null;
  lastAIInsightNotifDate: string | null;
}
