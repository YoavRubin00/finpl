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
// PostHog audit 2026-06-12: recoveries were nearly ZERO against ~180 http_403
// failures in 7 days (recovered_after_*: 11 total) — the 403 episodes outlive
// the old [1s,3s,9s] ladder. Lengthened + jittered so retries also stop
// synchronizing across the many assets of one module (a synchronized re-burst
// re-triggers the same rate-limit that caused the 403 in the first place).
const RETRY_DELAYS_MS = [2000, 8000, 20000] as const;
const RETRYABLE_HTTP_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ±30% jitter so parallel failures don't retry in lock-step. */
function jittered(ms: number): number {
  return Math.round(ms * (0.7 + Math.random() * 0.6));
}

// ───────────────────────────── Download concurrency gate
// PostHog audit 2026-06-12: opening a topic-tree accordion fired EVERY module
// asset (hero + infographic + all flashcard images/memes + intro audio +
// podcast + video warmups) through Promise.allSettled — 15-20 simultaneous
// requests from one device IP. Vercel Blob's rate-limiting/WAF answers such
// bursts with a SUSTAINED per-client http_403 (same URLs serve 200 to curl
// elsewhere), which then breaks intro audio, videos, and images for that
// session ("פשוט לא מצליח לקבל את האודיו", "גם הוידאואים לא נטענים").
// Cap concurrent downloads at 3; slots are held only for the network attempt
// itself (released during retry backoff). Queue is FIFO, so callers control
// priority by enqueue order (audio first — see useModulePrefetch).
const MAX_CONCURRENT_FETCHES = 3;
let activeFetches = 0;
const fetchWaiters: Array<() => void> = [];
function acquireFetchSlot(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_FETCHES) {
    activeFetches += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    fetchWaiters.push(() => { activeFetches += 1; resolve(); });
  });
}
function releaseFetchSlot(): void {
  activeFetches -= 1;
  const next = fetchWaiters.shift();
  if (next) next();
}
async function withFetchSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquireFetchSlot();
  try {
    return await fn();
  } finally {
    releaseFetchSlot();
  }
}

// ───────────────────────────── Per-URI de-duplication + failure cooldown
// PostHog 2026-06-13: one user emitted 85 `audio_prefetch_failed` events for a
// SINGLE asset in 2.7s (~31/sec) — impossible from the retry ladder alone,
// which emits at most once per ~30s per call. Root cause: a re-rendering caller
// (topic-tree accordion / intro effect) invoked prefetch* repeatedly for the
// same URI with NO de-dup, so every render spun a fresh retry loop and its own
// final failure event. 1.3.2 (pre-pool) never looped — this is a regression
// that rode in with the eager prefetch.
//   • In-flight dedup: concurrent calls for the same URI share ONE loop/event.
//   • Failure cooldown: after a FINAL failure, ignore re-requests for a short
//     window so a 403'ing host isn't re-burst — the re-burst itself sustains
//     Vercel Blob's per-client rate-limit (see the concurrency-gate note).
// Successful downloads are already deduped by the on-disk cache (the
// getInfoAsync short-circuit at the top of each runPrefetch*).
const FAILURE_COOLDOWN_MS = 60_000;
const inFlightVideo = new Map<string, Promise<void>>();
const inFlightAudio = new Map<string, Promise<void>>();
const inFlightImage = new Map<string, Promise<void>>();
const videoFailedAt = new Map<string, number>();
const audioFailedAt = new Map<string, number>();
const imageFailedAt = new Map<string, number>();

/** Collapse repeat calls for one URI onto a single run; suppress re-runs for
 *  FAILURE_COOLDOWN_MS after a final failure. `run` resolves true on
 *  success/cache-hit, false on final failure (it logs its own outcome). */
function dedupGuard(
  inFlight: Map<string, Promise<void>>,
  failedAt: Map<string, number>,
  uri: string,
  run: () => Promise<boolean>,
): Promise<void> {
  const existing = inFlight.get(uri);
  if (existing) return existing;
  const failed = failedAt.get(uri);
  if (failed !== undefined && Date.now() - failed < FAILURE_COOLDOWN_MS) {
    return Promise.resolve();
  }
  const task = run()
    .then((ok) => { if (ok) failedAt.delete(uri); else failedAt.set(uri, Date.now()); })
    .catch(() => { failedAt.set(uri, Date.now()); })
    .finally(() => { inFlight.delete(uri); });
  inFlight.set(uri, task);
  return task;
}

async function runPrefetchVideo(uri: string): Promise<boolean> {
  const filename = uri.split("/").pop() || "video.mp4";
  const localPath = VIDEO_CACHE_DIR + filename;
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 1000) {
      videoCache.set(uri, localPath);
      return true;
    }
    await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true }).catch(() => {});
  } catch {/* fall through to download attempt */}

  let lastReason: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await withFetchSlot(() => FileSystem.downloadAsync(uri, localPath));
      // 206 = Partial Content (a resumed download returns the remaining bytes);
      // it's a success, not a failure. Treating it as one logged spurious
      // `*_prefetch_failed` with reason http_206 (PostHog 2026-06-13).
      if (result.status === 200 || result.status === 206) {
        videoCache.set(uri, localPath);
        if (attempt > 0) {
          // A retry that SUCCEEDS is a recovery, not a failure. Logging it
          // under `video_prefetch_failed` inflated the failure dashboards
          // (Yoav 2026-06-11: +505% spike was mostly transient-then-recovered
          // Vercel Blob 403s from the new eager topic-tree prefetch). Use a
          // distinct event so genuine final failures stay legible.
          captureEvent('video_prefetch_recovered', {
            video_key: videoKeyFromUri(uri),
            platform: Platform.OS,
            reason: `recovered_after_${attempt}_retries`,
          });
        }
        return true;
      }
      lastReason = `http_${result.status}`;
      if (!RETRYABLE_HTTP_STATUSES.has(result.status)) break;
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(jittered(RETRY_DELAYS_MS[attempt]));
    }
  }
  captureEvent('video_prefetch_failed', {
    video_key: videoKeyFromUri(uri),
    platform: Platform.OS,
    reason: lastReason ?? 'unknown',
  });
  return false;
}

