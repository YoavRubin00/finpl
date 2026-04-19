import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useNotificationStore } from "./useNotificationStore";
import { useFinnNotificationScheduler } from "./useFinnNotificationScheduler";
import { setPendingFeedScroll } from "../finfeed/FinFeedScreen";

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
      const feedScrollIndex = data?.feedScrollIndex as number | undefined;
      if (feedScrollIndex !== undefined) {
        setPendingFeedScroll(feedScrollIndex);
      }
      if (screen) {
        router.push(screen as never);
      }
    });
    return () => sub.remove();
  }, [router]);

  return { permissionGranted };
}
