/**
 * Shared formatting utilities for currency and percentages.
 * Replaces 17+ identical local formatShekel definitions across simulation screens.
 */

export function formatShekel(n: number): string {
    return `₪${Math.round(n).toLocaleString('he-IL')}`;
}

export function formatPercent(n: number, decimals = 0): string {
    return decimals > 0
        ? `${(n * 100).toFixed(decimals)}%`
        : `${Math.round(n * 100)}%`;
}

export function clamp(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}
