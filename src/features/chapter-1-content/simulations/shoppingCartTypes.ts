/** Types for the "Shopping Cart Race" simulation game (Module 1-8) */

export type ShoppingItemCategory = 'essential' | 'trap' | 'budget-alternative';

export type TrapType = 'bogo' | 'endcap' | 'oversized' | 'decoy-pricing';

export interface ShoppingItem {
  id: string;
  /** Hebrew item name, e.g. "חלב" */
  name: string;
  /** Visual emoji for the item */
  emoji: string;
  /** Price in ₪ */
  price: number;
  /** Item category: essential, trap, or budget alternative */
  category: ShoppingItemCategory;
  /** Marketing trap type (only for trap items) */
  trapType?: TrapType;
  /** Hebrew explanation of the marketing trick (only for trap items) */
  trapExplanation?: string;
}

export interface ShoppingCartConfig {
  /** Total budget in ₪ */
  budget: number;
  /** Array of items encountered in the store */
  items: ShoppingItem[];
  /** How many essential items must be collected */
  essentialCount: number;
}

export interface ShoppingCartState {
  /** Items currently in the cart */
  cart: ShoppingItem[];
  /** Total money spent in ₪ */
  totalSpent: number;
  /** Starting budget in ₪ */
  budget: number;
  /** Number of essential items collected */
  essentialsCollected: number;
  /** Number of trap items avoided */
  trapsAvoided: number;
  /** Number of trap items fallen for */
  trapsFallen: number;
  /** Current item index (0-based) */
  currentIndex: number;
  /** Whether the game is complete */
  isComplete: boolean;
}

export type ShoppingCartGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface ShoppingCartScore {
  /** Letter grade */
  grade: ShoppingCartGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Money wasted on trap items in ₪ */
  moneyWasted: number;
  /** Number of essential items missed */
  essentialsMissed: number;
  /** Number of trap items avoided */
  trapsAvoided: number;
}
