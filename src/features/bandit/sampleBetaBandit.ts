/**
 * Beta-Bernoulli Thompson sampling utilities.
 *
 * Used by both the client store (`useBanditStore.ts`) and server-side selection
 * (e.g. `app/api/email/send-daily+api.ts`). Marsaglia-Tsang (2000) for gamma
 * sampling — accurate for shape parameters in [1, 100].
 */

function randn(): number {
  // Box-Muller transform: uniform → standard normal
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u + 1e-10)) * Math.cos(2 * Math.PI * v);
}

export function sampleGamma(shape: number): number {
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

export function sampleBeta(alpha: number, beta: number): number {
  const ga = sampleGamma(alpha);
  const gb = sampleGamma(beta);
  const denom = ga + gb;
  return denom === 0 ? 0.5 : ga / denom;
}

export interface BanditVariantStats {
  variantId: string;
  alpha: number;
  beta: number;
}

/**
 * Picks the variant with the highest Beta(alpha, beta) sample.
 * Returns null if `variants` is empty.
 */
export function selectBestVariant<T extends BanditVariantStats>(variants: T[]): T | null {
  if (variants.length === 0) return null;
  let best = variants[0];
  let bestSample = -1;
  for (const v of variants) {
    const sample = sampleBeta(v.alpha, v.beta);
    if (sample > bestSample) {
      bestSample = sample;
      best = v;
    }
  }
  return best;
}
