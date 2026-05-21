/**
 * Background download cache for couple-dilemma media (video + narration audio).
 *
 * Why this exists:
 *   ExoPlayer (Android) and AVPlayer (iOS) under expo-video stream the mp4
 *   from Vercel Blob on first play. On 3G/slow Wi-Fi that's a 1-3s freeze
 *   before the 5s video even starts. The lesson reaches the dilemma trigger
 *   ~70% through its flashcards, so we have plenty of time during reading to
 *   pre-download the asset.
 *
 * How it works:
 *   `prefetchCoupleDilemmaAsset(uri)` kicks off an Asset.downloadAsync() to
 *   the OS file system, fire-and-forget. When the player later resolves the
 *   URI via `resolveCoupleDilemmaAssetUri(uri)`, it gets a `file://` path if
 *   the download finished — otherwise the original remote URI (the player
 *   falls back to streaming, same as before this module existed).
 */
import { Asset } from 'expo-asset';

const cache = new Map<string, string>();
const inFlight = new Set<string>();

export function prefetchCoupleDilemmaAsset(uri: string): void {
  if (!uri || cache.has(uri) || inFlight.has(uri)) return;
  inFlight.add(uri);
  void Asset.fromURI(uri)
    .downloadAsync()
    .then((asset) => {
      if (asset.localUri) cache.set(uri, asset.localUri);
    })
    .catch(() => {
      // Best-effort — failure means we stream the remote URI instead.
    })
    .finally(() => {
      inFlight.delete(uri);
    });
}

export function resolveCoupleDilemmaAssetUri(uri: string): string {
  return cache.get(uri) ?? uri;
}
