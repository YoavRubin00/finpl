import type { ImageSourcePropType } from "react-native";

/**
 * Premium Learning module — a deep-dive infographic carousel with
 * Finn audio narration, dive-zoom regions, or tap zones. Surfaced as a
 * phase inside LessonFlowScreen for modules that have one configured.
 */
export interface PremiumLearningModule {
  id: string;
  type: "premium-learning";
  moduleId: string;
  moduleIndex: number;
  chapterId: string;
  storeChapterId: string;
  moduleTitle: string;
  /** Ordered carousel images, or a single image when diveMode/tapZones/singlePageView is set */
  infographics: ImageSourcePropType[];
  /** Step-by-step explanation text from Finn, one entry per step */
  finnExplanations?: string[];
  /** Dive mode: use single image with zoomRegions instead of multiple images */
  diveMode?: boolean;
  /** [translateX, translateY, scale] per step when diveMode is on */
  zoomRegions?: [number, number, number][];
  /** Tap zones mode: full-screen image, tap areas for popup explanations */
  tapZones?: boolean;
  tapZonesLayout?: "left-right" | "top-bottom";
  tapZoneLeft?: { title: string; text: string };
  tapZoneRight?: { title: string; text: string };
  tapZoneTop?: { title: string; text: string };
  tapZoneBottom?: { title: string; text: string };
  /** Single page view: image + finn text + CTA, no carousel */
  singlePageView?: boolean;
  /** Step index at which the finn audio should auto-play */
  finnAudioIndex?: number;
  finnAudioUrl?: string;
}
