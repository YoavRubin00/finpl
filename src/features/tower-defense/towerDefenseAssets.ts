import type { EnemyKind, TowerKind } from "./types";

// Local assets with transparent backgrounds.
// Towers & vault use Lottie animations for crisp, scaling-friendly visuals.
export const TD_ASSETS = {
  vaultLottie: require("../../../assets/lottie/3D Treasure Box.json"),
  enemies: {
    mechanic: require("../../../assets/IMAGES/tower-defense/enemy_mechanic.png"),
    tax: require("../../../assets/IMAGES/tower-defense/enemy_tax.png"),
    wedding: require("../../../assets/IMAGES/tower-defense/enemy_wedding.png"),
    shopping: require("../../../assets/IMAGES/tower-defense/enemy_shopping.png"),
  } satisfies Record<EnemyKind, ReturnType<typeof require>>,
  towerLottie: {
    emergency_fund: require("../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json"),
    insurance: require("../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json"),
    auto_budget: require("../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json"),
  } satisfies Record<TowerKind, ReturnType<typeof require>>,
} as const;
