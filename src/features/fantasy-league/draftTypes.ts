export interface DraftCategory {
  id: string;
  label: string;
  color: string;
  assetIds: string[];
}

export interface DraftPick {
  round: number;
  categoryId: string;
  assetId: string;
  entryPrice: number;
}

export interface DraftState {
  weekId: string;
  picks: DraftPick[];
  currentRound: number;
  isDraftComplete: boolean;
}
