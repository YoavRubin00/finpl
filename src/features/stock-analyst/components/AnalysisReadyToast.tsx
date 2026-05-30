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
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
        >
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingStart: 14,
    paddingEnd: 14,
    paddingVertical: 12,
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.4)',
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
    width: 4,
    backgroundColor: '#22c55e',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 38, height: 38 },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#064e3b',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 17,
  },
  dismiss: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
