/**
 * Chapter 4 simulator design system, thin wrapper around shared base.
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

const _th = getChapterTheme('chapter-4');

export const SIM4 = createSIM(_th);
export const TYPE4 = createTYPE(SIM4);
export const sim4Styles = createSimStyles(SIM4);

export const GRADE_COLORS4 = _GRADE_COLORS;
export { GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL };
