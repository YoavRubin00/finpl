import type { EnemyKind, TowerKind } from "./types";

const BLOB_CDN =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/games/tower-defense";

export const TD_ASSETS = {
  battlefield: `${BLOB_CDN}/bg_battlefield.png`,
  fortress: `${BLOB_CDN}/fortress_vault.png`,
  enemies: {
    mechanic: `${BLOB_CDN}/enemy_mechanic.png`,
    tax: `${BLOB_CDN}/enemy_tax.png`,
    wedding: `${BLOB_CDN}/enemy_wedding.png`,
    shopping: `${BLOB_CDN}/enemy_shopping.png`,
  } satisfies Record<EnemyKind, string>,
  towers: {
    emergency_fund: `${BLOB_CDN}/tower_emergency_fund.png`,
    insurance: `${BLOB_CDN}/tower_insurance.png`,
    auto_budget: `${BLOB_CDN}/tower_auto_budget.png`,
  } satisfies Record<TowerKind, string>,
} as const;
