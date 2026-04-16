import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { tapHaptic } from '../../../../utils/haptics';
import { getEntry, type GlossaryKey } from './glossary';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface Props {
  glossaryKey: GlossaryKey;
  /** Custom label (defaults to the term name). */
  label?: string;
  /** Variant: "pill" = full button with label, "icon" = just question mark next to inline text */
  variant?: 'pill' | 'icon';
}

export function GlossaryTermPill({ glossaryKey, label, variant = 'pill' }: Props) {
  const [open, setOpen] = useState(false);
  const entry = getEntry(glossaryKey);

  const handleOpen = useCallback(() => {
    tapHaptic();
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const displayLabel = label ?? entry.term;

  return (
    <>
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`פתח הסבר ל${entry.term}`}
        hitSlop={8}
        style={({ pressed }) => [
          variant === 'pill' ? styles.pill : styles.iconWrap,
          pressed && { opacity: 0.75 },
        ]}
      >
        {variant === 'pill' ? (
          <>
            <Text style={styles.pillQuestionMark}>?</Text>
            <Text style={[styles.pillLabel, RTL]}>מה זה {displayLabel}</Text>
          </>
        ) : (
          <Text style={styles.iconQuestionMark}>?</Text>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="סגור הסבר" />
          <Animated.View
            entering={SlideInDown.duration(280).springify().damping(18)}
            exiting={SlideOutDown.duration(220)}
            style={styles.modalSheet}
          >
            <View style={styles.handle} accessible={false} />
            <View style={styles.titleRow}>
              <Text style={styles.titleQuestion}>?</Text>
              <Text style={[styles.title, RTL]}>{entry.term}</Text>
            </View>
            <Text style={[styles.definition, RTL]}>{entry.shortDefinition}</Text>
            {entry.example && (
              <View style={styles.exampleBox}>
                <Text style={[styles.exampleLabel, RTL]}>דוגמה</Text>
                <Text style={[styles.exampleText, RTL]}>{entry.example}</Text>
              </View>
            )}
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="סגור"
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.closeBtnText, RTL_CENTER]}>הבנתי</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
  },
  pillQuestionMark: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0369a1',
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(14,165,233,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconQuestionMark: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0369a1',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  titleQuestion: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(14,165,233,0.15)',
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#0369a1',
  },
  definition: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1e293b',
  },
  exampleBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    gap: 4,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891b2',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  closeBtn: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0369a1',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
