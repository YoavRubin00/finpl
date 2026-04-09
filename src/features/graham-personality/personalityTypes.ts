/**
 * Graham Investor Personality Test — type definitions.
 * Based on Benjamin Graham's "The Intelligent Investor" archetypes.
 */

export interface PersonalityOption {
  text: string;
  /** Score contribution per profile type: [defensive, enterprising, speculator, rational] */
  scores: [number, number, number, number];
}

export interface PersonalityQuestion {
  id: string;
  question: string;
  options: PersonalityOption[];
}

export type InvestorProfileId = 'defensive' | 'enterprising' | 'speculator' | 'rational';

export interface InvestorProfile {
  id: InvestorProfileId;
  title: string;       // Hebrew
  subtitle: string;    // Hebrew
  description: string; // Hebrew
  emoji: string;
  advice: string;      // Hebrew
  color: string;       // Hex color
}
