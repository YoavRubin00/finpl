/**
 * Tomorrow-chest reminder (20.11.26). The chest is the main next-day return
 * mechanic (armed by 84 users / opened by 19 in 30 days) but nothing told the
 * user it was ready. This keeps exactly ONE local push in sync with the chest
 * store: armed for tomorrow -> one push on that Israel day at the user's
 * reminder hour; opened / re-armed / permission off -> the old one is removed.
 *
 * Reconcile-from-state (not call-site hooks): the chest is armed BEFORE the
 * permission primer is answered, so the push must also appear when permission
 * is granted later, and survive OTA / reinstall of an already-armed chest.
 * Never prompts for permission. Reuses the existing Android channel 'chest'.
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNotificationStore } from './useNotificationStore';
import { computePersonalizedHour } from './useFinnNotificationScheduler';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import {
  useTomorrowChestStore,
  tomorrowChestStatus,
  TOMORROW_CHEST_ENABLED,
  CHEST_COINS_FLOOR,
} from '../retention-loops/useTomorrowChestStore';
import { getIsraelDateISO } from '../../utils/israelTime';
import { track } from '../../lib/analytics/events';

export const TOMORROW_CHEST_NOTIF_TYPE = 'tomorrowChest';

export const TOMORROW_CHEST_NOTIF_COPY = {
  title: 'התיבה שלכם מוכנה',
  body: `לפחות ${CHEST_COINS_FLOOR} מטבעות מחכים לכם בפנים. דקה ופותחים.`,
} as const;

type ScheduledRequest = Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>[number];

function dataOf(n: ScheduledRequest): Record<string, unknown> {
  return (n.content?.data as Record<string, unknown> | undefined) ?? {};
}

function isChestReminder(n: ScheduledRequest): boolean {
  return dataOf(n).type === TOMORROW_CHEST_NOTIF_TYPE;
}

/** Local `hour`:00 on the IL calendar day `opensOnDate`; never earlier than that IL day. */
export function resolveChestFireDate(opensOnDate: string, hour: number): Date {
  const [y, m, d] = opensOnDate.split('-').map(Number);
  const h = Math.max(8, Math.min(22, Math.round(hour)));
  let at = new Date(y, m - 1, d, h, 0, 0, 0);
  // Device clock far ahead of Israel: make sure the chest is really ready by then.
  if (getIsraelDateISO(at) < opensOnDate) at = new Date(y, m - 1, d + 1, h, 0, 0, 0);
  return at;
}

let running: Promise<void> | null = null;
let rerun = false;

async function reconcileOnce(): Promise<void> {
  const notif = useNotificationStore.getState();
  const { opensOnDate } = useTomorrowChestStore.getState();
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const pending = all.filter(isChestReminder);
  const cancelList = async (list: ScheduledRequest[]) => {
    await Promise.all(list.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  };

  // Only a chest that opens on a FUTURE day gets a push; one already ready
  // (the user is, or will be, looking at it) or expired gets none.
  const wanted =
    TOMORROW_CHEST_ENABLED &&
    notif.permissionGranted &&
    !!opensOnDate &&
    tomorrowChestStatus(opensOnDate, getIsraelDateISO()) === 'sealed';
  if (!wanted || !opensOnDate) {
    if (pending.length) await cancelList(pending);
    return;
  }

  const hour = notif.preferredReminderHour
    ?? computePersonalizedHour(useEconomyUIStore.getState().recentActivityHours ?? []);
  const fireAt = resolveChestFireDate(opensOnDate, hour);
  if (fireAt.getTime() <= Date.now()) {
    if (pending.length) await cancelList(pending);
    return;
  }

  // Already exactly right? keep it (no churn, no duplicate analytics).
  if (pending.length === 1 && dataOf(pending[0]).fireAt === fireAt.getTime()) return;
  if (pending.length) await cancelList(pending);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: TOMORROW_CHEST_NOTIF_COPY.title,
      body: TOMORROW_CHEST_NOTIF_COPY.body,
      data: {
        channel: 'chest',
        type: TOMORROW_CHEST_NOTIF_TYPE,
        screen: '/(tabs)/learn',
        fireAt: fireAt.getTime(),
        opens_on: opensOnDate,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'chest',
    },
  });
  try {
    track({ name: 'notification_scheduled', props: { type: TOMORROW_CHEST_NOTIF_TYPE, fire_hour: fireAt.getHours(), opens_on: opensOnDate } });
  } catch { /* non-fatal */ }
}

/** Serialised: a state change mid-run triggers one more pass instead of racing. */
export function reconcileTomorrowChestReminder(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        try { await reconcileOnce(); } catch { /* notification APIs must never break the app */ }
      } while (rerun);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Mount once (TomorrowChestReadyHost is already global). */
export function useTomorrowChestReminderSync(): void {
  const opensOnDate = useTomorrowChestStore((s) => s.opensOnDate);
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const preferredHour = useNotificationStore((s) => s.preferredReminderHour);
  useEffect(() => {
    void reconcileTomorrowChestReminder();
  }, [opensOnDate, permissionGranted, preferredHour]);
}
