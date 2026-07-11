import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useNotificationStore } from "./useNotificationStore";
import { useFinnNotificationScheduler } from "./useFinnNotificationScheduler";
import { track } from "../../lib/analytics/events";

/**
 * Call once at the root layout level.
 * - Schedules Captain Shark's personality-driven notifications via useFinnNotificationScheduler.
 * - Handles notification taps from both an app already in memory and a cold launch.
 */
export function useNotificationSetup() {
  const router = useRouter();
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const handledResponseIds = useRef(new Set<string>());

  // Captain Shark's smart notification scheduler, runs once per day on app open.
  useFinnNotificationScheduler();

  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse, entrypoint: 'cold_start' | 'listener') => {
    const request = response.notification.request;
    // A repeating notification can reuse its request identifier, so include
    // the delivered timestamp as well as the action in the one-process dedupe.
    const responseId = `${request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
    if (handledResponseIds.current.has(responseId)) return;
    handledResponseIds.current.add(responseId);

    const data = request.content.data;
    const screen = data?.screen as string | undefined;
    const channel = data?.channel as string | undefined;

    // Attribute both in-memory and cold-start notification opens. The latter
    // was previously invisible and could strand a returning user on the map.
    try { track({ name: 'push_opened', props: { channel, screen, entrypoint } }); } catch { /* non-fatal */ }

    // Legacy feedScrollIndex payloads have no screen and are intentionally ignored.
    if (screen) {
      try { router.push(screen as never); } catch { /* non-fatal */ }
    }
  }, [router]);

  // Expo retains a response that launched a cold app process separately from
  // listener events. Clear it after handling so a stale tap cannot replay on a
  // later launch; the Set also protects against a listener/cold-start race.
  useEffect(() => {
    let active = true;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, 'listener');
    });

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!active || !response) return;
        handleNotificationResponse(response, 'cold_start');
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => { /* notification APIs must never block boot */ });

    return () => {
      active = false;
      sub.remove();
    };
  }, [handleNotificationResponse]);

  return { permissionGranted };
}
