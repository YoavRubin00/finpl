/** Types for the "Payslip Ninja" simulation game (Module 1-5) */

export type NinjaItemType = 'tax' | 'pension' | 'bonus' | 'health';

export interface NinjaItemVelocity {
    x: number;
    y: number;
}

export interface NinjaItem {
    id: string;
    /** Hebrew label, e.g. "מס הכנסה" */
    label: string;
    /** Deduction/addition amount (positive = deduction from gross) */
    amount: number;
    /** Category determines bin destination (red = state, green = savings) */
    type: NinjaItemType;
    /** Initial velocity for the arc physics */
    initialVelocity: NinjaItemVelocity;
}

export interface NinjaGameState {
    /** Starting gross salary for this round */
    currentGross: number;
    /** Calculated net after deductions */
    currentNet: number;
    /** Items currently flying on screen */
    activeItems: NinjaItem[];
    /** Items the player failed to slice in time */
    missedItems: NinjaItem[];
    /** Strike count from missed items (3 strikes = game over) */
    strikes: number;
    /** Whether the game has ended */
    isGameOver: boolean;
}
