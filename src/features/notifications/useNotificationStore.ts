import * as Notifications from "expo-notifications";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NotificationChannelId, NotificationState } from "./notificationTypes";

// ─── Default handler — show banners in foreground ───────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Notification content definitions ───────────────────────────────────────
const CONTENT: Record<NotificationChannelId, Notifications.NotificationContentInput> = {
  streak: {
    title: "🔥 אל תשבור את הרצף!",
    body: "לא למדת היום עדיין. שמור על הסטריק שלך!",
    data: { screen: "/(tabs)/learn" },
  },
  chest: {
    title: "📦 ארגז מוכן לפתיחה!",
    body: "הארגז שלך חיכה מספיק — פתח אותו עכשיו ואסוף את הפרס!",
    data: { screen: "/(tabs)/learn" },
  },
  challenge: {
    title: "⚔️ אתגר ממתין לך!",
    body: "חבר שלח לך אתגר — אל תתן לו לנצח!",
    data: { screen: "/duels" },
  },
  squadInvite: {
    title: "🤝 הזמנה לסקוואד!",
    body: "מישהו הזמין אותך להצטרף לסקוואד שלו. בוא נרוויח יחד!",
    data: { screen: "/squads" },
  },
  squadChest: {
    title: "💎 תיבת הסקוואד נפתחה!",
    body: "הסקוואד שלך הגיע ליעד! בוא לאסוף את הפרס השלל המשותף.",
    data: { screen: "/squads" },
  },
  morning: {
    title: "🦈 בוקר טוב מקפטן שארק!",
    body: "טיפ פיננסי ליום חדש — בוא לגלות!",
    data: { screen: "/(tabs)/learn" },
  },
  inactivity: {
    title: "🦈 קפטן שארק מתגעגע!",
    body: "כבר לא ראינו אותך... בוא נלמד משהו חדש!",
    data: { screen: "/(tabs)/learn" },
  },
  dailyChallenge: {
    title: "🎯 האתגר היומי מחכה לך!",
    body: "דילמה פיננסית חדשה — בוא לפתור ולצבור XP!",
    data: { screen: "/(tabs)/learn" },
  },
  marketHook: {
    title: "📊 השוקים זזים!",
    body: "בוא לראות מה קורה בעולם הפיננסי",
    data: { screen: "/(tabs)/investments" },
  },
};

