import type { Topic } from './types';
import { TOPIC_ICONS } from './topic-icons';

/**
 * Per-module "tool" chip — a bonus CTA appended to the END of a module's
 * topic-tree accordion that deep-links into a full financial TOOL (not a
 * learning phase). It is NOT a learning topic: it is excluded from the
 * completion math (the 70% chest), never marked "done", and only REVEALED once
 * the user crosses `revealPct` of the module (Yoav 2026-06-19: "ציפ של נתח
 * תלוש שכר ... שיופיע ב-60 אחוז"). Add-only — register a module here to surface
 * its tool chip.
 */
export interface ModuleTool {
  /** expo-router route the chip pushes to (e.g. '/payslip-analyzer'). */
  route: string;
  /** Hebrew chip label — used for accessibility (chips are icon-only visually)
   *  and overrides the generic TOPIC_LABELS['tool']. */
  titleHe: string;
  /** Module-completion % (0-100) at/above which the chip appears. */
  revealPct: number;
}

const MODULE_TOOL: Record<string, ModuleTool> = {
  // "לקרוא תלוש שכר" → after 60% the live "נתח תלוש שכר" analyzer surfaces at
  // the end of the accordion, just before the 70% chest.
  'mod-1-5': { route: '/payslip-analyzer', titleHe: 'נתח תלוש שכר', revealPct: 60 },
};

export function getModuleTool(moduleId: string): ModuleTool | null {
  return MODULE_TOOL[moduleId] ?? null;
}

/**
 * Build the display-only Topic for a module's tool chip (id `${moduleId}:tool`).
 * `defaultOrder` is forced high so it always sorts LAST in the accordion. This
 * topic is for RENDERING only — never pass it to the completion summary.
 */
export function buildToolTopic(moduleId: string, tool: ModuleTool): Topic {
  return {
    id: `${moduleId}:tool`,
    moduleId,
    kind: 'tool',
    titleHe: tool.titleHe,
    iconAsset: TOPIC_ICONS.tool,
    defaultOrder: 999,
  };
}
