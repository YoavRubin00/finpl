/**
 * NotificationPermissionBanner, Duolingo-style permission request banner.
 * Shows when permission is not granted and user hasn't dismissed it this session.
 */
import { useNotificationStore } from "../../features/notifications/useNotificationStore";
import { NotificationBanner } from "./NotificationBanner";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";

export function NotificationPermissionBanner() {
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const bannerDismissed = useNotificationStore((s) => s.bannerDismissed);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const dismissBanner = useNotificationStore((s) => s.dismissBanner);

  const visible = !permissionGranted && !bannerDismissed;

  const handleAllow = async () => {
    await requestPermission();
    // Finn scheduler (useFinnNotificationScheduler) handles all scheduling, 1/day max
  };

  return (
    <NotificationBanner
      visible={visible}
      message="אתם מפספסים התראות ממני"
      actionLabel="אשר"
      onAction={handleAllow}
      onDismiss={dismissBanner}
      duration={0}
      imageSource={FINN_STANDARD}
    />
  );
}
