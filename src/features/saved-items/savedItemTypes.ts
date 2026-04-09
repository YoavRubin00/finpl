export interface SavedItem {
  id: string;
  type: "lesson" | "sim" | "feed";
  title: string;
  chapterId?: number;
  moduleId?: string;
  feedItemId?: string;
  savedAt: string; // ISO date string
}
