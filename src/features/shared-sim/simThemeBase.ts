/**
 * Shared design system base for all chapter simulators.
 * Each chapter's simTheme.ts imports factories from here and passes its own ChapterTheme.
 * ~450 lines of duplication eliminated.
 */
import { StyleSheet } from 'react-native';
import type { ChapterTheme } from '../../constants/theme';

/* ── Identical across all chapters ── */

export const GRADE_COLORS: Record<string, string> = {
    S: '#ffffff',
    A: '#16a34a',
    B: '#0284c7',
    C: '#d97706',
    F: '#dc2626',
};

export const GRADE_HEBREW: Record<string, string> = {
    S: 'מצוין!',
    A: 'מצוין',
    B: 'טוב',
    C: 'אפשר יותר',
    F: 'אפשר יותר',
};

export const SHADOW_STRONG = {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
} as const;

export const SHADOW_LIGHT = {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
} as const;

export const RTL = {
    writingDirection: 'rtl' as const,
    textAlign: 'right' as const,
};

/* ── Factory: SIM color palette from ChapterTheme ── */

export function createSIM(th: ChapterTheme) {
    return {
        primary: th.primary,
        dark: th.dark,
        shadow: th.shadow,
        dim: th.dim,
        glow: th.glow,
        gradient: th.gradient,

        cardBg: '#ffffff',
        cardBorder: '#e2e8f0',

        btnPrimary: th.dark,
        btnPrimaryBorder: th.gradient[0],
        btnSecondary: '#ffffff',
        btnSecondaryBorder: '#cbd5e1',

        textOnGradient: '#ffffff',
        textOnGradientMuted: th.dim,

        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#64748b',

        success: '#16a34a',
        successLight: '#dcfce7',
        successBorder: '#bbf7d0',
        warning: '#d97706',
        warningLight: '#fef3c7',
        warningBorder: '#fde68a',
        danger: '#dc2626',
        dangerLight: '#fee2e2',
        dangerBorder: '#fecaca',

        trackBg: 'rgba(255,255,255,0.15)',
        trackBorder: 'rgba(255,255,255,0.25)',

        /* Semantic indicator colors */
        gain: '#4ade80',
        gainDark: '#22c55e',
        loss: '#ef4444',
        lossDark: '#dc2626',
        caution: '#fbbf24',
        cautionDark: '#f59e0b',

        /* Risk-level shortcuts */
        riskLow: '#4ade80',
        riskMed: '#fbbf24',
        riskHigh: '#ef4444',
    } as const;
}

export type SimPalette = ReturnType<typeof createSIM>;

/* ── Factory: TYPE typography from a SIM palette ── */

export function createTYPE(sim: SimPalette) {
    return {
        title: { fontSize: 22, fontWeight: '900' as const, color: sim.textOnGradient, ...SHADOW_STRONG },
        subtitle: { fontSize: 15, fontWeight: '600' as const, color: sim.textOnGradientMuted, ...SHADOW_LIGHT, lineHeight: 22 },
        cardTitle: { fontSize: 17, fontWeight: '800' as const, color: sim.textPrimary },
        cardBody: { fontSize: 15, fontWeight: '600' as const, color: sim.textSecondary, lineHeight: 22 },
        label: { fontSize: 15, fontWeight: '600' as const, color: sim.textSecondary },
        value: { fontSize: 17, fontWeight: '800' as const, color: sim.textPrimary },
        gradientLabel: { fontSize: 14, fontWeight: '700' as const, color: sim.textOnGradientMuted, ...SHADOW_LIGHT },
        gradientValue: { fontSize: 16, fontWeight: '800' as const, color: sim.textOnGradient, ...SHADOW_STRONG },
        progress: { fontSize: 14, fontWeight: '600' as const, color: sim.textOnGradientMuted, ...SHADOW_LIGHT, textAlign: 'center' as const },
        smallLabel: { fontSize: 13, fontWeight: '600' as const, color: sim.textSecondary, lineHeight: 18 },
    } as const;
}

/* ── Factory: shared StyleSheet from a SIM palette ── */

export function createSimStyles(sim: SimPalette) {
    return StyleSheet.create({
        gradeContainer: { alignItems: 'center', marginBottom: 8 },
        gradeText: { fontSize: 52, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
        gradeLabel: { fontSize: 16, fontWeight: '700', color: sim.textOnGradientMuted, textAlign: 'center', lineHeight: 24, ...SHADOW_LIGHT },
        scoreCard: { backgroundColor: sim.cardBg, borderRadius: 20, borderWidth: 1.5, borderColor: sim.cardBorder, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
        scoreCardInner: { padding: 20, gap: 14 },
        scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        scoreRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        scoreRowLabel: { fontSize: 15, color: sim.textSecondary, fontWeight: '600' },
        scoreRowValue: { fontSize: 17, fontWeight: '800' },
        scoreDivider: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        scoreTotalLabel: { fontSize: 16, fontWeight: '900', color: sim.textPrimary },
        scoreTotalValue: { fontSize: 24, fontWeight: '900' },
        actionsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
        replayBtn: { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: '#cbd5e1', backgroundColor: '#ffffff', paddingVertical: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
        replayText: { fontSize: 15, fontWeight: '700', color: sim.dark },
        continueBtn: { flex: 1, borderRadius: 16, backgroundColor: sim.btnPrimary, borderBottomWidth: 4, borderBottomColor: sim.btnPrimaryBorder, paddingVertical: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
        continueText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
        progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
        progressFill: { height: '100%', borderRadius: 4 },
        optionBtn: { borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' },
        insightRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
        insightText: { fontSize: 14, fontWeight: '700', color: '#d97706', lineHeight: 22, textAlign: 'center', flex: 1 },
        gameCard: { backgroundColor: '#ffffff', borderRadius: 20, shadowColor: sim.dark, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
        gameCardElevated: { backgroundColor: '#ffffff', borderRadius: 20, shadowColor: sim.dark, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8, borderWidth: 0.5, borderColor: sim.cardBorder },
        interactiveCard: { backgroundColor: '#ffffff', borderRadius: 16, shadowColor: sim.dark, shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 4, borderWidth: 1, borderColor: sim.cardBorder },
    });
}
