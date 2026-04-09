import { useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { tapHaptic } from '../../utils/haptics';
import type { GlossaryEntry } from './glossaryData';

interface GlossaryTooltipProps {
  entry: GlossaryEntry | null;
  visible: boolean;
  onClose: () => void;
  /** dark mode for use inside DailyQuizSheet */
  dark?: boolean;
}

export function GlossaryTooltip({ entry, visible, onClose, dark }: GlossaryTooltipProps) {
  const handleClose = useCallback(() => {
    tapHaptic();
    onClose();
  }, [onClose]);

  if (!entry) return null;

  const bg = dark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)';
  const border = dark ? 'rgba(250,204,21,0.25)' : 'rgba(0,0,0,0.08)';
  const textColor = dark ? '#f1f5f9' : '#1c1917';
  const subColor = dark ? 'rgba(255,255,255,0.7)' : '#64748b';
  const pillBg = dark ? 'rgba(250,204,21,0.15)' : 'rgba(14,165,233,0.1)';
  const pillText = dark ? '#facc15' : '#0891b2';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.backdropOverlay}
        />
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(200)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheet, { backgroundColor: bg, borderColor: border }]}
          >
            {/* Emoji + Term header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>{entry.emoji}</Text>
              <View style={[styles.termPill, { backgroundColor: pillBg }]}>
                <Text style={[styles.termText, { color: pillText }]}>{entry.term}</Text>
              </View>
            </View>

            {/* Definition */}
            <Text style={[styles.definition, { color: textColor }]}>
              {entry.definition}
            </Text>

            {/* Dismiss hint */}
            <Text style={[styles.hint, { color: subColor }]}>לחץ בכל מקום לסגירה</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 32,
  },
  termPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  termText: {
    fontSize: 18,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  definition: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 28,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
