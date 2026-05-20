export type ConversionGoal = 'retention' | 'referral' | 'bridge' | 'pro';

export type ExperimentId =
  | 'streak_repair_offer'
  | 'hearts_depleted_nudge'
  | 'referral_cta'
  | 'referral_nudge_trigger'
  | 'bridge_momentum_cta'
  | 'bridge_social_proof'
  | 'upgrade_paywall_headline'
  | 'upgrade_trigger_timing'
  | 'daily_email_variant';

export interface BanditVariant {
  id: string;
  label: string;
  alpha: number;
  beta: number;
  impressions: number;
  conversions: number;
}

export interface BanditExperiment {
  id: ExperimentId;
  goal: ConversionGoal;
  variants: BanditVariant[];
}

export type ExperimentPayloads = {
  streak_repair_offer: {
    title: string;
    subtitle: string;
    primaryCTA: string;
    adCTA: string;
    declineCTA: string;
  };
  hearts_depleted_nudge: {
    title: string;
    subtitle: string;
    primaryCTA: string;
    framingType: 'loss_aversion' | 'opportunity' | 'community';
  };
  referral_cta: {
    title: string;
    body: string;
    cta: string;
  };
  referral_nudge_trigger: {
    trigger: 'after_win' | 'after_streak_milestone' | 'after_level_up';
  };
  bridge_momentum_cta: {
    title: string;
    body: string;
    cta: string;
  };
  bridge_social_proof: {
    framingType: 'social_proof' | 'achievement' | 'reward';
    badgeText: string;
    bodyText: string;
  };
  upgrade_paywall_headline: {
    proofText: string;
    ctaText: string;
    subText: string;
  };
  upgrade_trigger_timing: {
    trigger: 'immediate' | 'after_3_hearts_lost' | 'after_feature_blocked_twice';
  };
  daily_email_variant: {
    // Email body/subject is built in src/features/email/emailTemplates.ts
    // keyed by variant id. Payload only carries a short tone label for analytics.
    tone: 'meta' | 'sad' | 'streak' | 'minimal' | 'welcome';
  };
};

export interface BanditSelection<TPayload> {
  variantId: string;
  payload: TPayload;
  trackImpression: () => void;
  trackConversion: () => void;
  trackDismiss: () => void;
}

export interface BanditReportVariant {
  id: string;
  label: string;
  alpha: number;
  beta: number;
  impressions: number;
  conversions: number;
  conversionRate: number;
  estimatedMean: number;
}

export interface BanditReportExperiment {
  id: ExperimentId;
  goal: ConversionGoal;
  variants: BanditReportVariant[];
  recommendedVariant: string;
}

export interface BanditReport {
  generatedAt: number;
  experiments: BanditReportExperiment[];
}

export interface BanditState {
  experiments: Record<ExperimentId, BanditExperiment>;
  selectVariant: (experimentId: ExperimentId) => string;
  recordImpression: (experimentId: ExperimentId, variantId: string) => void;
  recordConversion: (experimentId: ExperimentId, variantId: string) => void;
  recordDismiss: (experimentId: ExperimentId, variantId: string) => void;
  getBanditReport: () => BanditReport;
  resetExperiment: (experimentId: ExperimentId) => void;
  hydrateFromServer: () => Promise<void>;
}