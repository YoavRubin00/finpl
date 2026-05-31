import { useRef, useEffect, useCallback } from 'react';
import { useBanditStore } from './useBanditStore';
import { getVariantPayload, EXPERIMENT_CONFIGS } from './banditConfig';
import type { BanditSelection, ExperimentId, ExperimentPayloads } from './banditTypes';
import { track } from '../../lib/analytics/events';
import { setPersonProperties } from '../../lib/posthog';

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

  // Fire `bandit_variant_assigned` exactly once per component instance, AND
  // patch the PostHog person record so every downstream event from this user
  // can be sliced by `person.bandit_variant__<experimentId>` in Hog funnels.
  // Without this, Hog was blind to which variant each user saw — variant
  // breakdowns on Pro/Bridge/Referral funnels were impossible.
  const assignedFiredRef = useRef(false);
  useEffect(() => {
    if (assignedFiredRef.current || !variantId) return;
    assignedFiredRef.current = true;

    const cfg = EXPERIMENT_CONFIGS[experimentId];
    const variantLabel = cfg?.variants.find((v) => v.id === variantId)?.label;
    // Mirror the activation-threshold logic in selectVariant: if any variant
    // is still below the warmup floor we're in uniform-random mode and
    // downstream analysis should know NOT to treat the assignment as
    // Thompson-converged signal yet.
    const exp = useBanditStore.getState().experiments[experimentId];
    const WARMUP_FLOOR = 30;
    const uniformSampling = !exp || exp.variants.some((v) => v.impressions < WARMUP_FLOOR);

    track({
      name: 'bandit_variant_assigned',
      props: {
        experiment_id: experimentId,
        variant_id: variantId,
        variant_label: variantLabel,
        uniform_sampling: uniformSampling,
      },
    });

    // Person-property write — namespaced with `bandit_variant__` so funnel
    // breakdowns find one property per experiment. PostHog `setPersonProperties`
    // is idempotent (re-writing the same value is a no-op on Person model),
    // so re-mounts of the component don't churn the person record.
    setPersonProperties({ [`bandit_variant__${experimentId}`]: variantId });
  }, [experimentId, variantId]);

  const payload = getVariantPayload(experimentId, variantId);

  return { variantId, payload, trackImpression, trackConversion, trackDismiss };
}