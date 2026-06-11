import { useEffect, useMemo } from 'react';
import { useModulePrefetch, prefetchStreamingVideo } from '../../hooks/useModulePrefetch';
import {
  MODULE_HERO_MAP,
  MODULE_INFOGRAPHIC_MAP,
  MODULE_POST_VIDEO_MAP,
} from '../chapter-1-content/moduleAssetMaps';
import type { Module } from '../chapter-1-content/types';

/**
 * Run the same prefetch (images + videos + audio → expo-image / file
 * cache) that `LessonFlowScreen` runs internally, BUT fire it earlier —
 * the moment the user expands a topic-tree accordion (Yoav R6 2026-06-10:
 * "מראש כדי לשפר את החווית משתמש, הטלפון יוריד את כל הקבצים"). By the
 * time the user taps a chip the heavyweight assets are already in cache.
 *
 * Idempotent: `useModulePrefetch` keeps a session-level cache, so a
 * second call for the same module is a no-op.
 */
export function useTopicTreeAssetPrefetch(module: Module): { imagesReady: boolean; audioReady: boolean } {
  const imageUris = useMemo<readonly string[]>(() => {
    const uris: string[] = [];
    const addUri = (src: unknown): void => {
      if (!src) return;
      if (typeof src === 'string') { uris.push(src); return; }
      if (typeof src === 'object') {
        const u = (src as Record<string, unknown>).uri;
        if (typeof u === 'string') uris.push(u);
      }
    };
    addUri(MODULE_HERO_MAP[module.id]);
    addUri(MODULE_INFOGRAPHIC_MAP[module.id]);
    for (const fc of module.flashcards ?? []) {
      addUri(fc.imageUrl);
      const meme = (fc as { memeImage?: { uri?: string } | number }).memeImage;
      if (meme && typeof meme === 'object' && typeof meme.uri === 'string') {
        addUri(meme.uri);
      }
    }
    return [...new Set(uris)];
  }, [module]);

  const videoUris = useMemo<readonly string[]>(() => {
    const videos: string[] = [];
    const hook = module.videoHookAsset as { uri?: string } | number | undefined;
    if (hook && typeof hook === 'object' && typeof hook.uri === 'string') videos.push(hook.uri);
    const post = MODULE_POST_VIDEO_MAP[module.id];
    if (typeof post === 'string') videos.push(post);
    const inter = (module as { interModuleVideoAsset?: { uri?: string } }).interModuleVideoAsset;
    if (inter && typeof inter === 'object' && typeof inter.uri === 'string') videos.push(inter.uri);
    for (const fc of module.flashcards ?? []) {
      if (typeof fc.videoUri === 'string') videos.push(fc.videoUri);
    }
    return [...new Set(videos)];
  }, [module]);

  const audioUris = useMemo<readonly string[]>(() => {
    const audio: string[] = [];
    if (module.introAudio?.uri) audio.push(module.introAudio.uri);
    const cd = (module as { coupleDilemma?: { videoUri?: string; narrationAudioUri?: string } }).coupleDilemma;
    if (cd?.videoUri) audio.push(cd.videoUri);
    if (cd?.narrationAudioUri) audio.push(cd.narrationAudioUri);
    // Podcast audio (when the module surfaces a podcast segment).
    const podcast = (module as { podcast?: { audioUri?: string } }).podcast;
    if (podcast?.audioUri) audio.push(podcast.audioUri);
    return [...new Set(audio)];
  }, [module]);

  // R6 fix (Yoav 2026-06-11): do NOT full-download videos on accordion
  // expand. That eager `downloadAsync` of every hook/post/flashcard mp4 for
  // 5 flagship modules drove a +505% `video_prefetch_failed` spike (transient
  // Vercel Blob 403s × many assets the user may never reach). Instead warm
  // only the first ~512KB via a Range request — primes the OS/edge cache for
  // near-instant playback, persists nothing, and logs no failures. The full
  // download still happens inside LessonFlowScreen once the user actually
  // enters the lesson (i.e. has committed to the content).
  useEffect(() => {
    for (const uri of videoUris) prefetchStreamingVideo(uri);
  }, [videoUris]);

  return useModulePrefetch(imageUris, [], audioUris);
}