// expo-file-system downloadAsync doesn't exist on web — the call itself throws,
// producing hundreds of noisy *_prefetch_failed events (PostHog 2026-06-12:
// 254 video + 130 audio from 2 web users). Web streams straight from the CDN
// anyway, so prefetch is a no-op there. De-duped per URI (see dedupGuard).
function prefetchVideo(uri: string): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return dedupGuard(inFlightVideo, videoFailedAt, uri, () => runPrefetchVideo(uri));
}

// ExpoImage.prefetch returns Promise<boolean | undefined> (`true` on cache
// hit, `false` on failure) — no HTTP status. Mirror the audio/video retry
// shape: try a few times with exponential backoff, then log the final
// outcome. Both `false` resolutions and thrown errors count as failures.
async function runPrefetchImage(uri: string): Promise<boolean> {
  let lastReason: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const ok = await withFetchSlot(() => ExpoImage.prefetch(uri));
      if (ok !== false) {
        if (attempt > 0) {
          // Recovery, not failure — see video note above.
          captureEvent('image_prefetch_recovered', {
            uri,
            file_key: uri.split('/').slice(-2).join('/'),
            platform: Platform.OS,
            reason: `recovered_after_${attempt}_retries`,
          });
        }
        return true;
      }
      lastReason = 'prefetch_returned_false';
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(jittered(RETRY_DELAYS_MS[attempt]));
    }
  }
  captureEvent('image_prefetch_failed', {
    uri,
    file_key: uri.split('/').slice(-2).join('/'),
    platform: Platform.OS,
    reason: lastReason ?? 'unknown',
  });
  return false;
}

// De-duped per URI (see dedupGuard) — the topic-tree accordion can re-render
// and re-request the same flashcard images many times per second (PostHog
// 2026-06-12: image_prefetch_failed was concentrated in a handful of users).
function prefetchImageWithRetry(uri: string): Promise<void> {
  return dedupGuard(inFlightImage, imageFailedAt, uri, () => runPrefetchImage(uri));
}

async function runPrefetchAudio(uri: string): Promise<boolean> {
  const filename = uri.split("/").pop() || "audio.mp3";
  const localPath = AUDIO_CACHE_DIR + filename;
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 1000) {
      audioCache.set(uri, localPath);
      return true;
    }
    await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true }).catch(() => {});
  } catch {/* fall through to download attempt */}

  let lastReason: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await withFetchSlot(() => FileSystem.downloadAsync(uri, localPath));
      // 206 = success (resumed/partial GET that returns the body) — see runPrefetchVideo.
      if (result.status === 200 || result.status === 206) {
        audioCache.set(uri, localPath);
        if (attempt > 0) {
          // Recovery, not failure — see video note above.
          captureEvent('audio_prefetch_recovered', {
            audio_key: audioKeyFromUri(uri),
            platform: Platform.OS,
            reason: `recovered_after_${attempt}_retries`,
          });
        }
        return true;
      }
      lastReason = `http_${result.status}`;
      if (!RETRYABLE_HTTP_STATUSES.has(result.status)) break;
    } catch (err) {
      lastReason = err instanceof Error ? err.message : 'unknown';
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(jittered(RETRY_DELAYS_MS[attempt]));
    }
  }
  captureEvent('audio_prefetch_failed', {
    audio_key: audioKeyFromUri(uri),
    platform: Platform.OS,
    reason: lastReason ?? 'unknown',
  });
  return false;
}

// downloadAsync is unavailable on web — see prefetchVideo note. De-duped per
// URI so a re-rendering caller can't spin parallel retry loops for one file
// (PostHog 2026-06-13: 85 failures on one asset in 2.7s from a single user).
function prefetchAudio(uri: string): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return dedupGuard(inFlightAudio, audioFailedAt, uri, () => runPrefetchAudio(uri));
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
  // Routed through the same download pool as full prefetches — an accordion
  // expand fires one warmup per video, and unthrottled they stack onto the
  // image/audio burst that trips Vercel Blob's per-client rate limit.
  withFetchSlot(() =>
    fetch(uri, {
      method: 'GET',
      headers: { Range: 'bytes=0-524287' },
    }),
  ).catch(() => {
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

    // AUDIO FIRST: the download pool (withFetchSlot) is FIFO, so enqueue
    // order = priority. The intro narration is the first asset the user
    // actually consumes (the intro card is already on screen waiting for
    // it), while images/videos can trickle in behind. PostHog 2026-06-12:
    // 972 intro_audio_delayed events — audio was losing the bandwidth race
    // against a dozen flashcard images fired in the same burst.
    if (audioUris.length > 0) {
      Promise.allSettled(audioUris.map(prefetchAudio))
        .finally(() => { if (!cancelled) setAudioReady(true); });
    }
    if (uris.length > 0) {
      Promise.allSettled(uris.map((uri) => prefetchImageWithRetry(uri)))
        .finally(() => { if (!cancelled) setImagesReady(true); });
    }
    if (videoUris.length > 0) {
      Promise.allSettled(videoUris.map(prefetchVideo))
        .finally(() => { if (!cancelled) setVideosReady(true); });
    }
    return () => { cancelled = true; };
  // All arrays are memoized by caller (keyed on mod.id).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris, videoUris, audioUris]);

  return { imagesReady, videosReady, audioReady };
}
