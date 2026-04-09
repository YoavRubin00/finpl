import { View, Dimensions } from "react-native";
import LottieView from "lottie-react-native";

const SCREEN_W = Dimensions.get("window").width;

// Sea-themed Lottie decorations
const DECORATION_SOURCES = [
  require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json"),
  require("../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json"),
  require("../../../assets/lottie/wired-flat-400-bookmark-hover-flutter.json"),
];

// Deterministic pseudo-random based on seed
function seededValue(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface PathDecorationsProps {
  chapterIndex: number;
  moduleCount: number;
}

export function PathDecorations({ chapterIndex, moduleCount }: PathDecorationsProps) {
  // 2 decorations per chapter, positioned between modules
  const count = Math.min(2, Math.floor(moduleCount / 3));
  if (count === 0) return null;

  const items = Array.from({ length: count }, (_, i) => {
    const seed = chapterIndex * 1000 + i * 7;
    const isLeft = i % 2 === 0;
    const yOffset = Math.floor(seededValue(seed) * (moduleCount - 2) + 1) * 114; // ROW_HEIGHT = 114
    const xPos = isLeft ? 8 + seededValue(seed + 1) * 20 : SCREEN_W - 48 - seededValue(seed + 2) * 20;
    const size = 24 + Math.floor(seededValue(seed + 3) * 8);
    const sourceIdx = Math.floor(seededValue(seed + 4) * DECORATION_SOURCES.length);

    return { key: `deco-${chapterIndex}-${i}`, yOffset, xPos, size, sourceIdx };
  });

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {items.map((item) => (
        <View
          key={item.key}
          style={{
            position: "absolute",
            top: item.yOffset,
            left: item.xPos,
            opacity: 0.14,
          }}
        >
          <LottieView
            source={DECORATION_SOURCES[item.sourceIdx]}
            style={{ width: item.size, height: item.size }}
            autoPlay
            loop
            speed={0.4}
          />
        </View>
      ))}
    </View>
  );
}
