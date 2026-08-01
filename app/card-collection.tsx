import React from "react";
import { CollectionScreen } from "../src/features/card-collection/CollectionScreen";

/**
 * /card-collection — אוסף חפיסות הכרטיסיות (Yoav 1.8.26). Reached from the
 * profile's collection card. NOTE: the route name is whitelisted in
 * app/_layout.tsx's inContentRoute list — without it the auth/onboarding
 * guard bounces back to /(tabs) right after mount (the investors-journal
 * lesson, 2026-07-04).
 */
export default function CardCollectionPage(): React.ReactElement {
  return <CollectionScreen />;
}
