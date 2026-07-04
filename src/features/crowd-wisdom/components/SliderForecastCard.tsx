import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder, type LayoutChangeEvent } from 'react-native';
import { useNavigation } from 'expo-router';
import { Brain, Lock } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { useCrowdWisdomStore, VOTE_COIN_REWARD } from '../useCrowdWisdomStore';
import { getCurrentWeekId } from '../../fantasy-league/fantasyData';
import { buildForecastRange } from '../lib/validateQuestion';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { getApiBase } from '../../../db/apiBase';
import { track } from '../../../lib/analytics/events';
import type { LiveMarketData, RateItem } from '../../live-news/liveMarketTypes';

const fmtUsd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * Slider forecast ("שאלת סלייד"): drag along a plausible range around the LIVE
 * Bitcoin price and lock your weekend target. Range edges come from
 * buildForecastRange, so the question can never ask for an implausible jump.
 */
export function SliderForecastCard(): React.ReactElement | null {
  const questionId = `slider_btc_${getCurrentWeekId()}`;
  const recordVote = useCrowdWisdomStore((s) => s.recordVote);
  const previousVote = useCrowdWisdomStore((s) => s.votes[questionId]);

  const [live, setLive] = useState<RateItem | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/market/live`);
        if (!res.ok) return;
        const data = (await res.json()) as LiveMarketData;
        const btc = data.rates.find((r) => r.label === 'ביטקוין');
        if (!cancelled && btc && isFinite(btc.numericValue) && btc.numericValue > 1000) {
          setLive(btc);
        }
      } catch {
        /* offline — card hides itself */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const range = useMemo(
    () => (live ? buildForecastRange('crypto', live.numericValue) : null),
    [live],
  );

  const current = value ?? live?.numericValue ?? 0;

  const valueRef = useRef(current);
  valueRef.current = current;
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const widthRef = useRef(trackWidth);
  widthRef.current = trackWidth;

  // Toggle the stack's swipe-back gesture off for the duration of a drag so a
  // fast horizontal slide can never pop the screen, then restore it on release
  // (keeps swipe-back working everywhere else on the screen). Cast is localized
  // — expo-router's useNavigation is generically typed but the native-stack
  // does accept gestureEnabled via setOptions.
  const navigation = useNavigation();
  const setSwipeBackRef = useRef<(enabled: boolean) => void>(() => {});
  setSwipeBackRef.current = (enabled: boolean): void => {
    try {
      (navigation as unknown as { setOptions: (o: { gestureEnabled: boolean }) => void })
        .setOptions({ gestureEnabled: enabled });
    } catch {
      /* non-fatal */
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Claim the gesture in the CAPTURE phase and refuse to hand it back —
      // otherwise a fast horizontal drag on the track is stolen by the stack
      // navigator's swipe-back and pops the whole screen mid-drag (Yoav
      // 2026-07-03: "מזיזים את הבר מהר → חוזר לעמוד הקודם"). Capturing here also
      // blocks the native pop recognizer from ever starting.
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        setSwipeBackRef.current(false);
        const r = rangeRef.current;
        const w = widthRef.current;
        if (!r || w <= 0) return;
        // RTL track: right edge = min, left edge = max.
        const ratio = 1 - evt.nativeEvent.locationX / w;
        const raw = r.min + (1 - ratio) * (r.max - r.min);
        setValue(Math.round(raw / r.step) * r.step);
      },
      onPanResponderMove: (evt) => {
        const r = rangeRef.current;
        const w = widthRef.current;
        if (!r || w <= 0) return;
        const clampedX = Math.max(0, Math.min(w, evt.nativeEvent.locationX));
        const raw = r.min + (clampedX / w) * (r.max - r.min);
        setValue(Math.max(r.min, Math.min(r.max, Math.round(raw / r.step) * r.step)));
      },
      onPanResponderRelease: () => setSwipeBackRef.current(true),
      onPanResponderTerminate: () => setSwipeBackRef.current(true),
    }),
  ).current;

  if (!live || !range) return null;

  const voted = !!previousVote;
  const votedValue = voted ? Number(previousVote.choiceId) : null;

  const handleLock = (): void => {
    if (voted || value === null) return;
    successHaptic();
    // withCrowd = null → STREAK-NEUTRAL: a slider target has no crowd majority
    // to be "with", so locking it must never reset the with-crowd streak.
    recordVote({ questionId, choiceId: String(value), votedAt: Date.now() }, null);
    try {
      // EconomyUI store fires the animated coin counter.
      const economyMod = require('../../economy/useEconomyUIStore');
      economyMod.useEconomyUIStore.getState().addCoins(VOTE_COIN_REWARD);
    } catch {
      /* skip */
    }

    // Analytics: the weekly slider forecast — a distinct crowd-wisdom action.
    track({
      name: 'crowd_vote_submitted',
      props: {
        question_id: questionId,
        choice_id: String(value),
        is_bet: false,
        surface: 'slider_forecast',
      },
    });
    track({ name: 'social_action', props: { action_type: 'slider_forecast', surface: 'crowd_wisdom' } });
  };

  const ratio = range.max > range.min ? (current - range.min) / (range.max - range.min) : 0.5;
  const liveRatio = range.max > range.min ? (live.numericValue - range.min) / (range.max - range.min) : 0.5;

  return (
    <Animated.View entering={FadeInDown.duration(380)} style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.brainBadge}>
          <Brain size={18} color="#ffffff" strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName}>שאלת הסליידר השבועית</Text>
          <Text style={styles.brandMeta}>גררו, נעלו — וגלו איפה הקהילה</Text>
        </View>
      </View>

      <Text style={styles.prompt}>איפה ייסגר הביטקוין בסוף השבוע?</Text>
      <Text style={styles.liveLine}>
        עכשיו: {fmtUsd(live.numericValue)} · {live.changePct > 0 ? '+' : ''}{live.changePct}% היום
      </Text>

      {voted && votedValue !== null ? (
        <Animated.View entering={FadeIn.duration(240)} style={styles.votedBox}>
          <Text style={styles.votedValue}>{fmtUsd(votedValue)}</Text>
          <Text style={styles.votedLabel}>התחזית שלכם נעולה לסוף השבוע</Text>
          {/* Honest copy: slider votes are DEVICE-LOCAL (no server receives
              them), so no community average can ever be revealed — don't
              promise one. */}
          <Text style={styles.votedHint}>
            התחזית נשמרה במכשיר — נראה בהמשך איך היא פגעה.
          </Text>
        </Animated.View>
      ) : (
        <>
          {/* Value readout */}
          <Text style={styles.valueReadout}>{fmtUsd(current)}</Text>

          {/* Slider track */}
          <View
            style={styles.trackWrap}
            onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
          >
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
              {/* Live-price marker */}
              <View style={[styles.liveMarker, { left: `${liveRatio * 100}%` }]} />
              {/* Thumb */}
              <View style={[styles.thumb, { left: `${ratio * 100}%` }]} />
            </View>
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>{fmtUsd(range.max)}</Text>
              <Text style={styles.rangeLabel}>{fmtUsd(range.min)}</Text>
            </View>
          </View>

          <Pressable
            onPress={handleLock}
            disabled={value === null}
            accessibilityRole="button"
            accessibilityLabel="נעילת התחזית"
            style={[styles.ctaBar, value === null && styles.ctaBarDisabled]}
          >
            <View style={styles.coinChip}>
              <GoldCoinIcon size={13} />
              <Text style={styles.coinChipText} maxFontSizeMultiplier={1.15}>+{VOTE_COIN_REWARD}</Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 }}>
              <Lock size={14} color={value === null ? '#94a3b8' : '#5b21b6'} strokeWidth={2.4} />
              <Text style={[styles.ctaText, value === null && styles.ctaTextDisabled]}>
                {value === null ? 'גררו את הסליידר כדי לבחור יעד' : 'נעלו את התחזית'}
              </Text>
            </View>
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  brainBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  brandMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  prompt: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 26,
  },
  liveLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  valueReadout: {
    fontSize: 34,
    fontWeight: '900',
    color: '#b45309',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  trackWrap: {
    paddingVertical: 10,
  },
  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    overflow: 'visible',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: '#fbbf24',
  },
  liveMarker: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#0284c7',
    marginLeft: -1.5,
  },
  thumb: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#f59e0b',
    marginLeft: -14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  votedBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  votedValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#b45309',
    fontVariant: ['tabular-nums'],
  },
  votedLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350f',
    writingDirection: 'rtl',
  },
  votedHint: {
    fontSize: 11,
    color: '#92400e',
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 16,
  },
  ctaBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    gap: 10,
  },
  ctaBarDisabled: {
    backgroundColor: '#f1f5f9',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5b21b6',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  ctaTextDisabled: {
    color: '#94a3b8',
  },
  coinChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  coinChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7c3aed',
  },
});