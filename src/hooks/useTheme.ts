import { useColorScheme } from "react-native";
import { DUO } from "../constants/theme";

const DARK = {
  bg: "#1a1a1a",
  surface: "#242424",
  border: "#333333",
  text: "#ffffff",
  textMuted: "#a1a1aa",
  green: "#58cc02",
  greenDark: "#46a302",
  greenSurface: "#1a3a10",
  blue: "#1cb0f6",
  blueDark: "#0a8fc4",
  blueSurface: "#0a2a3a",
  orange: "#ff9600",
  orangeDark: "#cc7800",
  orangeSurface: "#3a2500",
  red: "#ff4b4b",
  redDark: "#cc3c3c",
  purple: "#ce82ff",
  purpleDark: "#9b59b6",
} as const;

export interface AppTheme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  green: string;
  greenDark: string;
  greenSurface: string;
  blue: string;
  blueDark: string;
  blueSurface: string;
  orange: string;
  orangeDark: string;
  orangeSurface: string;
  red: string;
  redDark: string;
  purple: string;
  purpleDark: string;
}

/**
 * Returns the correct DUO palette based on the system color scheme.
 * Light mode → DUO (white backgrounds, dark text)
 * Dark mode  → DARK (dark backgrounds, white text)
 */
export function useTheme(): AppTheme {
  // Force light mode for now — dark mode palette exists but disabled
  return DUO;
}
