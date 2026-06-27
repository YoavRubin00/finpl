import * as Haptics from "expo-haptics";
import { useAudioStore } from "../stores/useAudioStore";

/**
 * Whether haptic feedback is enabled (user setting — Settings → "רטט"). Read at
 * call-time from the persisted store so toggling it takes effect immediately
 * everywhere. Defaults to enabled if the store isn't ready yet. Every helper
 * below early-returns when this is false, so flipping the switch silences ALL
 * vibration across the app without touching call-sites.
 */
function hapticsEnabled(): boolean {
  try {
    return useAudioStore.getState().hapticsEnabled;
  } catch {
    return true;
  }
}

/**
 * Light tap feedback — use on every button press / tab switch.
 */
export function tapHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Subtle "tick" — use for continuous changes (drag-to-reorder, picker scrolling,
 * slider snapping). Softer than tapHaptic and designed for high-frequency calls.
 */
export function selectionHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.selectionAsync();
}

/**
 * Success notification — use when XP/Coins are earned.
 */
export function successHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Error / warning notification — use on failed actions.
 */
export function errorHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Medium impact — use for phase transitions, selections, mid-level interactions.
 */
export function mediumHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Heavy impact — use for dramatic moments (streak celebration, level-up).
 */
export function heavyHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * Double heavy burst — use for milestone wins (chapter complete, streak milestones).
 */
export function doubleHeavyHaptic(): void {
  if (!hapticsEnabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
}
