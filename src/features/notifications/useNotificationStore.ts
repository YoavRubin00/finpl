import * as Notifications from "expo-notifications";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { track } from '../../lib/analytics/events';
import type { NotificationChannelId, NotificationState } from "./notificationTypes";

// ─── Default handler, show banners in foreground ───────────────────────────
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
  // Push titles intentionally emoji-free (2026-05-30 audit: CALM theme dictates
  // restraint; emojis read as casino-creep). Emojis in body copy still ok when
  // they add information (e.g. mascot avatar).
  streak: {
    title: "אל תשברו את הרצף",
    body: "לא למדתם היום עדיין. שמרו על הסטריק שלכם.",
    data: { screen: "/(tabs)/learn" },
  },
  // US-009 23:00 last-chance fallback — title/body are overridden per-call
  // via scheduleStreakFallbackWithCopy; this default is the safety net.
  streakFallback: {
    title: "שעה אחרונה ליום",
    body: "לא מאוחר מדי. 2 דקות וזה ירוץ עוד יום ברצף.",
    data: { screen: "/(tabs)/learn" },
  },
  chest: {
    title: "ארגז מחכה לפתיחה",
    body: "הארגז שלכם חיכה מספיק. פתחו ואספו את הפרס.",
    data: { screen: "/(tabs)/learn" },
  },
  challenge: {
    title: "אתגר ממתין לכם",
    body: "חבר שלח לכם אתגר. אל תתנו לו לנצח.",
    data: { screen: "/duels" },
  },
  squadInvite: {
    title: "הזמנה לסקוואד",
    body: "מישהו הזמין אתכם להצטרף לסקוואד שלו. בואו נרוויח יחד.",
    data: { screen: "/squads" },
  },
  squadChest: {
    title: "תיבת הסקוואד נפתחה",
    body: "הסקוואד שלכם הגיע ליעד. בואו לאסוף את השלל המשותף.",
    data: { screen: "/squads" },
  },
  morning: {
    title: "בוקר טוב מקפטן שארק!",
    body: "טיפ פיננסי ליום חדש, בואו לגלות!",
    data: { screen: "/(tabs)/learn" },
  },
  inactivity: {
    title: "קפטן שארק מתגעגע!",
    body: "כבר לא ראינו אתכם... בואו נלמד משהו חדש!",
    data: { screen: "/(tabs)/learn" },
  },
  dailyChallenge: {
    title: "האתגר היומי מחכה לכם",
    body: "דילמה פיננסית חדשה. בואו לפתור ולצבור XP.",
    // 2026-05-30: was `/(tabs)/learn` + orphan `feedScrollIndex` (Feed-scroll
    // anchor from the deleted FinFeedScreen). The push body promises a dilemma
    // — route directly to the dedicated host so the user lands in the game,
    // not on the pyramid map.
    data: { screen: "/quest/daily-dilemma" },
  },
  breakingNews: {
    title: "הסיכומים היומיים שלך מוכנים",
    body: "כל החדשות מאתמול על המניות שלך — תוך 30 שניות.",
    data: { screen: "/breaking-news" },
  },
  marketHook: {
    title: "השוקים זזים",
    body: "בואו לראות מה קורה בעולם הפיננסי.",
    data: { screen: "/(tabs)/investments" },
  },
  aiInsight: {
    title: "תובנה חדשה מקפטן שארק",
    body: "יש לכם תובנה פיננסית מותאמת אישית. בואו לראות.",
    data: { screen: "/(tabs)/" },
  },
  upgradeNudge: {
    title: "קפטן שארק שם לב אליכם",
    body: "ניסיתם להשתמש בפיצ'רים PRO. בואו נסגור את זה?",
    data: { screen: "/pricing" },
  },
  // Tool-of-the-day discovery push. title/body/screen are overridden per-call
  // (scheduleToolDiscovery) with the actual rotated tool — this is the fallback.
  tools: {
    title: "כלי שיכול לחסוך לך כסף",
    body: "גלה את הכלי הפיננסי של היום. בדיקה של דקה.",
    data: { screen: "/fire-calculator" },
  },

};

