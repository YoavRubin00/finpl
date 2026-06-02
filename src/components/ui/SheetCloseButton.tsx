import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../utils/haptics';
import { STITCH } from '../../constants/theme';

/**
 * SheetCloseButton, the unified close affordance for every sheet/modal in
 * finPlay. Born from the 2026-06-02 UX pass: the Daily-Challenge dilemma
 * X (large soft pill) was the version Yam preferred, so we lift that exact
 * shape across all sheets.
 *
 * Visual contract (post-2026-06-02 LAN QA, gold-ring removed):
 *   40x40, fully rounded, soft slate fill, NO border ring,
 *   X stroke 2.6 in onSurface. Identical across PearlSheet,
 *   DailyNewsChallengeSheet, and any future sheet that needs a close-X.
 *   Yam reviewed the gold-halo version on device and read it as a stray
 *   "yellow halo on the chevron" that fought the rest of the chrome
 *   (LAN QA 2026-06-02). The clean iOS-style soft pill is the standard now.
 *
 * Behavior contract:
 *   Wraps a tap haptic by default so each call site doesn't re-implement it.
 *   Caller still owns sound + the actual dismiss handler (we don't import
 *   the sound hook here, sheets pick the right cue per surface).
 *
 * Why a component, not a style export: three sheets, three different
 * Pressable wrappers, with subtle haptic ordering quirks. A single
 * component eliminates "did I remember to add hitSlop?" drift across calls.
 */
export interface SheetCloseButtonProps {
  /** Called after the built-in tap haptic fires. */
  onPress: () => void;
  /** Optional override, defaults to "סגור". */
  accessibilityLabel?: string;
  /** Optional positioning wrapper, e.g. absolute placement inside a topbar. */
  style?: StyleProp<ViewStyle>;
  /** Optional X icon swap (e.g. ChevronRight for Pearl). Defaults to X. */
  icon?: 'x' | React.ReactElement;
}

export function SheetCloseButton({
  onPress,
  accessibilityLabel = 'סגור',
  style,
  icon = 'x',
}: SheetCloseButtonProps): React.ReactElement {
  const handlePress = (): void => {
    tapHaptic();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.btn, style, pressed && styles.btnPressed]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.inner}>
        {icon === 'x' ? (
          <X size={22} color={STITCH.onSurface} strokeWidth={2.6} />
        ) : (
          icon
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.06)',
    // No border. The earlier gold ring (1.5px #facc15) read as a stray yellow
    // halo on Yam's LAN QA pass 2026-06-02, fought the rest of the chrome,
    // and made the chevron look like an active alert rather than a passive
    // close affordance. Plain soft pill matches iOS sheet conventions.
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
