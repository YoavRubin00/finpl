const CDN = "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com";

// CDN-served assets (heavy PNGs, game-only use).
// Use with expo-image: <ExpoImage source={DH_ASSETS.hodlButton} ... />
export const DH_ASSETS = {
  hodlButton: { uri: `${CDN}/images/games/diamond-hands/hodl_button_gold.png` },
  diamondPristine: { uri: `${CDN}/images/games/diamond-hands/diamond_pristine.png` },
  diamondCracking: { uri: `${CDN}/images/games/diamond-hands/diamond_cracking.png` },
} as const;
