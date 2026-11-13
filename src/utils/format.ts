/**
 * Shared formatting utilities for money, large numbers and percentages.
 *
 * ONE source of truth for how numbers read across the app, so "1,250" in the
 * shop is not "1250" on the bridge and "1.250" on a German-locale device.
 *
 * Why not `n.toLocaleString()`: with no locale argument it follows the DEVICE
 * locale (Arabic-Indic digits on an Arabic phone, "1.250" on a German one),
 * and `'he-IL'` depends on the ICU data shipped with the JS engine. The app is
 * Hebrew-only and the Israeli convention is `1,250` and `1,250.50`, so we
 * group digits ourselves. Deterministic on every device and engine.
 *
 * Conventions:
 *   - thousands separator: `,`   decimal separator: `.`
 *   - shekel sign BEFORE the number: `₪1,250`
 *   - negative sign is a true minus `−` before the currency sign: `−₪1,250`
 *   - percent sign AFTER the number, no space: `12.5%`
 */

const MINUS = '−';

function groupThousands(intDigits: string): string {
    return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Unsigned, grouped body + whether the rounded value is a real negative. */
function splitNumber(n: number, decimals: number): { body: string; negative: boolean } {
    const fixed = Math.abs(n).toFixed(Math.max(0, decimals));
    const parts = fixed.split('.');
    const intPart = parts[0] ?? '0';
    const fracPart = parts[1];
    const body = fracPart ? `${groupThousands(intPart)}.${fracPart}` : groupThousands(intPart);
    // "negative" only if it does not round to zero, so we never print "−0".
    return { body, negative: n < 0 && Number(fixed) !== 0 };
}

/**
 * `1250` → `1,250`. Rounds to `decimals` (default 0). Non-finite input → `0`.
 * Use for coins, gems, XP, counts and any plain number shown to the user.
 */
export function formatNumber(n: number, decimals = 0): string {
    if (!Number.isFinite(n)) return '0';
    const { body, negative } = splitNumber(n, decimals);
    return negative ? `${MINUS}${body}` : body;
}

/** `1250.4` → `₪1,250`; `-80` → `−₪80`. Whole shekels by default. */
export function formatShekel(n: number, decimals = 0): string {
    if (!Number.isFinite(n)) return '₪0';
    const { body, negative } = splitNumber(n, decimals);
    return negative ? `${MINUS}₪${body}` : `₪${body}`;
}

/**
 * Compact form for tight chips: `950` → `950`, `1250` → `1.3K`,
 * `2400000` → `2.4M`. A trailing `.0` is dropped (`2000` → `2K`).
 */
export function formatCompact(n: number): string {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    const sign = n < 0 ? MINUS : '';
    const trim = (v: number): string => v.toFixed(1).replace(/\.0$/, '');
    if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
    if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
    return `${sign}${Math.round(abs)}`;
}

/**
 * RATIO → percent: `0.125` → `13%`, `formatPercent(0.125, 1)` → `12.5%`.
 * (Existing behaviour, kept: the input is a 0..1 ratio.)
 */
export function formatPercent(n: number, decimals = 0): string {
    return decimals > 0
        ? `${(n * 100).toFixed(decimals)}%`
        : `${Math.round(n * 100)}%`;
}

/**
 * A value that is ALREADY a percent: `12.345` → `12.3%`.
 * `signed` adds `+` for gains (losses always get a true minus) — P&L, daily change.
 */
export function formatPercentValue(pct: number, decimals = 1, signed = false): string {
    if (!Number.isFinite(pct)) return '0%';
    const body = Math.abs(pct).toFixed(Math.max(0, decimals));
    const isZero = Number(body) === 0;
    if (pct < 0 && !isZero) return `${MINUS}${body}%`;
    return signed && !isZero ? `+${body}%` : `${body}%`;
}

/** `+1,250` / `−80` / `0`. For P&L and reward deltas. */
export function formatSigned(n: number, decimals = 0): string {
    const body = formatNumber(n, decimals);
    return n > 0 && body !== '0' ? `+${body}` : body;
}

export function clamp(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}
