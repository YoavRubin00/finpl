import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { InteractiveRecallScreen } from '../../sentence-exercise/InteractiveRecallScreen';
import type { Module } from '../../chapter-1-content/types';

interface RecallPlayerProps {
  module: Module;
  onComplete: () => void;
  onDismiss: () => void;
}

const UNIT_COLORS = {
  bg: '#3b82f6',
  dim: '#dbeafe',
  glow: '#93c5fd',
  bottom: '#1d4ed8',
};

/**
 * Wraps InteractiveRecallScreen — its `onComplete(summary)` callback
 * fires after the user finishes every fill-blank + timeline exercise
 * in the recall set for `module.id`. XP/coin grants happen inside the
 * recall screen itself via its own useEconomyUIStore calls, so we
 * intentionally don't double-grant on the topic-tree side.
 */
export function RecallPlayer({ module, onComplete, onDismiss }: RecallPlayerProps): React.ReactElement {
  const handleRecallComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.closeRow}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
        </View>
        <View style={styles.body}>
          <InteractiveRecallScreen
            moduleId={module.id}
            unitColors={UNIT_COLORS}
            onComplete={handleRecallComplete}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  closeRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    zIndex: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
});
