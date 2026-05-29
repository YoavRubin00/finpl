import * as FileSystem from 'expo-file-system/legacy';
import {
  manipulateAsync,
  SaveFormat,
  type ImageResult,
} from 'expo-image-manipulator';
import type { ChosenFile } from '../types';

const TARGET_WIDTH = 1600;
const SKIP_IF_BYTES_BELOW = 1.5 * 1024 * 1024;

export interface PreprocessedImage {
  uri: string;
  byteSize: number;
}

async function readSize(uri: string, fallback: number): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number' && info.size > 0) {
      return info.size;
    }
  } catch {
    // fall through
  }
  return fallback;
}

export async function preprocessImage(
  file: ChosenFile,
): Promise<PreprocessedImage> {
  if (file.mimeType === 'application/pdf') {
    return { uri: file.uri, byteSize: file.byteSize };
  }

  let width: number | undefined;
  let height: number | undefined;
  try {
    const measured = await manipulateAsync(file.uri, [], {
      compress: 1,
      format: SaveFormat.JPEG,
    });
    width = measured.width;
    height = measured.height;
  } catch {
    width = undefined;
    height = undefined;
  }

  // Source must already be JPEG to skip the re-encode — callers relabel the
  // result as `image/jpeg` unconditionally, so a PNG/WebP/HEIC that takes
  // this fast-path would ship declared-JPEG with non-JPEG bytes and get
  // rejected by the server's magic-bytes check.
  const isAlreadySmall =
    file.mimeType === 'image/jpeg' &&
    typeof width === 'number' &&
    width <= TARGET_WIDTH &&
    file.byteSize > 0 &&
    file.byteSize < SKIP_IF_BYTES_BELOW;

  if (isAlreadySmall) {
    return { uri: file.uri, byteSize: file.byteSize };
  }

  const shouldResize =
    typeof width === 'number' && width > TARGET_WIDTH ? true : false;

  const result: ImageResult = await manipulateAsync(
    file.uri,
    shouldResize ? [{ resize: { width: TARGET_WIDTH } }] : [],
    {
      compress: 0.85,
      format: SaveFormat.JPEG,
    },
  );

  const byteSize = await readSize(result.uri, file.byteSize);
  // Suppress unused-height warning while keeping the read for future tuning.
  void height;
  return { uri: result.uri, byteSize };
}
