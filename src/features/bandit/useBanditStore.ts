import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { EXPERIMENT_CONFIGS } from './banditConfig';
import { postBanditEvent, fetchBanditState } from '../../db/sync/syncBandit';
import type {
  BanditState,
  BanditExperiment,
  BanditReport,
  BanditReportExperiment,
  ExperimentId,
} from './banditTypes';

// ── Thompson Sampling engine ─────────────────────────────────────────────────

function randn(): number {
  // Box-Muller transform: uniform → standard normal
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u + 1e-10)) * Math.cos(2 * Math.PI * v);
}

function sampleGamma(shape: number): number {
  // Marsaglia-Tsang (2000) — accurate for shape in [1, 100]
  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random() + 1e-10, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u + 1e-10) < 0.5 * x * x + d * (1 - v + Math.log(v + 1e-10))) return d * v;
  }
}

function sampleBeta(alpha: number, beta: number): number {
  const ga = sampleGamma(alpha);
  const gb = sampleGamma(beta);
  const denom = ga + gb;
  return denom === 0 ? 0.5 : ga / denom;
}

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
