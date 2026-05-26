import Constants from 'expo-constants';

let _base: string | undefined;

/**
 * Returns the base URL for API route calls.
 * In dev: uses Expo dev server host from expo-constants.
 * In prod: uses EXPO_PUBLIC_API_URL env var, or empty string for web (relative URLs).
 */
export function getApiBase(): string {
  if (_base !== undefined) return _base;

  if (process.env.EXPO_PUBLIC_API_URL) {
    // Normalize: callers always append `/api/...`, so strip a trailing
    // `/api` or `/` here. .env.local sometimes ships with the /api suffix
    // while eas.json doesn't, and the inconsistent forms double-prefixed
    // the URL in dev mode.
    _base = process.env.EXPO_PUBLIC_API_URL
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
    return _base;
  }

  // Dev fallback: derive the laptop's current LAN IP from the Expo dev-server
  // host (hostUri is e.g. "10.1.188.207:8081"), but point at the local API
  // port (vercel dev on :5050), not Metro's port. This auto-tracks whatever
  // Wi-Fi the laptop is on, so .env.local never needs a hardcoded IP — just
  // ensure the phone is on the same network. Override the port if needed.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    const devPort = process.env.EXPO_PUBLIC_DEV_API_PORT ?? '5050';
    _base = `http://${host}:${devPort}`;
    return _base;
  }

  _base = '';
  return _base;
}
