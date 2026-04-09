import * as Haptics from "expo-haptics";

/**
 * Light tap feedback — use on every button press / tab switch.
 */
export function tapHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Success notification — use when XP/Coins are earned.
 */
export function successHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Error / warning notification — use on failed actions.
 */
export function errorHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Medium impact — use for phase transitions, selections, mid-level interactions.
 */
export function mediumHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Heavy impact — use for dramatic moments (streak celebration, level-up).
 */
export function heavyHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * Double heavy burst — use for milestone wins (chapter complete, streak milestones).
 */
export function doubleHeavyHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
}
