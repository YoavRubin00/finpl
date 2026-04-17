// Local assets with transparent backgrounds (re-processed from blob CDN originals via ffmpeg colorkey)
// Use with expo-image: <ExpoImage source={DH_ASSETS.hodlButton} ... />
export const DH_ASSETS = {
  hodlButton: require("../../../assets/IMAGES/diamond-hands/hodl_button_gold.png"),
  diamondPristine: require("../../../assets/IMAGES/diamond-hands/diamond_pristine.png"),
  diamondCracking: require("../../../assets/IMAGES/diamond-hands/diamond_cracking.png"),
} as const;
