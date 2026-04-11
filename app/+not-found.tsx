import { Redirect } from "expo-router";

/**
 * Catches any route that doesn't resolve and redirects to the home tab.
 * Prevents the default expo-router "Unmatched Route" screen from appearing
 * (e.g. during walkthrough navigation race conditions on iOS).
 */
export default function NotFound() {
  return <Redirect href="/(tabs)" />;
}