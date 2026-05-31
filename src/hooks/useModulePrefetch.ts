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

async function prefetchVideo(uri: string): Promise<void> {
  try {
    const filename = uri.split("/").pop() || "video.mp4";
    const localPath = VIDEO_CACHE_DIR + filename;
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 1000) {
      videoCache.set(uri, localPath);
      return;
    }
    await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true }).catch(() => {});
    const result = await FileSystem.downloadAsync(uri, localPath);
    if (result.status === 200) {
      videoCache.set(uri, localPath);
    } else {
      // Non-200 status — log but keep streaming fallback.
      captureEvent('video_prefetch_failed', {
        video_key: videoKeyFromUri(uri),
        platform: Platform.OS,
        reason: `http_${result.status}`,
      });
    }
  } catch (err) {
    // Network/IO failure — log so we can quantify how often prefetch fails
    // (silent fall-through to streaming hides this from telemetry).
    captureEvent('video_prefetch_failed', {
      video_key: videoKeyFromUri(uri),
      platform: Platform.OS,
      reason: err instanceof Error ? err.message : 'unknown',
    });
  }
}

async function prefetchAudio(uri: string): Promise<void> {
  try {
    const filename = uri.split("/").pop() || "audio.mp3";
    const localPath = AUDIO_CACHE_DIR + filename;
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 1000) {
      audioCache.set(uri, localPath);
      return;
    }
    await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true }).catch(() => {});
    const result = await FileSystem.downloadAsync(uri, localPath);
    if (result.status === 200) {
      audioCache.set(uri, localPath);
    } else {
      captureEvent('audio_prefetch_failed', {
        audio_key: audioKeyFromUri(uri),
        platform: Platform.OS,
        reason: `http_${result.status}`,
      });
    }
  } catch (err) {
    captureEvent('audio_prefetch_failed', {
      audio_key: audioKeyFromUri(uri),
      platform: Platform.OS,
      reason: err instanceof Error ? err.message : 'unknown',
    });
  }
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
      Promise.allSettled(uris.map((uri) => ExpoImage.prefetch(uri)))
        .then((results) => {
          // אנליטיקס לכשלים. בלי זה אנחנו עיוורים — משתמשים מדווחים על
          // placeholders אפורים אבל לא יודעים אילו URLs נכשלו.
          results.forEach((r, i) => {
            if (r.status === 'rejected') {
              const uri = uris[i];
              captureEvent('image_prefetch_failed', {
                uri,
                file_key: uri.split('/').slice(-2).join('/'),
                platform: Platform.OS,
                reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
              });
            }
          });
        })
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
