import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { ImageLoadEventData } from "expo-image";
import type { FlashcardVisual } from "../../chapter-1-content/types";
import { INFOGRAPHIC_MAP } from "../../chapter-1-content/FlashcardInfographic";
import { VisualFrame } from "./VisualFrame";
import { LL_COLORS } from "../tokens";

type ImageVisualData = Extract<FlashcardVisual, { kind: "image" }>;

interface Props {
  visual: ImageVisualData;
  animate: boolean;
}

/**
 * A TEXT-FREE illustration from the retired infographic set, riding inside a
 * living-lesson segment (Yoav 1.8: image-only art comes back into the cards;
 * PNGs with baked-in text stay out). Source resolves through INFOGRAPHIC_MAP,
 * so the /api/img proxying and expo-image caching that already protect these
 * URLs keep applying. If the id is unknown or the image fails, the frame
 * simply doesn't render — an illustration must never block a lesson.
 */
export function ImageVisual({ visual }: Props) {
  const source = INFOGRAPHIC_MAP[visual.infographicCardId] ?? null;
  const [ratio, setRatio] = useState(1.2);
  const [failed, setFailed] = useState(false);

  if (!source || failed) return null;

  return (
    <VisualFrame caption={visual.caption} minHeight={140}>
      <View style={styles.box}>
        <ExpoImage
          source={source}
          style={[styles.image, { aspectRatio: ratio }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={180}
          accessible={false}
          onLoad={(e: ImageLoadEventData) => {
            const { width, height } = e.source;
            if (width && height) setRatio(width / height);
          }}
          onError={() => setFailed(true)}
        />
      </View>
    </VisualFrame>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "100%",
    alignItems: "center",
    backgroundColor: LL_COLORS.bgPanel,
  },
  image: {
    width: "100%",
    maxHeight: 240,
  },
});
