import type { EnemyKind, TowerKind } from "./types";

const CDN = "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com";

// Enemies served from CDN (heavy PNGs, game-only use).
// Towers & vault use local Lottie animations for crisp, scaling-friendly visuals.
export const TD_ASSETS = {
  vaultLottie: require("../../../assets/lottie/3D Treasure Box.json"),
  enemies: {
    mechanic: { uri: `${CDN}/images/games/tower-defense/enemy_mechanic.png` },
    tax: { uri: `${CDN}/images/games/tower-defense/enemy_tax.png` },
    wedding: { uri: `${CDN}/images/games/tower-defense/enemy_wedding.png` },
    shopping: { uri: `${CDN}/images/games/tower-defense/enemy_shopping.png` },
  } satisfies Record<EnemyKind, { uri: string }>,
  towerLottie: {
    emergency_fund: require("../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json"),
    insurance: require("../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json"),
    auto_budget: require("../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json"),
  } satisfies Record<TowerKind, ReturnType<typeof require>>,
} as const;
