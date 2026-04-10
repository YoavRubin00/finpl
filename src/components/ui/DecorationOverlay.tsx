import { StyleSheet, View } from 'react-native';
import { LottieIcon } from './LottieIcon';

// Sea creature decoration Lottie files
const DECORATION_SOURCES: number[] = [
  require('../../../assets/lottie/sea/wired-flat-522-fish-hover-pinch.json') as number,
  require('../../../assets/lottie/sea/wired-flat-1175-dolphin-hover-pinch.json') as number,
  require('../../../assets/lottie/sea/wired-flat-1166-seahorse-hover-pinch.json') as number,
  require('../../../assets/lottie/sea/wired-flat-1167-coral-hover-pinch.json') as number,
  require('../../../assets/lottie/sea/wired-flat-1168-star-fish-hover-pinch.json') as number,
];

// Stable positions seeded by screenName — no randomness at render time
const POSITIONS = [
  { top: '6%',  start: '4%'  },
  { top: '22%', end: '6%' },
  { top: '40%', left: '2%'  },
  { top: '58%', end: '3%' },
  { top: '75%', left: '5%'  },
  { top: '90%', right: '7%' },
] as const;

function seededIndex(seed: number, max: number): number {
  // Simple deterministic hash
  return ((seed * 2654435761) >>> 0) % max;
}

function nameToSeed(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (Math.imul(31, hash) + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface DecorationOverlayProps {
  screenName: string;
  count?: number;
  opacity?: number;
  /** When false, all decoration animations are paused. Default true. */
  active?: boolean;
}

export function DecorationOverlay({
  screenName,
  count = 4,
  opacity = 0.10,
  active = true,
}: DecorationOverlayProps) {
  const seed = nameToSeed(screenName);
  const clampedCount = Math.min(count, POSITIONS.length);

  const decorations = Array.from({ length: clampedCount }, (_, i) => {
    const sourceIndex = seededIndex(seed + i * 7, DECORATION_SOURCES.length);
    const position = POSITIONS[i];
    const size = 20 + seededIndex(seed + i * 13, 10); // 20-29px
    return { source: DECORATION_SOURCES[sourceIndex], position, size };
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {decorations.map((d, i) => (
        <View key={i} style={[styles.item, d.position, { opacity }]}>
          <LottieIcon source={d.source} size={d.size} autoPlay loop speed={0.6} active={active} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  item: {
    position: 'absolute',
  },
});
