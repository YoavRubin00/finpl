/**
 * RetentionToasts — single mount-point that surfaces three time-sensitive
 * Captain Shark nudges:
 *
 *   1. Session-stacking bonus (#1) — "+X מטבעות על חזרה אחרי Y שעות"
 *   2. Seasonal event banner (#3) — "🇮🇱 78 שנות חופש — בונוס 25%!"
 *   3. Hearts-full XP boost (#5) — "כל הלבבות מלאים — +25% XP על השיעור הבא"
 *
 * Priority order (only one shown at a time): session-bonus > seasonal > hearts-full.
 * Each nudge auto-dismisses after 6 seconds OR on user tap. Show-once-per-session
 * for hearts-full to avoid spam.
 */
import { useEffect, useState } from 'react';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { SharkInsightToast } from '../../components/ui/SharkInsightToast';
import {
  FINN_HAPPY,
  FINN_FIRE,
  FINN_DANCING,
} from './finnMascotConfig';
import { getActiveSeasonalEvent } from '../seasonal-events/seasonalEvents';

const MAX_HEARTS = 5;

export function RetentionToasts() {
  // ── Source 1: Session-stacking bonus from useEconomyStore ──
  const pendingSessionBonus = useEconomyStore((s) => s.pendingSessionBonus);
  const dismissSessionBonus = useEconomyStore((s) => s.dismissSessionBonus);

  // ── Source 2: Seasonal events (calendar lookup, runs once on mount) ──
  const [activeEvent, setActiveEvent] = useState(() => getActiveSeasonalEvent());
  const [seasonalDismissed, setSeasonalDismissed] = useState(false);
  useEffect(() => {
    // Re-check if user keeps the app open across midnight
    const t = setInterval(() => setActiveEvent(getActiveSeasonalEvent()), 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Source 3: Hearts-full boost ──
  const hearts = useSubscriptionStore((s) => s.hearts);
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');
  const lessonMult = useEconomyStore((s) => s.lessonXPMultiplier);
  const setLessonMult = useEconomyStore((s) => s.setLessonXPMultiplier);
  const [heartsToastShown, setHeartsToastShown] = useState(false);
  const heartsFull = !isPro && hearts === MAX_HEARTS;

  // When hearts hit 5/5, ARM the multiplier for the next lesson and trigger toast once
  useEffect(() => {
    if (!heartsFull) return;
    if (lessonMult < 1.25) setLessonMult(1.25);
    if (!heartsToastShown) {
      setHeartsToastShown(true);
    }
  }, [heartsFull, lessonMult, setLessonMult, heartsToastShown]);

  // Reset the once-per-session flag when hearts drop again — so refilling triggers a fresh toast
  useEffect(() => {
    if (!heartsFull && heartsToastShown) {
      setHeartsToastShown(false);
    }
  }, [heartsFull, heartsToastShown]);

  // ── Decide which toast to show — priority: session-bonus > seasonal > hearts-full ──
  if (pendingSessionBonus) {
    const { coins, hoursAway } = pendingSessionBonus;
    return (
      <SharkInsightToast
        visible
        shark={FINN_HAPPY}
        title={`+${coins.toLocaleString()} מטבעות 🪙`}
        body={`קיבלת בונוס על חזרה אחרי ${hoursAway} שעות. תמשיך לחזור — הבונוס מתעצם.`}
        accentColor="#fbbf24"
        onDismiss={dismissSessionBonus}
      />
    );
  }

  if (activeEvent && !activeEvent.silent && !seasonalDismissed) {
    return (
      <SharkInsightToast
        visible
        shark={FINN_DANCING}
        title={`${activeEvent.emoji ?? ''} ${activeEvent.titleHe}`.trim()}
        body={activeEvent.subtitleHe}
        accentColor={activeEvent.accentColor ?? '#0ea5e9'}
        onDismiss={() => setSeasonalDismissed(true)}
      />
    );
  }

  if (heartsFull && heartsToastShown) {
    return (
      <SharkInsightToast
        visible
        shark={FINN_FIRE}
        title="כל הלבבות מלאים 🔥"
        body="השיעור הבא ייתן +25% XP. אל תבזבזו את ההזדמנות — צאו ללמוד עכשיו."
        accentColor="#f59e0b"
        onDismiss={() => setHeartsToastShown(false)}
      />
    );
  }

  return null;
}
