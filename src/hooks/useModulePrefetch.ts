import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { captureEvent } from "../lib/posthog";

const videoCache = new Map<string, string>();
const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}module-videos/`;

const audioCache = new Map<string, string>();
const AUDIO_CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}module-audio/`;

// Returns a cached local file URI if the remote mp4 has been downloaded,
// otherwise returns the original remote URI unchanged so playback still works.
export function getCachedVideoPath(remoteUri: string): string {
  return videoCache.get(remoteUri) ?? remoteUri;
}

// Same idea for audio. useIntroAudio reads this so a primed cache makes
// playback start near-instantly instead of waiting on a CDN download.
export function getCachedAudioPath(remoteUri: string): string {
  return audioCache.get(remoteUri) ?? remoteUri;
}

function videoKeyFromUri(uri: string): string {
  return uri.split('/').slice(-2).join('/');
}

function audioKeyFromUri(uri: string): string {
  return uri.split('/').slice(-2).join('/');
}

// Retry policy — Vercel Blob has been observed returning intermittent
// http_403s on iOS (PostHog 2026-05-31 audit: 8 failures across 2 users in
// one day on /0-1.mp4, /0-2.mp4, /0-3.mp4 + infographics, while the same
// URLs serve 200 OK to curl from arbitrary IPs). Treating these as
// fully-transient: a short backoff usually clears them before the user even
// reaches the playback screen. Also covers Android `Connection reset` /
// `Unable to resolve host` blips on flaky cellular.
const RETRY_DELAYS_MS = [1000, 3000, 9000] as const;
const RETRYABLE_HTTP_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function prefetchVideo(uri: string): Promise<void> {
  const filename = uri.split("/").pop() || "video.mp4";
  const localPath = VIDEO_CACHE_DIR + filename;
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 1000) {
      videoCache.set(uri, localPath);
      return;
    }
    await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true }).catch(() => {});
  } catch {/* fall through to download attempt */}

  let lastReason: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await FileSystem.downloadAsync(uri, localPath);
      if (result.status === 200) {
        videoCache.set(uri, localPath);
        if (attempt > 0) {
          captureEvent('video_prefetch_failed', {
            video_key: videoKeyFromUri(uri),
            platform: Platform.OS,
            reason: `recovered_after_${attempt}_retries`,
          });
        }
        return;
      }
      lastReason = `http_${result.status}`;
      if (!RETRYABLE_HTTP_STATUSES.has(result.status)) break;
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  captureEvent('video_prefetch_failed', {
    video_key: videoKeyFromUri(uri),
    platform: Platform.OS,
    reason: lastReason ?? 'unknown',
  });
}

// ExpoImage.prefetch returns Promise<boolean | undefined> (`true` on cache
// hit, `false` on failure) — no HTTP status. Mirror the audio/video retry
// shape: try a few times with exponential backoff, then log the final
// outcome. Both `false` resolutions and thrown errors count as failures.
async function prefetchImageWithRetry(uri: string): Promise<void> {
  let lastReason: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const ok = await ExpoImage.prefetch(uri);
      if (ok !== false) {
        if (attempt > 0) {
          captureEvent('image_prefetch_failed', {
            uri,
            file_key: uri.split('/').slice(-2).join('/'),
            platform: Platform.OS,
            reason: `recovered_after_${attempt}_retries`,
          });
        }
        return;
      }
      lastReason = 'prefetch_returned_false';
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  captureEvent('image_prefetch_failed', {
    uri,
    file_key: uri.split('/').slice(-2).join('/'),
    platform: Platform.OS,
    reason: lastReason ?? 'unknown',
  });
}

async function prefetchAudio(uri: string): Promise<void> {
  const filename = uri.split("/").pop() || "audio.mp3";
  const localPath = AUDIO_CACHE_DIR + filename;
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 1000) {
      audioCache.set(uri, localPath);
      return;
    }
    await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true }).catch(() => {});
  } catch {/* fall through to download attempt */}

  let lastReason: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await FileSystem.downloadAsync(uri, localPath);
      if (result.status === 200) {
        audioCache.set(uri, localPath);
        if (attempt > 0) {
          captureEvent('audio_prefetch_failed', {
            audio_key: audioKeyFromUri(uri),
            platform: Platform.OS,
            reason: `recovered_after_${attempt}_retries`,
          });
        }
        return;
      }
      lastReason = `http_${result.status}`;
      if (!RETRYABLE_HTTP_STATUSES.has(result.status)) break;
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  captureEvent('audio_prefetch_failed', {
    audio_key: audioKeyFromUri(uri),
    platform: Platform.OS,
    reason: lastReason ?? 'unknown',
  });
}

// Fire-and-forget eager prefetch. Call this right before `router.push('/lesson/...')`
// from hot entry points (Pyramid node tap, FinFeed module hook) so the MP3 starts
// downloading during the Expo Router transition instead of after mount.
export function prefetchModuleAudio(audioUri: string | undefined): void {
  if (!audioUri) return;
  void prefetchAudio(audioUri);
}

/** Streaming-friendly video warmup (does NOT download the full file). Issues
 *  a Range request for the first ~512KB — enough to prime the OS HTTP cache
 *  and the Vercel Blob edge node so the next expo-video `useVideoPlayer`
 *  starts playback near-instantly instead of cold-fetching. Use this for
 *  lifestyle/pearl videos that the project explicitly does NOT want
 *  persisted to disk (see comment in `lifestyleVideoConfig.ts`).
 *
 *  Fire-and-forget — caller does not await. Multiple calls for the same URI
 *  are safe (the OS dedupes). 512KB ≈ ~3 sec of buffer at typical encoding. */
const streamingWarmupAttempted = new Set<string>();
export function prefetchStreamingVideo(uri: string | undefined): void {
  if (!uri) return;
  if (streamingWarmupAttempted.has(uri)) return;
  streamingWarmupAttempted.add(uri);
  fetch(uri, {
    method: 'GET',
    headers: { Range: 'bytes=0-524287' },
  }).catch(() => {
    // Network failure on warmup is non-fatal; the real player will retry
    // when it mounts. Don't even log — this is a best-effort optimization.
    streamingWarmupAttempted.delete(uri);
  });
}

export interface ModulePrefetchState {
  imagesReady: boolean;
  videosReady: boolean;
  audioReady: boolean;
}

export function useModulePrefetch(
  uris: readonly string[],
  videoUris: readonly string[] = [],
  audioUris: readonly string[] = [],
): ModulePrefetchState {
  const [imagesReady, setImagesReady] = useState(uris.length === 0);
  const [videosReady, setVideosReady] = useState(videoUris.length === 0);
  const [audioReady, setAudioReady] = useState(audioUris.length === 0);

  useEffect(() => {
    let cancelled = false;
    setImagesReady(uris.length === 0);
    setVideosReady(videoUris.length === 0);
    setAudioReady(audioUris.length === 0);

    if (uris.length > 0) {
      Promise.allSettled(uris.map((uri) => prefetchImageWithRetry(uri)))
        .finally(() => { if (!cancelled) setImagesReady(true); });
    }
    if (videoUris.length > 0) {
      Promise.allSettled(videoUris.map(prefetchVideo))
        .finally(() => { if (!cancelled) setVideosReady(true); });
    }
    if (audioUris.length > 0) {
      Promise.allSettled(audioUris.map(prefetchAudio))
        .finally(() => { if (!cancelled) setAudioReady(true); });
    }
    return () => { cancelled = true; };
  // All arrays are memoized by caller (keyed on mod.id).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris, videoUris, audioUris]);

  return { imagesReady, videosReady, audioReady };
}
