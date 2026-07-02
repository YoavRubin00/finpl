import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { EXPERIMENT_CONFIGS } from './banditConfig';
import { registerLocalStore } from '../../lib/stores/registry';
import { postBanditEvent, fetchBanditState } from '../../db/sync/syncBandit';
import { sampleBeta } from './sampleBetaBandit';
import type {
  BanditState,
  BanditExperiment,
  BanditReport,
  BanditReportExperiment,
  ExperimentId,
} from './banditTypes';

// ── Initialise experiments from config ──────────────────────────────────────

function buildInitialExperiments(): Record<ExperimentId, BanditExperiment> {
  const result = {} as Record<ExperimentId, BanditExperiment>;
  for (const key of Object.keys(EXPERIMENT_CONFIGS) as ExperimentId[]) {
    const cfg = EXPERIMENT_CONFIGS[key];
    result[key] = {
      id: key,
      goal: cfg.goal,
      variants: cfg.variants.map((v) => ({
        id: v.id,
        label: v.label,
        alpha: 1,
        beta: 1,
        impressions: 0,
        conversions: 0,
      })),
    };
  }
  return result;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useBanditStore = create<BanditState>()(
  persist(
    (set, get) => ({
      experiments: buildInitialExperiments(),

      selectVariant: (experimentId) => {
        const exp = get().experiments[experimentId];
        if (!exp || exp.variants.length === 0) return '';

        // Config-level pin wins over sampling (see ExperimentConfig.pinned).
        const pinned = EXPERIMENT_CONFIGS[experimentId]?.pinned;
        if (pinned && exp.variants.some((v) => v.id === pinned)) {
          return pinned;
        }

        // Activation threshold (Yoav 2026-05-31): until EVERY variant has at
        // least WARMUP_IMPRESSIONS exposures, sample uniformly. Below this
        // floor the prior Beta(1,1) is essentially flat — a single early
        // conversion (α=2, β=1) pins the bandit to whichever variant happened
        // to win the cold-start race, even if it's no better than the others.
        // With only ~3 purchase_completed events per 30 days across 4 paywall
        // variants, Thompson sampling on this prior is indistinguishable from
        // a random pick that locks in forever — uniform sampling at least
        // distributes impressions evenly so the warm-up signal accumulates.
        const WARMUP_IMPRESSIONS = 30;
        const isWarm = exp.variants.every((v) => v.impressions >= WARMUP_IMPRESSIONS);
        if (!isWarm) {
          return exp.variants[Math.floor(Math.random() * exp.variants.length)].id;
        }

        let bestId = exp.variants[0].id;
        let bestSample = -1;

        for (const variant of exp.variants) {
          const sample = sampleBeta(variant.alpha, variant.beta);
          if (sample > bestSample) {
            bestSample = sample;
            bestId = variant.id;
          }
        }
        return bestId;
      },

      recordImpression: (experimentId, variantId) => {
        set((state) => {
          const exp = state.experiments[experimentId];
          if (!exp) return state;
          return {
            experiments: {
              ...state.experiments,
              [experimentId]: {
                ...exp,
                variants: exp.variants.map((v) =>
                  v.id === variantId ? { ...v, impressions: v.impressions + 1 } : v
                ),
              },
            },
          };
        });
        postBanditEvent(experimentId, variantId, 'impression').catch(() => {});
      },

      recordConversion: (experimentId, variantId) => {
        set((state) => {
          const exp = state.experiments[experimentId];
          if (!exp) return state;
          return {
            experiments: {
              ...state.experiments,
              [experimentId]: {
                ...exp,
                variants: exp.variants.map((v) =>
                  v.id === variantId
                    ? { ...v, alpha: v.alpha + 1, conversions: v.conversions + 1 }
                    : v
                ),
              },
            },
          };
        });
        postBanditEvent(experimentId, variantId, 'conversion').catch(() => {});
      },

      recordDismiss: (experimentId, variantId) => {
        set((state) => {
          const exp = state.experiments[experimentId];
          if (!exp) return state;
          return {
            experiments: {
              ...state.experiments,
              [experimentId]: {
                ...exp,
                variants: exp.variants.map((v) =>
                  v.id === variantId ? { ...v, beta: v.beta + 1 } : v
                ),
              },
            },
          };
        });
        postBanditEvent(experimentId, variantId, 'dismiss').catch(() => {});
      },

      getBanditReport: (): BanditReport => {
        const { experiments } = get();
        const expList = Object.values(experiments) as BanditExperiment[];

        const reportExperiments: BanditReportExperiment[] = expList.map((exp) => {
          const variants = exp.variants.map((v) => ({
            id: v.id,
            label: v.label,
            alpha: v.alpha,
            beta: v.beta,
            impressions: v.impressions,
            conversions: v.conversions,
            conversionRate: v.impressions > 0 ? v.conversions / v.impressions : 0,
            estimatedMean: v.alpha / (v.alpha + v.beta),
          }));

          const sorted = [...variants].sort((a, b) => b.estimatedMean - a.estimatedMean);

          return {
            id: exp.id,
            goal: exp.goal,
            variants: sorted,
            recommendedVariant: sorted[0]?.id ?? '',
          };
        });

        return { generatedAt: Date.now(), experiments: reportExperiments };
      },

      resetExperiment: (experimentId) => {
        set((state) => {
          const exp = state.experiments[experimentId];
          if (!exp) return state;
          return {
            experiments: {
              ...state.experiments,
              [experimentId]: {
                ...exp,
                variants: exp.variants.map((v) => ({
                  ...v,
                  alpha: 1,
                  beta: 1,
                  impressions: 0,
                  conversions: 0,
                })),
              },
            },
          };
        });
      },

      reset: () => set({ experiments: buildInitialExperiments() }),

      hydrateFromServer: async () => {
        const serverState = await fetchBanditState().catch(() => null);
        if (!serverState) return;

        set((state) => {
          const merged = { ...state.experiments };
          for (const expId of Object.keys(serverState)) {
            const exp = merged[expId as ExperimentId];
            if (!exp) continue;
            const serverVariants = serverState[expId];
            merged[expId as ExperimentId] = {
              ...exp,
              variants: exp.variants.map((v) => {
                const serverV = serverVariants.find((sv) => sv.variantId === v.id);
                if (!serverV) return v;
                return {
                  ...v,
                  alpha: serverV.alpha,
                  beta: serverV.beta,
                  impressions: serverV.impressions,
                  conversions: serverV.conversions,
                };
              }),
            };
          }
          return { experiments: merged };
        });
      },
    }),
    {
      name: 'bandit-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ experiments: state.experiments }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Merge any new experiments added in code that don't yet exist in persisted state
        const defaults = buildInitialExperiments();
        for (const key of Object.keys(defaults) as ExperimentId[]) {
          if (!state.experiments[key]) {
            state.experiments[key] = defaults[key];
          } else {
            // Also merge any new variants added to an existing experiment
            const persistedVariantIds = new Set(state.experiments[key].variants.map((v) => v.id));
            for (const defaultVariant of defaults[key].variants) {
              if (!persistedVariantIds.has(defaultVariant.id)) {
                state.experiments[key].variants.push(defaultVariant);
              }
            }
          }
        }
      },
    }
  )
);

registerLocalStore('bandit-store', useBanditStore, 'bandit-store');
