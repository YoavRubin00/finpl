import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getIndicatorInfo } from './chartIndicatorsData';
import type { IndicatorId } from './tradingHubTypes';
import { tapHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface IndicatorInfoSheetProps {
  visible: boolean;
  indicatorId: IndicatorId | null;
  /** MA period currently selected, used so the MA explanation matches what's on-screen. */
  maPeriod: number;
  onClose: () => void;
}

export function IndicatorInfoSheet({ visible, indicatorId, maPeriod, onClose }: IndicatorInfoSheetProps) {
  const insets = useSafeAreaInsets();
  const info = indicatorId ? getIndicatorInfo(indicatorId, maPeriod) : null;

  const handleClose = () => {
    tapHaptic();
    onClose();
  };

  return (
    <Modal visible={visible && info !== null} transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {info && (
          <Animated.View
            entering={FadeInDown.duration(240)}
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom + 12, 20) },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handleBar} />

            <Text style={[RTL, styles.title]}>{info.title}</Text>
            <Text style={[RTL, styles.body]}>{info.body}</Text>

            <View style={styles.exampleWrap}>
              <Text style={[RTL, styles.exampleLabel]}>דוגמה</Text>
              <Text style={[RTL, styles.exampleText]}>{info.example}</Text>
            </View>

            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="הבנתי"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.ctaText}>הבנתי</Text>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handleBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  exampleWrap: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0c4a6e',
    lineHeight: 19,
  },
  cta: {
    backgroundColor: '#0284c7',
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
});
