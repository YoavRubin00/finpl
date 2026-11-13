import { Redirect } from "expo-router";
import { LivingVisualGallery } from "../src/features/living-lesson/LivingVisualGallery";

/**
 * Development only: /dev-living-visuals lists every living diagram of the
 * lessons, to check them on a device. In a production build the route
 * leads back to the map.
 */
export default function DevLivingVisualsRoute() {
  if (!__DEV__) return <Redirect href="/(tabs)" />;
  return <LivingVisualGallery />;
}
