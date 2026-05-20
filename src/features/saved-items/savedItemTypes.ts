export interface SavedItem {
  id: string;
  type: "lesson" | "sim";
  title: string;
  chapterId?: number;
  moduleId?: string;
  savedAt: string; // ISO date string
}

export type AddSavedResult =
  | { ok: true }
  | { ok: false; reason: "cap" | "duplicate" };

export const MAX_SAVED_ITEMS = 50;
