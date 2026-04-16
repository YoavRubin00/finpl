import type { ImageSourcePropType } from 'react-native';
import type { GlossaryKey } from '../shared/glossary';

export type AdTemplateId =
  | 'scam-neon'
  | 'scam-crypto'
  | 'scam-aspirational'
  | 'scam-tech'
  | 'scam-realestate'
  | 'legit-corporate'
  | 'legit-warm';

export interface AdTemplate {
  id: AdTemplateId;
  gradient: [string, string];
  textColor: string;
  accentColor: string;
  moodTag: 'scam' | 'legit';
  image: ImageSourcePropType;
}

export interface BullshitAd {
  id: string;
  isBullshit: boolean;
  templateId: AdTemplateId;
  headline: string;
  subheadline?: string;
  badge?: string;
  disclaimer: string;
  explanation: string;
  glossaryKeys?: GlossaryKey[];
}

export interface BullshitRoundResult {
  ad: BullshitAd;
  userSaidBullshit: boolean;
  correct: boolean;
}
