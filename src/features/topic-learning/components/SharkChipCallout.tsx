import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOut, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import LottieView from '../../../components/ui/SafeLottieView';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';
import { successHaptic, tapHaptic } from '../../../utils/haptics';
import { CHIP_CALLOUT_WEBPS, calloutMessage } from '../chipCalloutScenes';

// Celebration confetti Lottie for the near-chest pop-up (Yoav 2026-06-22:
// "שיהיה נעים, עם לואו ובצבעים בהירים").
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CONFETTI_LOTTIE = require('../../../../assets/lottie/Confetti Effects Lottie Animation.json');

interface SharkChipCalloutProps {
  /** Increments once per REAL chip completion (hydration-gated, and NOT on the
   *  completion that crosses the chest threshold — that's the chest modal's
   *  moment). A change drives one transient call-out. */
  seq: number;
  /** Chips still needed to open the 70% chest — drives the proximity copy AND
   *  the tier: <=2 → the bright "המשך" pop-up; >=3 → a light auto-dismiss toast. */
  remaining: number;
  /** mod-0-1 / mod-0-2 (50% threshold) → "first chest" framing. */
  isFirstChest: boolean;
  /** Optional override copy. When set, REPLACES the computed proximity line —
   *  lets this toast double as a Captain Shark compliment (continue / 100%). */
  message?: string;
  /** Fired when the user dismisses the BLOCKING pop-up (remaining <= 2) via
   *  "המשך" / backdrop. The parent re-pokes the gold-chip auto-scroll: while a
   *  <Modal> is presented, scrollTo on the ScrollView behind it is dropped, so
   *  the accordion only lands on the next chip AFTER the modal is gone. The
   *  non-blocking toast tier doesn't need this. */
  onPopupContinue?: () => void;
}

const TOAST_MS = 1800;
const TOAST_MS_RM = 700; // reduced-motion: shorter, no confetti
/** remaining <= this → escalate to the full bright pop-up with a Continue button. */
const POPUP_THRESHOLD = 2;

