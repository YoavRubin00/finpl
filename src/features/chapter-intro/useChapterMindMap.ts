/**
 * useChapterMindMap — loads the canonical mind-map JSON for a chapter,
 * derives completed + locked module-id sets, and exposes the sidecar overlay.
 *
 * Canonical JSON: `assets/mindmaps/chapter-N.json`. The sibling
 * `chapter-N-mindmap.json` files are empty stubs and intentionally not loaded.
 */
import { useMemo } from 'react';
import { useChapterStore } from '../chapter-1-content/useChapterStore';
import type { Chapter } from '../chapter-1-content/types';
import { isModuleAccessible } from '../subscription/moduleAccess';
import { chapter0Data } from '../chapter-0-content/chapter0Data';
import { chapter1Data } from '../chapter-1-content/chapter1Data';
import { chapter2Data } from '../chapter-2-content/chapter2Data';
import { chapter3Data } from '../chapter-3-content/chapter3Data';
import { chapter4Data } from '../chapter-4-content/chapter4Data';
import { chapter5Data } from '../chapter-5-content/chapter5Data';
import { MIND_MAP_MODULE_MAP, type MindMapModuleMap } from './mindMapModuleMap';
import type { MindMapNode } from '../../components/ui/MindMapTree';

/* Static maps — populated at module load. JSON files are bundled by Metro. */

const MIND_MAP_DATA: Readonly<Record<string, MindMapNode>> = {
  'chapter-0': require('../../../assets/mindmaps/chapter-0.json') as MindMapNode,
  'chapter-1': require('../../../assets/mindmaps/chapter-1.json') as MindMapNode,
  'chapter-2': require('../../../assets/mindmaps/chapter-2.json') as MindMapNode,
  'chapter-3': require('../../../assets/mindmaps/chapter-3.json') as MindMapNode,
  'chapter-4': require('../../../assets/mindmaps/chapter-4.json') as MindMapNode,
  'chapter-5': require('../../../assets/mindmaps/chapter-5.json') as MindMapNode,
};

const CHAPTERS: Readonly<Record<string, Chapter>> = {
  'chapter-0': chapter0Data as unknown as Chapter,
  'chapter-1': chapter1Data,
  'chapter-2': chapter2Data,
  'chapter-3': chapter3Data,
  'chapter-4': chapter4Data,
  'chapter-5': chapter5Data,
};

const EMPTY_PATH_MAP: MindMapModuleMap = {};

function chapterStoreKey(chapterId: string): string {
  return `ch-${chapterId.split('-')[1]}`;
}

export interface UseChapterMindMapResult {
  root: MindMapNode | null;
  chapter: Chapter | null;
  completedModuleIds: ReadonlySet<string>;
  lockedModuleIds: ReadonlySet<string>;
  moduleIdByPath: MindMapModuleMap;
}

export function useChapterMindMap(chapterId: string): UseChapterMindMapResult {
  const progress = useChapterStore((s) => s.progress);

  const root = MIND_MAP_DATA[chapterId] ?? null;
  const chapter = CHAPTERS[chapterId] ?? null;
  const moduleIdByPath = MIND_MAP_MODULE_MAP[chapterId] ?? EMPTY_PATH_MAP;

  const completedModuleIds = useMemo<ReadonlySet<string>>(() => {
    const ids = progress[chapterStoreKey(chapterId)]?.completedModules ?? [];
    return new Set(ids);
  }, [progress, chapterId]);

  const lockedModuleIds = useMemo<ReadonlySet<string>>(() => {
    if (!chapter) return new Set();
    const locked = new Set<string>();
    for (const m of chapter.modules) {
      if (m.comingSoon) continue;
      if (!isModuleAccessible(m.id, chapter.id)) locked.add(m.id);
    }
    return locked;
    // chapter is stable; re-eval when progress changes (isModuleAccessible reads it)
  }, [chapter, progress]);

  return { root, chapter, completedModuleIds, lockedModuleIds, moduleIdByPath };
}
