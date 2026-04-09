/**
 * Shared hook for granting XP + Coins when a simulation completes.
 * Replaces the duplicated reward-granting pattern across ~30 simulation screens.
 *
 * Usage:
 *   useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);
 */
import { useRef, useEffect } from 'react';
import { useEconomyStore } from '../features/economy/useEconomyStore';
import { successHaptic } from '../utils/haptics';

export function useSimReward(
    _isComplete: boolean,
    _xp: number,
    _coins: number,
): void {
    // Rewards are now granted when the chest is opened in LessonFlowScreen
    // This hook is kept as a no-op for backward compatibility
}
