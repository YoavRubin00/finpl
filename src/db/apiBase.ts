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
    _base = process.env.EXPO_PUBLIC_API_URL;
    return _base;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    _base = `http://${hostUri}`;
    return _base;
  }

  _base = '';
  return _base;
}
