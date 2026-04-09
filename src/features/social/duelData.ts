import type { DuelOpponent } from "./types";

export const MOCK_OPPONENTS: DuelOpponent[] = [
  { id: "opp-1", name: "דניאל הסוחר", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=daniel", level: 5 },
  { id: "opp-2", name: "מאיה ההשקעות", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=maya", level: 8 },
  { id: "opp-3", name: "עומר הפיננסי", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=omer", level: 3 },
  { id: "opp-4", name: "נועה החוסכת", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=noa", level: 6 },
  { id: "opp-5", name: "איתי המתקדם", avatar: "https://api.dicebear.com/7.x/thumbs/png?seed=itay", level: 10 },
];

export const DUEL_DURATION_SEC = 60;
export const DUEL_QUESTIONS_COUNT = 8;
export const DUEL_WIN_COINS = 40;
export const DUEL_LOSS_COINS = 5;
export const DUEL_DRAW_COINS = 15;
export const DUEL_WIN_GEMS = 2;
