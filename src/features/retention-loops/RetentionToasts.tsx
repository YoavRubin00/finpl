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
import { useEffect, useRef, useState } from 'react';
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
  const heartsFull = !isPro && hearts === MAX_HEARTS;
  // Track whether the user already dismissed (or auto-dismissed) the toast in
  // THIS hearts-full window. Resets only when hearts drop below MAX and refill
  // again — so the toast shows once per refill, not on every render.
  const [heartsDismissedThisFill, setHeartsDismissedThisFill] = useState(false);
  const prevHeartsFullRef = useRef(false);

  // ARM the lesson multiplier the moment hearts hit 5/5. Decoupled from the
  // toast lifecycle — the boost stays armed even if the user closed the toast.
  useEffect(() => {
    if (heartsFull && lessonMult < 1.25) setLessonMult(1.25);
  }, [heartsFull, lessonMult, setLessonMult]);

  // Reset the dismissal flag on the not-full → full transition (a fresh refill
  // earns a fresh nudge). Don't reset just because hearts stay full.
  useEffect(() => {
    if (heartsFull && !prevHeartsFullRef.current) {
      setHeartsDismissedThisFill(false);
    }
    prevHeartsFullRef.current = heartsFull;
  }, [heartsFull]);

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

  if (heartsFull && !heartsDismissedThisFill) {
    return (
      <SharkInsightToast
        visible
        shark={FINN_FIRE}
        title="כל הלבבות מלאים 🔥"
        body="השיעור הבא ייתן +25% XP. אל תבזבזו את ההזדמנות, צאו ללמוד עכשיו."
        accentColor="#f59e0b"
        onDismiss={() => setHeartsDismissedThisFill(true)}
      />
    );
  }

  return null;
}
