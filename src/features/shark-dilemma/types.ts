export interface DilemmaOption {
  id: "a" | "b";
  label: string;
  /** Shark's feedback shown after this option is chosen */
  feedback: string;
  /** true = this is the financially wiser choice */
  isWise: boolean;
}

export interface SharkDilemma {
  moduleId: string;
  /** Scenario text shown inside the speech bubble */
  scenario: string;
  options: [DilemmaOption, DilemmaOption];
}