/**
 * Mind-map node → module-id sidecar.
 *
 * Path key format: ">"-joined ancestor names from the root's children downward
 * (root excluded). Example for chapter-0: "מהות הכסף" maps the level-1 branch
 * to mod-0-1; "מהות הכסף>אמצעי חליפין" would map a deeper sub-concept (only do
 * this if a sub-concept warrants its own module-completion overlay).
 *
 * Resolution rule: inline `moduleId` on a node in the JSON wins over the entry
 * here. This file is meant for content authors who'd rather edit TypeScript
 * than touch the JSON files directly.
 *
 * Canonical mind-map files live at `assets/mindmaps/chapter-N.json`. The
 * sibling `chapter-N-mindmap.json` files are empty stubs to be deleted.
 */

export type MindMapModuleMap = Readonly<Record<string, string>>;

/**
 * Path → moduleId per chapter id.
 * Chapter 0 is fully populated as a reference; chapters 1-5 await content.
 */
export const MIND_MAP_MODULE_MAP: Readonly<Record<string, MindMapModuleMap>> = {
  "chapter-0": {
    "מהות הכסף": "mod-0-1",
    "מושגי יסוד פיננסיים": "mod-0-2",
    "אינפלציה": "mod-0-3",
    "ניהול תזרים": "mod-0-4",
    "עקרונות ההשקעה": "mod-0-5",
  },
  "chapter-1": {
    // TODO content team: map level-1 branches to mod-1-X
  },
  "chapter-2": {
    // TODO content team: map level-1 branches to mod-2-X
  },
  "chapter-3": {
    // TODO content team: map level-1 branches to mod-3-X
  },
  "chapter-4": {
    // TODO content team: map level-1 branches to mod-4-X
  },
  "chapter-5": {
    // TODO content team: map level-1 branches to mod-5-X
  },
};