import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useNotificationStore } from "./useNotificationStore";
import { useFinnNotificationScheduler } from "./useFinnNotificationScheduler";
import { track } from "../../lib/analytics/events";

/**
 * Call once at the root layout level.
 * - Schedules Captain Shark's personality-driven notifications via useFinnNotificationScheduler
 * - Listens for notification taps and navigates to the correct screen
 */
export function useNotificationSetup() {
  const router = useRouter();
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);

  // Captain Shark's smart notification scheduler, runs once per day on app open
  useFinnNotificationScheduler();

  // Handle tap on notification while app is backgrounded/killed
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const screen = data?.screen as string | undefined;
      const channel = data?.channel as string | undefined;
      // Push-tap attribution — every scheduled payload is stamped with its
      // channel (withChannel in useNotificationStore) so D1 can be attributed
      // to the specific reminder that brought the user back.
      try { track({ name: 'push_opened', props: { channel, screen } }); } catch { /* non-fatal */ }
      // feedScrollIndex payloads from before 2026-05-30 are ignored — the
      // Feed surface they targeted has been deleted and its content moved
      // into the Pearl. Notifications still navigate via `screen`.
      if (screen) {
        router.push(screen as never);
      }
    });
    return () => sub.remove();
  }, [router]);

  return { permissionGranted };
}
