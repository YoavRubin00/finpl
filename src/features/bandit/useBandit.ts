import { useRef, useCallback } from 'react';
import { useBanditStore } from './useBanditStore';
import { getVariantPayload } from './banditConfig';
import type { BanditSelection, ExperimentId, ExperimentPayloads } from './banditTypes';

/**
 * Returns the bandit-selected variant for an experiment.
 * The variant is locked via useRef on first render — it won't change mid-session
 * even as other users' conversions update the global alpha/beta values.
 *
 * Usage:
 *   const { payload, trackImpression, trackConversion, trackDismiss } = useBandit('streak_repair_offer');
 */
export function useBandit<E extends ExperimentId>(
  experimentId: E
): BanditSelection<ExperimentPayloads[E]> {
  const variantIdRef = useRef<string | null>(null);

  // Lock variant on first render of this component instance
  if (variantIdRef.current === null) {
    variantIdRef.current = useBanditStore.getState().selectVariant(experimentId);
  }
  const variantId = variantIdRef.current;

  const recordImpression = useBanditStore((s) => s.recordImpression);
  const recordConversion = useBanditStore((s) => s.recordConversion);
  const recordDismiss = useBanditStore((s) => s.recordDismiss);

  const trackImpression = useCallback(() => {
    recordImpression(experimentId, variantId);
  }, [experimentId, variantId, recordImpression]);

  const trackConversion = useCallback(() => {
    recordConversion(experimentId, variantId);
  }, [experimentId, variantId, recordConversion]);

  const trackDismiss = useCallback(() => {
    recordDismiss(experimentId, variantId);
  }, [experimentId, variantId, recordDismiss]);

  const payload = getVariantPayload(experimentId, variantId);

  return { variantId, payload, trackImpression, trackConversion, trackDismiss };
}