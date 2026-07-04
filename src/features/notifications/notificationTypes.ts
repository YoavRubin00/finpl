export type NotificationChannelId =
  | "streak"
  | "streakFallback"
  | "chest"
  | "challenge"
  | "dailyChallenge"
  | "squadInvite"
  | "squadChest"
  | "morning"
  | "inactivity"
  | "marketHook"
  | "aiInsight"
  | "upgradeNudge"
  | "tools"
  | "breakingNews"
  | "fantasy";

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
  tools: boolean;
}

export interface NotificationState {
  permissionGranted: boolean;
  scheduled: ScheduledNotification[];
  bannerDismissed: boolean;
  /** ISO timestamp of the last permission-banner dismissal. Drives the 14-day
   *  re-show policy (see NotificationPermissionBanner). Null = never dismissed
   *  on this build, OR dismissed on a legacy build before the field existed. */
  bannerDismissedAt: string | null;
  preferences: NotificationPreferences;
  lastScheduledDate: string | null;
  lastFinnCopyTitle: string | null;
  lastAIInsightNotifDate: string | null;
}