// ─── Android channel setup ───────────────────────────────────────────────────
async function ensureAndroidChannels() {
  await Notifications.setNotificationChannelAsync("streak", {
    name: "תזכורת רצף",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("streakFallback", {
    name: "שעה אחרונה לרצף",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("chest", {
    name: "ארגזים מוכנים",
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
  await Notifications.setNotificationChannelAsync("upgradeNudge", {
    name: "הצעות PRO",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync("tools", {
    name: "הכלי הפיננסי של היום",
    importance: Notifications.AndroidImportance.DEFAULT,
  });

}

/** Stamp the scheduling channel into the payload so the tap listener
 *  (useNotifications) can attribute `push_opened` to a specific channel. */
function withChannel(
  content: Notifications.NotificationContentInput,
  channel: NotificationChannelId | "breakingNews",
): Notifications.NotificationContentInput {
  return { ...content, data: { ...(content.data ?? {}), channel } };
}

// ─── Store ────────────────────────────────────────────────────────────────────
interface NotificationExtraState {
  /** The appointment hour (8-22) the user picked in the permission primer's
   *  time chips ("מתי להזכיר?"). Wins over computePersonalizedHour until the
   *  user changes it — an explicit appointment beats an inferred habit. */
  preferredReminderHour: number | null;
}

interface NotificationActions {
  /** Request OS notification permission. `source` tags the analytics event with
   *  the entry point (e.g. 'permission' banner, 'breaking_news', 'settings').
   *  `preferredHour` (8-22) — the appointment hour picked in the primer's time
   *  chips; on a fresh grant the streak reminder is scheduled at this hour. */
  requestPermission: (source?: string, preferredHour?: number) => Promise<boolean>;
  /** Reconcile the cached permissionGranted flag with the real OS permission
   *  state WITHOUT prompting. The cached flag can drift (granted in a past
   *  session then revoked in OS settings, or never synced), which would
   *  permanently suppress the permission banner. Call on banner mount. */
  syncPermissionStatus: () => Promise<void>;
  dismissBanner: () => void;
  /** Clear the dismissed state so the banner can be shown again — used after
   *  walkthrough completion so the post-tour permission prompt always fires
   *  even if the user dismissed it during a previous session/test. */
  resetBannerDismissed: () => void;
  reset: () => void;
  scheduleStreakReminder: (hourOfDay?: number) => Promise<void>;
  scheduleStreakReminderWithCopy: (content: Notifications.NotificationContentInput, hourOfDay?: number) => Promise<void>;
  /** Tool-of-the-day discovery push at the personalised hour. Lowest-priority
   *  daily push — only scheduled for engaged users (no streak/inactivity risk). */
  scheduleToolDiscovery: (content: Notifications.NotificationContentInput, hourOfDay?: number) => Promise<void>;

  /** US-009 — schedule a 23:00 "save your streak" fallback on a SEPARATE
   *  channel so it doesn't overwrite the primary streak reminder. The
   *  scheduler can cancel just this channel when the user logs a session. */
  scheduleStreakFallbackWithCopy: (content: Notifications.NotificationContentInput, hourOfDay?: number) => Promise<void>;
  scheduleMorningMotivation: (content: Notifications.NotificationContentInput) => Promise<void>;
  scheduleInactivityEscalation: (notifications: Array<{ content: Notifications.NotificationContentInput; delayHours: number }>) => Promise<void>;
  scheduleMarketHook: (content: Notifications.NotificationContentInput) => Promise<void>;
  scheduleChestReady: (delayMs: number) => Promise<void>;
  scheduleDailyChallenge: (hourOfDay?: number) => Promise<void>;
  /** Schedule the daily Breaking News push at `hourOfDay` (0-23, local TZ).
   *  Cancels any previous breakingNews schedule. No-op when permission isn't
   *  granted. Free-standing — not tied to any preference flag. */
  scheduleBreakingNewsDaily: (hourOfDay: number) => Promise<void>;
  scheduleChallenge: () => Promise<void>;
  scheduleSquadInvite: () => Promise<void>;
  scheduleSquadChest: () => Promise<void>;
  cancelChannel: (channelId: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  setPreference: (channelId: NotificationChannelId, enabled: boolean) => void;
  setLastScheduledDate: (date: string) => void;
  setLastFinnCopyTitle: (title: string | null) => void;
}

export const useNotificationStore = create<NotificationState & NotificationExtraState & NotificationActions>()(
  persist(
    (set, get) => ({
      permissionGranted: false,
      scheduled: [],
      bannerDismissed: false,
      bannerDismissedAt: null as string | null,
      preferredReminderHour: null as number | null,
      // Apple 4.5.4: ALL notification preferences default to OFF on fresh install.
      // Notifications are only scheduled after the user explicitly toggles a
      // preference ON in Settings, which triggers the system permission prompt.
      preferences: { streak: false, chest: false, challenge: false, dailyChallenge: false, squadInvite: false, squadChest: false, morning: false, inactivity: false, marketHook: false, aiInsight: false, upgradeNudge: false, tools: false },
      lastScheduledDate: null as string | null,
      lastFinnCopyTitle: null as string | null,
      lastAIInsightNotifDate: null as string | null,

      dismissBanner: () => set({ bannerDismissed: true, bannerDismissedAt: new Date().toISOString() }),

      resetBannerDismissed: () => set({ bannerDismissed: false, bannerDismissedAt: null }),

      requestPermission: async (source?: string, preferredHour?: number): Promise<boolean> => {
        await ensureAndroidChannels();
        const { status: existing } = await Notifications.getPermissionsAsync();
        // `prompted` = the OS dialog was actually shown. When already granted we
        // skip the dialog, so that's a reconciliation, not a fresh user choice.
        const prompted = existing !== "granted";
        let finalStatus = existing;
        if (prompted) {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        const granted = finalStatus === "granted";
        set({ permissionGranted: granted });
        // D1 catch-22 fix (Yoav 2026-06-28): a fresh opt-in is the ONLY moment we
        // can arm next-day reminders for a churning new user who may never reopen
        // the app. Enable the core retention reminders AND schedule them NOW —
        // the once-per-day scheduler won't run again until the next app open,
        // which a D1-churner never reaches. Gated on `prompted` so a later
        // already-granted reconciliation never re-enables prefs the user turned
        // OFF in Settings. The existing useFinnNotificationScheduler re-arms these
        // (personalised) on every subsequent app open.
        if (granted && prompted) {
          const appointmentHour = typeof preferredHour === 'number'
            ? Math.max(8, Math.min(22, Math.round(preferredHour)))
            : null;
          set({
            preferences: { ...get().preferences, streak: true, morning: true, inactivity: true, dailyChallenge: true },
            ...(appointmentHour !== null ? { preferredReminderHour: appointmentHour } : {}),
          });
          try {
            await ensureAndroidChannels();
            // 48h-pulse (RETENTION-PLAN 2026-07-02 §2.2): the first scheduled
            // day is 12:00 daily-dilemma (an invitation-to-content, not guilt)
            // + the evening streak saver at the user's chosen appointment hour
            // — replacing the generic 09:00 morning push, the weakest copy in
            // the pool, which also collided with the 09:00 retention email.
            // Cap stays 2: one-shot dilemma + daily streak reminder.
            await get().scheduleDailyChallenge(12);
            await get().scheduleStreakReminderWithCopy(
              {
                title: 'יומיים ברצף במרחק 2 דקות',
                body: 'התיבה של יום 2 מחכה. קבענו, לא?',
                data: { screen: "/(tabs)/learn" },
              },
              appointmentHour ?? 20,
            );
            track({ name: 'next_day_reminder_scheduled', props: { source: source ?? 'permission_grant' } });
          } catch { /* non-fatal — the daily scheduler re-arms on the next app open */ }
        }
        // The opt-in signal: granted ÷ prompted = the real approval rate.
        try { track({ name: 'notification_permission_result', props: { granted, prompted, source: source ?? 'unknown' } }); } catch { /* non-fatal */ }
        return granted;
      },

      syncPermissionStatus: async (): Promise<void> => {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          const granted = status === "granted";
          if (get().permissionGranted !== granted) set({ permissionGranted: granted });
        } catch {
          /* non-fatal — leave cached value untouched */
        }
      },

      /** Schedule a daily repeating streak reminder at `hourOfDay` (default 20 = 8pm) */
      scheduleStreakReminder: async (hourOfDay = 20): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;

        // Cancel existing streak reminder before re-scheduling
        await cancelChannel("streak");

        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(CONTENT.streak, "streak"),
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

        // Cap: don't stack, cancel ALL pending before adding chest notification
        await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
        await cancelChannel("chest");

        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(CONTENT.chest, "chest"),
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
          content: withChannel(CONTENT.dailyChallenge, "dailyChallenge"),
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

      scheduleBreakingNewsDaily: async (hourOfDay: number): Promise<void> => {
        const { permissionGranted, cancelChannel } = get();
        if (!permissionGranted) return;
        const hour = Math.max(0, Math.min(23, Math.round(hourOfDay)));
        await cancelChannel("breakingNews");
        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(CONTENT.breakingNews, "breakingNews"),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute: 0,
            channelId: "breakingNews",
          },
        });
        // Re-read after cancelChannel's set() (the captured array would be
        // stale) and filter defensively so the channel never accumulates
        // duplicate entries on repeated scheduling.
        set({
          scheduled: [
            ...get().scheduled.filter((s) => s.channelId !== "breakingNews"),
            { channelId: "breakingNews", identifier },
          ],
        });
      },

      /** Schedule an immediate challenge notification (use for incoming duel invites) */
      scheduleChallenge: async (): Promise<void> => {
        const { permissionGranted, scheduled } = get();
        if (!permissionGranted) return;

        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(CONTENT.challenge, "challenge"),
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
          content: withChannel(CONTENT.squadInvite, "squadInvite"),
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
          content: withChannel(CONTENT.squadChest, "squadChest"),
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
        // Apple 4.5.4: reset preferences to all-OFF (mirrors initial state).
        set({ scheduled: [], preferences: { streak: false, chest: false, challenge: false, dailyChallenge: false, squadInvite: false, squadChest: false, morning: false, inactivity: false, marketHook: false, aiInsight: false, upgradeNudge: false, tools: false } });
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
          content: withChannel(content, "streak"),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hourOfDay,
            minute: 0,
            channelId: "streak",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "streak"), { channelId: "streak" as const, identifier }] });
      },

      /** US-009 — 23:00 fallback push on its OWN channel so the primary
       *  streak reminder isn't overwritten. Independently cancellable
       *  by the scheduler when the user logs a session before 23:00. */
      scheduleStreakFallbackWithCopy: async (content, hourOfDay = 23): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("streakFallback");
        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(content, "streakFallback"),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hourOfDay,
            minute: 0,
            channelId: "streakFallback",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "streakFallback"), { channelId: "streakFallback" as const, identifier }] });
      },

      /** Schedule morning motivation at 09:00 */
      scheduleMorningMotivation: async (content): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("morning");
        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(content, "morning"),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 0,
            channelId: "morning",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "morning"), { channelId: "morning" as const, identifier }] });
      },

      /** Schedule the tool-of-the-day discovery push at a personalised hour. */
      scheduleToolDiscovery: async (content, hourOfDay = 20): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        // The 'tools' Android channel is NEW — existing users who granted
        // permission before this build last ran ensureAndroidChannels() WITHOUT
        // it (it only runs inside requestPermission, which the Settings toggle
        // skips when permission is already granted). Re-register here so
        // scheduling to channelId:'tools' isn't silently dropped on Android 8+.
        await ensureAndroidChannels();
        await cancelChannel("tools");
        const identifier = await Notifications.scheduleNotificationAsync({
          content: withChannel(content, "tools"),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hourOfDay,
            minute: 0,
            channelId: "tools",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "tools"), { channelId: "tools" as const, identifier }] });
      },


      /** Schedule inactivity notification, capped to 1 only */
      scheduleInactivityEscalation: async (notifications): Promise<void> => {
        const { permissionGranted, scheduled, cancelChannel } = get();
        if (!permissionGranted) return;
        await cancelChannel("inactivity");
        const capped = notifications.slice(0, 1); // Max 1 notification
        const newScheduled = [...scheduled.filter((s) => s.channelId !== "inactivity")];
        for (const { content, delayHours } of capped) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content: withChannel(content, "inactivity"),
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
          content: withChannel(content, "marketHook"),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.round(delayDays * 86400),
            repeats: false,
            channelId: "marketHook",
          },
        });
        set({ scheduled: [...scheduled.filter((s) => s.channelId !== "marketHook"), { channelId: "marketHook" as const, identifier }] });
      },

      reset: () => set({
        permissionGranted: false,
        scheduled: [],
        bannerDismissed: false,
        bannerDismissedAt: null,
        preferredReminderHour: null,
        preferences: { streak: false, chest: false, challenge: false, dailyChallenge: false, squadInvite: false, squadChest: false, morning: false, inactivity: false, marketHook: false, aiInsight: false, upgradeNudge: false, tools: false },
        lastScheduledDate: null,
        lastFinnCopyTitle: null,
        lastAIInsightNotifDate: null,
      }),
    }),
    {
      name: "notification-store",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        permissionGranted: s.permissionGranted,
        scheduled: s.scheduled,
        bannerDismissed: s.bannerDismissed,
        bannerDismissedAt: s.bannerDismissedAt,
        preferredReminderHour: s.preferredReminderHour,
        preferences: s.preferences,
        lastScheduledDate: s.lastScheduledDate,
        lastFinnCopyTitle: s.lastFinnCopyTitle,
      }),
    },
  ),
);

registerLocalStore('notification-store', useNotificationStore, 'notification-store');
