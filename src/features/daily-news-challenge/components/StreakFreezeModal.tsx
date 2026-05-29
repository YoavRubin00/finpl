import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Snowflake } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';

interface StreakFreezeModalProps {
  visible: boolean;
  streak: number;
  freezesAvailable: number;
  onUseFreeze: () => void;
  onDismiss: () => void;
}

/**
 * Soft, non-punitive prompt that appears when the user missed yesterday but
 * still has a freeze available. Frames the freeze as a save, never a shame.
 */
export function StreakFreezeModal({
  visible,
  streak,
  freezesAvailable,
  onUseFreeze,
  onDismiss,
}: StreakFreezeModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <Animated.View entering={FadeInDown.duration(260).springify().damping(16)} style={styles.card}>
          <LinearGradient
            colors={['#0ea5e9', '#0c4a6e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Snowflake size={42} color="#fff" strokeWidth={2.2} />
          </LinearGradient>

          <Text style={styles.title} allowFontScaling={false}>קפאון שמר על הרצף שלך</Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            פספסת אתמול, אבל יש לך {freezesAvailable === 1 ? 'קפאון' : `${freezesAvailable} קפאונים`} זמין —
            רוצה להשתמש בו ולשמור על רצף של {streak} ימים?
          </Text>

          <Pressable
            onPress={() => { tapHaptic(); successHaptic(); onUseFreeze(); }}
            accessibilityRole="button"
            accessibilityLabel="השתמש בקפאון"
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryBtnText} allowFontScaling={false}>
              💙 השתמש בקפאון
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { tapHaptic(); onDismiss(); }}
            accessibilityRole="button"
            accessibilityLabel="לא עכשיו"
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText} allowFontScaling={false}>לא עכשיו</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: STITCH.surface,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    writingDirection: 'rtl',
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
});
