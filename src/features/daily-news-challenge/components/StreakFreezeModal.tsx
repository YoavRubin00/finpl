import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X, Snowflake } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';

interface Props {
  visible: boolean;
  streak: number;
  freezesAvailable: number;
  onUseFreeze: () => void;
  onDismiss: () => void;
}

/**
 * Streak Freeze prompt — surfaces inside the Daily News Challenge flow when
 * the user is about to break their daily streak but has freeze tokens to
 * spend. Minimal first cut; visuals will be polished by the design pass.
 */
export function StreakFreezeModal({
  visible,
  streak,
  freezesAvailable,
  onUseFreeze,
  onDismiss,
}: Props): React.ReactElement | null {
  if (!visible) return null;
  const canFreeze = freezesAvailable > 0;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(160)}
      style={s.overlay}
      pointerEvents="box-none"
    >
      <Pressable style={s.backdrop} onPress={onDismiss} accessibilityLabel="סגור" />
      <View style={s.card} pointerEvents="auto">
        <Pressable onPress={onDismiss} hitSlop={12} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="סגור">
          <X size={18} color="#0c4a6e" />
        </Pressable>

        <View style={s.icon}>
          <Snowflake size={36} color="#0ea5e9" />
        </View>
        <Text style={s.title}>לשמור על הרצף?</Text>
        <Text style={s.body}>
          {canFreeze
            ? `יש לך ${freezesAvailable} הקפאה. השתמש כדי לסגור את היום ולשמור על רצף של ${streak} ימים.`
            : `אין לך הקפאות זמינות. יום אחרון לסגור את הרצף של ${streak} ימים.`}
        </Text>

        {canFreeze ? (
          <Pressable
            onPress={() => { tapHaptic(); onUseFreeze(); }}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={s.primaryBtnText}>השתמש בהקפאה</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDismiss}
          style={s.secondaryBtn}
          accessibilityRole="button"
        >
          <Text style={s.secondaryBtnText}>לא עכשיו</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '86%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14,165,233,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(14,165,233,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0c4a6e',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#0ea5e9',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
});
