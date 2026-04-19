/**
 * Chapter 2 simulator design system, thin wrapper around shared base.
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

const _th = getChapterTheme('chapter-2');

export const SIM2 = createSIM(_th);
export const TYPE2 = createTYPE(SIM2);
export const sim2Styles = createSimStyles(SIM2);

export const GRADE_COLORS2 = _GRADE_COLORS;
export { GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL };
