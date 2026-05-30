import { StyleSheet } from 'react-native';

/**
 * Shared style atoms for Pearl stages.
 *
 * Extracted in 2026-05-30 audit follow-up to stop the 3 daily-content stages
 * (concept, quote, captain mail) from drifting on their CTA + card chrome.
 * Each stage can still extend with its own per-screen layout, but the CTA
 * button, the daily-content card, and the small section label all live here.
 */
export const PEARL_STAGE_COLORS = {
  rootBg: '#f8fafc',
  cardBg: '#f0f9ff',
  cardBorder: '#e0f2fe',
  cardBorderBottom: '#bae6fd',
  cardGlow: '#38bdf8',
  labelColor: '#0369a1',
  titleColor: '#0f172a',
  bodyColor: '#334155',
  ctaBg: '#0891b2',
  ctaBgBottom: '#0e7490',
  ctaText: '#ffffff',
} as const;

export const pearlStageStyles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
    backgroundColor: PEARL_STAGE_COLORS.rootBg,
  },
  card: {
    borderRadius: 22,
    backgroundColor: PEARL_STAGE_COLORS.cardBg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PEARL_STAGE_COLORS.cardBorder,
    borderBottomWidth: 4,
    borderBottomColor: PEARL_STAGE_COLORS.cardBorderBottom,
    shadowColor: PEARL_STAGE_COLORS.cardGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 36,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: PEARL_STAGE_COLORS.labelColor,
    letterSpacing: 1,
    writingDirection: 'rtl',
  },
  ctaWrap: {
    paddingHorizontal: 4,
  },
  cta: {
    backgroundColor: PEARL_STAGE_COLORS.ctaBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderBottomWidth: 4,
    borderBottomColor: PEARL_STAGE_COLORS.ctaBgBottom,
  },
  ctaText: {
    color: PEARL_STAGE_COLORS.ctaText,
    fontSize: 17,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
});