/** Fisher-Yates — app runtime, so Math.random is fine here. */
function shuffle(arr: number[]): number[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Captain Shark chip-completion encouragement, two tiers (Yoav 2026-06-22):
 *  • early chips (remaining >= 3): a light, BRIGHT, auto-dismissing toast —
 *    rotating mascot webp + proximity line + gentle confetti, no button.
 *  • approaching the chest (remaining <= 2): a pleasant BRIGHT pop-up modal —
 *    rotating webp + a confetti Lottie + the proximity line + a "המשך" button
 *    the user taps to continue.
 * Webps never repeat back-to-back (shuffled rotation). Presentational — the
 * accordion owns the once-per-completion trigger via `seq`.
 */
export const SharkChipCallout = React.memo(function SharkChipCallout({
  seq,
  remaining,
  isFirstChest,
  message,
  onPopupContinue,
}: SharkChipCalloutProps) {
  const reduceMotion = useReducedMotion();
  const safeTimeout = useTimeoutCleanup();

  const [toastVisible, setToastVisible] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [webpIndex, setWebpIndex] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [shownMessage, setShownMessage] = useState('');

  // Non-repeating rotation over the webp pool, reshuffled when exhausted so
  // the user keeps seeing a fresh mascot each completion.
  const rotationRef = useRef<number[]>([]);
  const cursorRef = useRef(0);
  const lastSeqRef = useRef(0);
  // True while a toast OR pop-up is on screen — absorbs new triggers so only
  // ONE call-out shows at a time (no webps "opening one after another").
  const showingRef = useRef(false);

  useEffect(() => {
    const n = CHIP_CALLOUT_WEBPS.length;
    rotationRef.current = shuffle(Array.from({ length: n }, (_, i) => i));
    cursorRef.current = 0;
  }, []);

  useEffect(() => {
    if (seq <= 0 || seq === lastSeqRef.current) return;
    // Only ONE call-out at a time — absorb triggers that arrive while one is
    // still on screen so webps don't open one after another (Yoav 2026-06-22).
    if (showingRef.current) { lastSeqRef.current = seq; return; }
    lastSeqRef.current = seq;
    if (CHIP_CALLOUT_WEBPS.length === 0) return;
    if (cursorRef.current >= rotationRef.current.length) {
      rotationRef.current = shuffle(rotationRef.current);
      cursorRef.current = 0;
    }
    setWebpIndex(rotationRef.current[cursorRef.current] ?? 0);
    cursorRef.current += 1;
    setShownMessage(message ?? calloutMessage(remaining, isFirstChest));
    setConfettiKey((k) => k + 1);
    showingRef.current = true;
    try { successHaptic(); } catch { /* non-fatal */ }
    if (remaining <= POPUP_THRESHOLD) {
      setPopupVisible(true); // stays until the user taps "המשך"
    } else {
      setToastVisible(true);
      safeTimeout(() => { setToastVisible(false); showingRef.current = false; }, reduceMotion ? TOAST_MS_RM : TOAST_MS);
    }
  }, [seq, remaining, isFirstChest, message, reduceMotion, safeTimeout]);

  const handleContinue = useCallback(() => {
    try { tapHaptic(); } catch { /* non-fatal */ }
    setPopupVisible(false);
    showingRef.current = false;
    // Modal is gone now → let the parent land the user on the next gold chip.
    onPopupContinue?.();
  }, [onPopupContinue]);

  const webp = CHIP_CALLOUT_WEBPS[webpIndex] ?? CHIP_CALLOUT_WEBPS[0];
  if (!webp) return null;

  return (
    <>
      {/* ── Tier 1: light bright toast (early chips, remaining >= 3) ── */}
      {toastVisible && (
        <View style={styles.toastWrap} pointerEvents="none">
          {!reduceMotion && <ConfettiExplosion key={`t${confettiKey}`} gentle particleCount={12} />}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(280)}
            exiting={reduceMotion ? undefined : FadeOut.duration(220)}
            style={styles.toastCard}
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            accessibilityLabel={shownMessage}
          >
            <ExpoImage
              source={webp.source}
              style={styles.toastMascot}
              contentFit="contain"
              accessible={false}
              pointerEvents="none"
            />
            <Text style={styles.toastLabel} allowFontScaling={false}>
              {shownMessage}
            </Text>
          </Animated.View>
        </View>
      )}

      {/* ── Tier 2: bright "approaching the chest" pop-up (remaining <= 2) ── */}
      <Modal
        visible={popupVisible}
        transparent
        animationType="fade"
        onRequestClose={handleContinue}
        statusBarTranslucent
      >
        {/* Tap ANYWHERE on the screen continues, not just the button
            (Yoav 2026-06-22). accessible=false so SR reads the labeled button. */}
        <Pressable style={styles.popupBackdrop} onPress={handleContinue} accessible={false}>
          {!reduceMotion && (
            <View style={styles.popupLottie} pointerEvents="none">
              <LottieView source={CONFETTI_LOTTIE} autoPlay loop={false} style={StyleSheet.absoluteFill} />
            </View>
          )}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInUp.duration(320)}
            style={styles.popupCard}
          >
            <ExpoImage
              source={webp.source}
              style={styles.popupMascot}
              contentFit="contain"
              accessible={false}
              pointerEvents="none"
            />
            <Text style={styles.popupTitle} allowFontScaling={false}>
              {shownMessage}
            </Text>
            {/* The blue fill lives on an INNER View — a function-style Pressable
                (style={({pressed})=>…}) DROPS backgroundColor on Android, leaving
                white-on-white text (exactly what Yoav saw). */}
            <Pressable
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="המשך"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {({ pressed }) => (
                <View style={[styles.continueBtn, pressed && styles.continuePressed]}>
                  <Text style={styles.continueText} allowFontScaling={false}>המשך</Text>
                  <ChevronLeft size={18} color="#ffffff" />
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  // ── Toast (bright, top-anchored, non-blocking) ──
  toastWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
    zIndex: 40,
  },
  toastCard: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingStart: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#38bdf8',
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    maxWidth: '92%',
  },
  toastMascot: {
    width: 52,
    height: 52,
    backgroundColor: 'transparent', // black-box fix for transparent webp
  },
  toastLabel: {
    color: '#0c4a6e',
    fontSize: 14,
    fontWeight: '800',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },

  // ── Pop-up (bright, blocking, Continue button) ──
  popupBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 47, 73, 0.45)',
    paddingHorizontal: 28,
  },
  popupLottie: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  popupCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f7fbff',
    borderRadius: 28,
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#7dd3fc',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    zIndex: 3,
  },
  popupMascot: {
    width: 150,
    height: 150,
    backgroundColor: 'transparent',
  },
  popupTitle: {
    color: '#0c4a6e',
    fontSize: 22,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  // Matches the flashcards' "המשך" button (LessonFlowScreen): sky-blue
  // #0ea5e9 fill, 3px #0284c7 bottom border, white 16/800 text + ChevronLeft.
  continueBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderBottomWidth: 3,
    borderBottomColor: '#0284c7',
  },
  continuePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
});