// ─── Android channel setup ───────────────────────────────────────────────────
async function ensureAndroidChannels() {
  await Notifications.setNotificationChannelAsync("streak", {
    name: "תזכורת רצף",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("chest", {
    name: "ארגז מוכן",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync("challenge", {
    name: "אתגרים",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("squadInvite", {
    name: "הזמנות סקוואד",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("squadChest", {
    name: "תיבת סקוואד",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("dailyChallenge", {
    name: "אתגר יומי",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("morning", {
    name: "בוקר טוב עם קפטן שארק",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync("inactivity", {
    name: "קפטן שארק מתגעגע",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("marketHook", {
    name: "עדכוני שוק",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────
interface NotificationActions {
  requestPermission: () => Promise<boolean>;
  dismissBanner: () => void;
  scheduleStreakReminder: (hourOfDay?: number) => Promise<void>;
  scheduleStreakReminderWithCopy: (content: Notifications.NotificationContentInput, hourOfDay?: number) => Promise<void>;
  scheduleMorningMotivation: (content: Notifications.NotificationContentInput) => Promise<void>;
  scheduleInactivityEscalation: (notifications: Array<{ content: Notifications.NotificationContentInput; delayHours: number }>) => Promise<void>;
  scheduleMarketHook: (content: Notifications.NotificationContentInput) => Promise<void>;
  scheduleChestReady: (delayMs: number) => Promise<void>;
  scheduleDailyChallenge: (hourOfDay?: number) => Promise<void>;
  scheduleChallenge: () => Promise<void>;
  scheduleSquadInvite: () => Promise<void>;
  scheduleSquadChest: () => Promise<void>;
  cancelChannel: (channelId: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  setPreference: (channelId: NotificationChannelId, enabled: boolean) => void;
  setLastScheduledDate: (date: string) => void;
  setLastFinnCopyTitle: (title: string | null) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set, get) => ({
      permissionGranted: false,
      scheduled: [],
      bannerDismissed: false,
      preferences: { streak: true, chest: false, challenge: false, dailyChallenge: true, squadInvite: true, squadChest: true, morning: true, inactivity: true, marketHook: true },
      lastScheduledDate: null as string | null,
      lastFinnCopyTitle: null as string | null,

      dismissBanner: () => set({ bannerDismissed: true }),

      requestPermission: async (): Promise<boolean> => {
        await ensureAndroidChannels();
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        const granted = finalStatus === "granted";
        set({ permissionGranted: granted });
        return granted;
      },

      /** Schedule a daily repeating streak reminder at `hourOfDay` (default 20 = 8pm) */
      scheduleStreakReminder: async (hourOfDay = 20): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;

        // Cancel existing streak reminder before re-scheduling
        await cancelChannel("streak");

        const identifier = await Notifications.scheduleNotificationAsync({
          content: CONTENT.streak,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hourOfDay,
            minute: 0,
            channelId: "streak",
          },
        });

        set({
          scheduled: [
            ...scheduled.filter((s) => s.channelId !== "streak"),
            { channelId: "streak", identifier },
          ],
        });
      },

      /** Schedule a one-time chest-ready notification after `delayMs` milliseconds */
      scheduleChestReady: async (delayMs: number): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;

        await cancelChannel("chest");

        const identifier = await Notifications.scheduleNotificationAsync({
          content: CONTENT.chest,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.round(delayMs / 1000)),
            repeats: false,
            channelId: "chest",
          },
        });

        set({
          scheduled: [
            ...scheduled.filter((s) => s.channelId !== "chest"),
            { channelId: "chest", identifier },
          ],
        });
      },

      /** Schedule daily challenge reminder at specified hour (default 12:00) */
      scheduleDailyChallenge: async (hourOfDay = 12): Promise<void> => {
        const { permissionGranted, scheduled } = get();
        if (!permissionGranted) return;

        const identifier = await Notifications.scheduleNotificationAsync({
          content: CONTENT.dailyChallenge,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: hourOfDay,
            minute: 0,
            repeats: false,
            channelId: "dailyChallenge",
          },
        });

        set({
          scheduled: [
            ...scheduled,
            { channelId: "dailyChallenge", identifier },
          ],
        });
      },

      /** Schedule an immediate challenge notification (use for incoming duel invites) */
      scheduleChallenge: async (): Promise<void> => {
        const { permissionGranted, scheduled } = get();
        if (!permissionGranted) return;

        const identifier = await Notifications.scheduleNotificationAsync({
          content: CONTENT.challenge,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            repeats: false,
            channelId: "challenge",
          },
        });

        set({
          scheduled: [
            ...scheduled,
            { channelId: "challenge", identifier },
          ],
        });
      },

      scheduleSquadInvite: async (): Promise<void> => {
        const { permissionGranted, scheduled } = get();
        if (!permissionGranted) return;

        const identifier = await Notifications.scheduleNotificationAsync({
          content: CONTENT.squadInvite,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2, // Slight delay
            repeats: false,
            channelId: "squadInvite",
          },
        });

        set({
          scheduled: [...scheduled, { channelId: "squadInvite", identifier }],
        });
      },

      scheduleSquadChest: async (): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;

        await cancelChannel("squadChest");

        const identifier = await Notifications.scheduleNotificationAsync({
          content: CONTENT.squadChest,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            repeats: false,
            channelId: "squadChest",
          },
        });

        set({
          scheduled: [...scheduled, { channelId: "squadChest", identifier }],
        });
      },

      cancelChannel: async (channelId: string): Promise<void> => {
        const { scheduled } = get();
        const targets = scheduled.filter((s) => s.channelId === channelId);
        await Promise.all(
          targets.map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
        );
        set({ scheduled: scheduled.filter((s) => s.channelId !== channelId) });
      },

      cancelAll: async (): Promise<void> => {
        await Notifications.cancelAllScheduledNotificationsAsync();
        set({ scheduled: [], preferences: { streak: true, chest: false, challenge: false, dailyChallenge: true, squadInvite: true, squadChest: true, morning: true, inactivity: true, marketHook: true } });
      },

      setPreference: (channelId, enabled) => {
        set({ preferences: { ...get().preferences, [channelId]: enabled } });
      },

      setLastScheduledDate: (date) => set({ lastScheduledDate: date }),
      setLastFinnCopyTitle: (title) => set({ lastFinnCopyTitle: title }),

      /** Schedule streak reminder with custom Finn copy */
      scheduleStreakReminderWithCopy: async (content, hourOfDay = 20): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("streak");
        const identifier = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hourOfDay,
            minute: 0,
            channelId: "streak",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "streak"), { channelId: "streak" as const, identifier }] });
      },

      /** Schedule morning motivation at 09:00 */
      scheduleMorningMotivation: async (content): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("morning");
        const identifier = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
            channelId: "morning",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "morning"), { channelId: "morning" as const, identifier }] });
      },

      /** Schedule escalating inactivity notifications (24h/48h/72h) */
      scheduleInactivityEscalation: async (notifications): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("inactivity");
        const newScheduled = [...scheduled.filter((s) => s.channelId !== "inactivity")];
        for (const { content, delayHours } of notifications) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: delayHours * 3600,
              repeats: false,
              channelId: "inactivity",
            },
          });
          newScheduled.push({ channelId: "inactivity" as const, identifier });
        }
        set({ scheduled: newScheduled });
      },

      /** Schedule a market hook notification 3-4 days out */
      scheduleMarketHook: async (content): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("marketHook");
        const delayDays = 3 + Math.random();
        const identifier = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.round(delayDays * 86400),
            repeats: false,
            channelId: "marketHook",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "marketHook"), { channelId: "marketHook" as const, identifier }] });
      },
    }),
    {
      name: "notification-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        permissionGranted: s.permissionGranted,
        scheduled: s.scheduled,
        bannerDismissed: s.bannerDismissed,
        preferences: s.preferences,
        lastScheduledDate: s.lastScheduledDate,
        lastFinnCopyTitle: s.lastFinnCopyTitle,
      }),
    },
  ),
);
