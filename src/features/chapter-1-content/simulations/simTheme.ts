/**
 * Chapter 1 simulator design system — thin wrapper around shared base.
 */
import { getChapterTheme } from '../../../constants/theme';
import {
    createSIM,
    createTYPE,
    createSimStyles,
    GRADE_COLORS as _GRADE_COLORS,
    GRADE_HEBREW,
    SHADOW_STRONG,
    SHADOW_LIGHT,
    RTL,
} from '../../shared-sim/simThemeBase';

const _th = getChapterTheme('chapter-1');

export const SIM = createSIM(_th);
export const TYPE = createTYPE(SIM);
export const simStyles = createSimStyles(SIM);

export const GRADE_COLORS = _GRADE_COLORS;
export { GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL };
