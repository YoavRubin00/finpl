import type { NinjaItem, NinjaItemType } from './ninjaTypes';

/* ------------------------------------------------------------------ */
/*  Physics Configuration                                              */
/* ------------------------------------------------------------------ */

export interface NinjaPhysicsConfig {
    /** Gravity pulling items downward (pixels/frame²) */
    gravity: number;
    /** Base upward launch speed */
    launchSpeedY: number;
    /** Max horizontal drift speed */
    maxDriftX: number;
    /** Milliseconds between item spawns */
    spawnIntervalMs: number;
    /** How long an item lives before it counts as missed (ms) */
    itemLifetimeMs: number;
    /** Hit-box radius for slice detection (pixels) */
    hitRadius: number;
}

export const ninjaPhysics: NinjaPhysicsConfig = {
    gravity: 0.35,
    launchSpeedY: -14,
    maxDriftX: 4,
    spawnIntervalMs: 1200,
    itemLifetimeMs: 3000,
    hitRadius: 50,
};

/* ------------------------------------------------------------------ */
/*  Deduction item templates (without velocity — engine adds that)     */
/* ------------------------------------------------------------------ */

export interface NinjaItemTemplate {
    id: string;
    label: string;
    amount: number;
    type: NinjaItemType;
}

/* ------------------------------------------------------------------ */
/*  Payslip Scenarios — realistic Israeli salary breakdowns            */
/* ------------------------------------------------------------------ */

export interface NinjaScenario {
    /** Display label, e.g. "משכורת ראשונה" */
    title: string;
    /** Base gross salary in ₪ */
    grossSalary: number;
    /** Deduction items the player must slice */
    items: NinjaItemTemplate[];
}

const SCENARIO_12K: NinjaScenario = {
    title: 'משכורת ראשונה',
    grossSalary: 12_000,
    items: [
        { id: 'tax-income', label: 'מס הכנסה', amount: 600, type: 'tax' },
        { id: 'tax-bituach-leumi', label: 'ביטוח לאומי', amount: 420, type: 'tax' },
        { id: 'tax-health', label: 'מס בריאות', amount: 360, type: 'health' },
        { id: 'pension-employee', label: 'פנסיה (עובד)', amount: 720, type: 'pension' },
        { id: 'pension-employer', label: 'פנסיה (מעסיק)', amount: 720, type: 'pension' },
        { id: 'bonus-keren', label: 'קרן השתלמות', amount: 300, type: 'bonus' },
    ],
};

const SCENARIO_20K: NinjaScenario = {
    title: 'קידום בעבודה',
    grossSalary: 20_000,
    items: [
        { id: 'tax-income', label: 'מס הכנסה', amount: 1_800, type: 'tax' },
        { id: 'tax-bituach-leumi', label: 'ביטוח לאומי', amount: 700, type: 'tax' },
        { id: 'tax-health', label: 'מס בריאות', amount: 600, type: 'health' },
        { id: 'pension-employee', label: 'פנסיה (עובד)', amount: 1_200, type: 'pension' },
        { id: 'pension-employer', label: 'פנסיה (מעסיק)', amount: 1_200, type: 'pension' },
        { id: 'bonus-keren', label: 'קרן השתלמות', amount: 500, type: 'bonus' },
    ],
};

export const ninjaScenarios: NinjaScenario[] = [SCENARIO_12K, SCENARIO_20K];

/* ------------------------------------------------------------------ */
/*  Bin classification — which types go to which bin                    */
/* ------------------------------------------------------------------ */

/** Items the state takes (red bin) */
export const STATE_DEDUCTION_TYPES: ReadonlySet<NinjaItemType> = new Set([
    'tax',
    'health',
]);

/** Items saved for the player's future (green bin) */
export const FUTURE_SAVINGS_TYPES: ReadonlySet<NinjaItemType> = new Set([
    'pension',
    'bonus',
]);

/**
 * Determines if an item is a "state deduction" (red bin) or
 * a "future savings" (green bin).
 */
export function getBinForType(type: NinjaItemType): 'state' | 'savings' {
    return STATE_DEDUCTION_TYPES.has(type) ? 'state' : 'savings';
}

/**
 * Materialise a template into a full NinjaItem with randomised velocity.
 */
export function spawnItem(template: NinjaItemTemplate): NinjaItem {
    const vx =
        (Math.random() - 0.5) * 2 * ninjaPhysics.maxDriftX;
    const vy =
        ninjaPhysics.launchSpeedY + (Math.random() - 0.5) * 3;

    return {
        ...template,
        initialVelocity: { x: vx, y: vy },
    };
}
