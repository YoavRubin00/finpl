import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { captureEvent } from "../lib/posthog";

const videoCache = new Map<string, string>();
const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}module-videos/`;

// Returns a cached local file URI if the remote mp4 has been downloaded,
// otherwise returns the original remote URI unchanged so playback still works.
export function getCachedVideoPath(remoteUri: string): string {
  return videoCache.get(remoteUri) ?? remoteUri;
}

function videoKeyFromUri(uri: string): string {
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

export interface ModulePrefetchState {
  imagesReady: boolean;
  videosReady: boolean;
}

export function useModulePrefetch(
  uris: readonly string[],
  videoUris: readonly string[] = [],
): ModulePrefetchState {
  const [imagesReady, setImagesReady] = useState(uris.length === 0);
  const [videosReady, setVideosReady] = useState(videoUris.length === 0);

  useEffect(() => {
    let cancelled = false;
    setImagesReady(uris.length === 0);
    setVideosReady(videoUris.length === 0);

    if (uris.length > 0) {
      Promise.allSettled(uris.map((uri) => ExpoImage.prefetch(uri)))
        .finally(() => { if (!cancelled) setImagesReady(true); });
    }
    if (videoUris.length > 0) {
      Promise.allSettled(videoUris.map(prefetchVideo))
        .finally(() => { if (!cancelled) setVideosReady(true); });
    }
    return () => { cancelled = true; };
  // Both arrays are memoized by caller (keyed on mod.id).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris, videoUris]);

  return { imagesReady, videosReady };
}
