import { FantasyLobbyScreen } from '../../src/features/fantasy-league/screens/FantasyLobbyScreen';
import { FANTASY_COMING_SOON, FantasyComingSoonScreen } from '../../src/features/fantasy-league/FantasyComingSoon';

export default function FantasyLeaguePage() {
  // Coming-soon gate (Yoav 2026-07-06) — see FantasyComingSoon.tsx.
  if (FANTASY_COMING_SOON) return <FantasyComingSoonScreen />;
  return <FantasyLobbyScreen />;
}
