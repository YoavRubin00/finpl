/**
 * Preserved content types previously displayed in FinFeed.
 * Reserved for future wiring into inter-module breaks.
 */
export interface InterModuleVideo {
  id: string;
  uri: string;
  durationMinutes: number;
  moduleId?: string;
  moduleIndex?: number;
  chapterId?: string;
  storeChapterId?: string;
}
