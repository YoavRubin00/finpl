import type { ImageSourcePropType } from 'react-native';
import type { GlossaryKey } from '../shared/glossary';

export type ScenarioCategory =
  | 'compound-interest'
  | 'debt-vs-invest'
  | 'fees-drag'
  | 'time-in-market'
  | 'tax-shelter'
  | 'diversification';

export interface ScenarioSide {
  title: string;
  subtitle?: string;
  gradient: [string, string];
  textColor: string;
  finalValue: number;
  finalValueLabel: string;
}

export interface HigherLowerScenario {
  id: string;
  category: ScenarioCategory;
  question: string;
  leftSide: ScenarioSide;
  rightSide: ScenarioSide;
  correctSide: 'left' | 'right';
  explanation: string;
  punchline: string;
  illustration?: ImageSourcePropType;
  durationYears: number;
  /** Glossary keys for complex terms that appear in this scenario */
  glossaryKeys?: GlossaryKey[];
}
