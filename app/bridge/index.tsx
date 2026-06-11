import { BridgeScreen } from "../../src/features/the-bridge/BridgeScreen";
import { useTutorialStore } from "../../src/stores/useTutorialStore";

// Yoav 2026-06-11: the first-visit welcome card with the "לחץ בכל מקום
// להמשך" tap hint was removed — it flashed at the end of the walkthrough
// (after step 7 / "הגשר") before the post-walkthrough route to /(tabs)
// landed, and read as a stray dead-end prompt. The walkthrough step
// already introduces the bridge content; nothing to add here.
export default function BridgePage() {
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const isWalkthrough = !hasSeenWalkthrough;
  return <BridgeScreen walkthroughAutoScroll={isWalkthrough} />;
}
