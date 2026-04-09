/** Types for the "Inflation Race" simulation game (Module 3-15) */

export type ProductCategory = 'food' | 'entertainment' | 'fitness' | 'housing' | 'groceries';

export interface Product {
  /** Unique identifier */
  id: string;
  /** Hebrew display name */
  name: string;
  /** Visual emoji */
  emoji: string;
  /** Base price in ₪ (2024) */
  basePrice: number;
  /** Product category */
  category: ProductCategory;
}

export interface InflationRaceConfig {
  /** Starting money in checking account (₪) */
  initialMoney: number;
  /** Annual inflation rate (e.g. 0.035 = 3.5%) */
  inflationRate: number;
  /** Annual investment return rate (e.g. 0.08 = 8%) */
  investmentReturn: number;
  /** Min years for slider */
  minYears: number;
  /** Max years for slider */
  maxYears: number;
  /** Array of products with base prices */
  products: Product[];
}

export interface InflatedProduct extends Product {
  /** Current inflated price at selected year (₪) */
  currentPrice: number;
  /** Whether the player can still afford this item */
  affordable: boolean;
}

export interface InflationRaceState {
  /** Currently selected year on the slider (1-20) */
  currentYear: number;
  /** Money in checking account — stays the same (₪) */
  moneyValue: number;
  /** Purchasing power as percentage of original (declines) */
  purchasingPower: number;
  /** Value if money was invested (grows) (₪) */
  investedValue: number;
  /** Products with inflated prices at current year */
  products: InflatedProduct[];
  /** Number of items the player can still afford */
  affordableItems: number;
  /** Whether the simulation is complete */
  isComplete: boolean;
  /** Whether auto-play mode is active */
  isAutoPlaying: boolean;
  /** Whether "invested path" toggle is on */
  showInvestedPath: boolean;
}

export type InflationRaceGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface InflationRaceScore {
  /** Letter grade */
  grade: InflationRaceGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Purchasing power lost as percentage */
  purchasingPowerLost: number;
  /** Investment gain as percentage */
  investmentGain: number;
  /** Number of items the player can no longer afford */
  itemsLostAccess: number;
  /** Final purchasing power value (₪) */
  finalPurchasingPowerValue: number;
  /** Final invested value (₪) */
  finalInvestedValue: number;
}
