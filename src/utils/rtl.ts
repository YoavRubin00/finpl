import { I18nManager } from "react-native";

/** Returns logical start/end margins so layouts work in both LTR and RTL. */
export function rtlMargin(start: number, end: number) {
  return { marginStart: start, marginEnd: end } as const;
}

/** Returns logical start/end paddings so layouts work in both LTR and RTL. */
export function rtlPadding(start: number, end: number) {
  return { paddingStart: start, paddingEnd: end } as const;
}

/** Picks a value based on RTL direction. */
export function rtlPick<T>(ltr: T, rtl: T): T {
  return I18nManager.isRTL ? rtl : ltr;
}

export const isRTL = (): boolean => I18nManager.isRTL;