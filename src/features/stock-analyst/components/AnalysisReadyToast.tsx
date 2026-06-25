import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeOutDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft } from 'lucide-react-native';
import { FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { tapHaptic, successHaptic } from '../../../utils/haptics';

const AUTO_REVEAL_MS = 12_000;

interface Props {
  /** When non-null, the toast surfaces. Clearing pending hides it. */
  visible: boolean;
  /** Tap-to-reveal (also fires after AUTO_REVEAL_MS as a safety net so the
   *  analysis doesn't get stuck behind a forgotten toast). */
  onReveal: () => void;
}

/**
 * Bottom toast that surfaces when a deep stock analysis lands while the user
 * is in the wait-state flow (typically mid-game in `WaitGameOverlay`). Tap
 * anywhere on the card → reveals the deep analysis. Auto-fires reveal after
 * AUTO_REVEAL_MS so a user who never taps still sees their result.
 *
 * Visually mirrors `SharkInsightToast` but the whole card is the primary tap
 * target — a separate X looks redundant when "tap to dismiss" and "tap to act"
 * are the same action.
 *
 * zIndex sits above `WaitGameOverlay` (900) so the toast is visible even when
 * a game overlay is open — that's the whole point.
 */
export function AnalysisReadyToast({ visible, onReveal }: Props): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const onRevealRef = useRef(onReveal);
  useEffect(() => { onRevealRef.current = onReveal; }, [onReveal]);

  useEffect(() => {
    if (!visible) return;
    successHaptic();
    const t = setTimeout(() => onRevealRef.current(), AUTO_REVEAL_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={[s.container, { bottom: Math.max(insets.bottom, 16) + 16 }]}
      pointerEvents="box-none"
    >
      <Animated.View
        entering={reducedMotion ? undefined : SlideInDown.springify().damping(18).stiffness(140)}
        exiting={FadeOutDown.duration(220)}
        style={s.cardWrap}
        pointerEvents="auto"
      >
        <Pressable
          onPress={() => {
            tapHaptic();
            onReveal();
          }}
          accessibilityRole="button"
          accessibilityLabel="הניתוח מוכן — לחץ כדי לראות"
          // Background/border/shadow live on the inner `s.card` View, NOT on this
          // function-style Pressable: on Android a function `style` drops
          // backgroundColor (RN bug), which made the card render see-through on
          // the dark navy screen. Same fix as ForceUpdateScreen. The Pressable
          // now only carries the press feedback (opacity + scale).
          style={({ pressed }) => (pressed ? s.cardPressed : null)}
        >
          <View style={s.card}>
            <View style={s.accent} />
            <View style={s.row}>
              <View style={s.avatarWrap}>
                <ExpoImage source={FINN_HAPPY} style={s.avatar} contentFit="contain" accessible={false} />
              </View>
              <View style={s.textBlock}>
                <Text style={s.title} numberOfLines={1}>הניתוח מוכן! 🎯</Text>
                <Text style={s.body} numberOfLines={2}>לחץ כדי לראות את הניתוח המלא</Text>
              </View>
              <ChevronLeft size={20} color="#0c4a6e" strokeWidth={2.6} />
            </View>
          </View>
        </Pressable>
        {/* Secondary X to dismiss WITHOUT auto-revealing — for now this just
            triggers reveal too (the card is the result; "dismiss without
            revealing" doesn't have a coherent meaning since the work is done). */}
        <Pressable
          onPress={onReveal}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="סגור"
          style={s.dismiss}
        >
          <X size={14} color="#64748b" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    // Above WaitGameOverlay (900) — toast must be visible over the game.
    zIndex: 950,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  cardWrap: {
    position: 'relative',
  },
  // Light-blue + bigger per user request 2026-06-03 ("רקע כחול בהיר").
  // Was white card with a green accent — read as a "soft" notification on
  // the dark navy StockAnalyst screen and tested-poorly with the user.
  // New design: cyan/sky gradient feel, brighter borders, larger title.
  //
  // 2026-06-04: bumped from #dbeafe (sky-100) → #bfdbfe (sky-200) — the
  // paler shade read as "transparent" against the deep-navy analyst
  // background even though it was a solid fill. The slightly more
  // saturated sky-200 still feels light/friendly but has enough contrast
  // to register as a real card.
  card: {
    backgroundColor: '#bfdbfe',
    borderRadius: 20,
    paddingStart: 16,
    paddingEnd: 16,
    paddingVertical: 14,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 18,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  accent: {
    position: 'absolute',
    insetInlineEnd: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#0284c7',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  avatar: { width: 42, height: 42 },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0c4a6e',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  dismiss: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
