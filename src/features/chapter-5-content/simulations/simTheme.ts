/**
 * Chapter 5 simulator design system, thin wrapper around shared base.
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

const _th = getChapterTheme('chapter-5');

export const SIM5 = createSIM(_th);
export const TYPE5 = createTYPE(SIM5);
export const sim5Styles = createSimStyles(SIM5);

export const GRADE_COLORS5 = _GRADE_COLORS;
export { GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL };
