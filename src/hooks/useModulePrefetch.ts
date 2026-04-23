import { useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";

const videoCache = new Map<string, string>();
const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory ?? ""}module-videos/`;

// Returns a cached local file URI if the remote mp4 has been downloaded,
// otherwise returns the original remote URI unchanged so playback still works.
export function getCachedVideoPath(remoteUri: string): string {
  return videoCache.get(remoteUri) ?? remoteUri;
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
    if (result.status === 200) videoCache.set(uri, localPath);
  } catch {
    // Silent fail — video will be streamed from the remote URI.
  }
}

export function useModulePrefetch(
  uris: readonly string[],
  videoUris: readonly string[] = [],
): void {
  useEffect(() => {
    if (uris.length > 0) {
      Promise.allSettled(uris.map((uri) => ExpoImage.prefetch(uri))).catch(() => {});
    }
    if (videoUris.length > 0) {
      Promise.allSettled(videoUris.map(prefetchVideo)).catch(() => {});
    }
  // Both arrays are memoized by caller (keyed on mod.id).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris, videoUris]);
}
