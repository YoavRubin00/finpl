import type { InterModuleVideo } from "./types";

const BENBEN_CDN = "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/benben";

/** 12 BENBEN creator videos, streamed from Vercel Blob CDN. */
export const BENBEN_VIDEOS: InterModuleVideo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `benben-${i + 1}`,
  uri: `${BENBEN_CDN}/benben-${i + 1}.mp4`,
  durationMinutes: 1,
}));

/** Short-form micro-learning videos, streamed from Vercel Blob CDN. */
export const MICRO_LEARN_VIDEOS: InterModuleVideo[] = [
  {
    id: "ml-reach-people",
    uri: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/microlearn/reach-people-nrGwo70N9aS61srMhizpuDmoT55Htu.mp4",
    durationMinutes: 1,
  },
  {
    id: "ml-ribit-darbit",
    uri: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/microlearn/ribit-darbit.mp4",
    durationMinutes: 1,
    moduleId: "mod-1-1",
    moduleIndex: 0,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
];
