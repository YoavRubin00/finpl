import * as Application from 'expo-application';

export function getAppVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}

// Lightweight semver comparator. Returns -1 if a < b, 0 if equal, 1 if a > b.
// Strips pre-release suffixes ("1.3.0-beta" → "1.3.0") and treats missing
// segments as 0 ("1.3" === "1.3.0"). Non-numeric segments coerce to 0 so a
// malformed string never throws — important because the comparison runs on
// the cold-start path where a crash would brick the app.
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const norm = (v: string) => v.split('-')[0].split('.').map((n) => Number(n) || 0);
  const [a0 = 0, a1 = 0, a2 = 0] = norm(a);
  const [b0 = 0, b1 = 0, b2 = 0] = norm(b);
  const sign = Math.sign((a0 - b0) || (a1 - b1) || (a2 - b2));
  return sign === -1 ? -1 : sign === 1 ? 1 : 0;
}
