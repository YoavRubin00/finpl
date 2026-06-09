import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { SimulatorLoader } from '../../chapter-1-content/SimulatorLoader';
import type { Module } from '../../chapter-1-content/types';

interface SimPlayerProps {
  module: Module;
  onComplete: () => void;
  onDismiss: () => void;
}

/**
 * Module simulator wrapper — delegates to SimulatorLoader which maps
 * `moduleId` to the matching simulation screen (mod-1-1 → CompoundSimScreen,
 * mod-0-2 → FinancialBasicsSim, etc.). Each sim signals completion via
 * its own `onComplete(score)` callback. Score is currently discarded;
 * topic-tree treats sim as a single completable unit regardless of
 * scoring detail.
 */
export function SimPlayer({ module, onComplete, onDismiss }: SimPlayerProps): React.ReactElement {
  const handleSimComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.closeRow}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <X size={22} color="#ffffff" strokeWidth={2.6} />
          </Pressable>
        </View>
        <View style={styles.simWrap}>
          <SimulatorLoader moduleId={module.id} onComplete={handleSimComplete} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0c4a6e',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simWrap: {
    flex: 1,
  },
});
