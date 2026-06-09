import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import { InteractiveIntroCard } from '../../chapter-1-content/InteractiveIntroCard';
import type { Module } from '../../chapter-1-content/types';

/**
 * Intro topic player — wraps the legacy InteractiveIntroCard so the
 * topic-tree experience reuses the exact same Finn-mascot + audio +
 * narrative-text layout the linear-flow uses. Fires `onComplete` when
 * the user taps "בואו נתחיל!" (the card's built-in `onStart` callback,
 * which inside the legacy LessonFlowScreen advances to flashcards).
 *
 * Module.introVariant is intentionally IGNORED here for the pilot —
 * mod-1-1 is flagged `'short'` but has no MODULE_INTRO_CONFIGS entry,
 * so falling through the legacy router would route to the chapter-0
 * "WhatIsMoneyIntro" which is content-inappropriate. Pilot uses
 * InteractiveIntroCard unconditionally because mod-1-1 supplies
 * `interactiveIntro`, `introAudio`, and `introImage` directly.
 */
interface IntroPlayerProps {
  module: Module;
  /** Sky-blue palette mirrors the accordion's gradient so the intro
   *  reads as a continuation of the topic-tree surface. */
  onComplete: () => void;
  onDismiss: () => void;
}

const UNIT_COLORS = {
  bg: '#0ea5e9',
  dim: '#e0f2fe',
  glow: '#0ea5e9',
  bottom: '#0369a1',
};

export function IntroPlayer({ module, onComplete, onDismiss }: IntroPlayerProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  const handleStart = useCallback(() => {
    tapHaptic();
    onComplete();
  }, [onComplete]);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.closeRow, { marginTop: insets.top > 0 ? 4 : 12 }]}>
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
            style={styles.closeBtn}
          >
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <InteractiveIntroCard
            introText={module.interactiveIntro ?? ''}
            audioUri={module.introAudio?.uri}
            // The audio-prefetch hook is only useful when the module's been
            // pre-cached via useModulePrefetch (which LessonFlowScreen does).
            // The topic-tree opens cold, so we just let the audio fetch
            // happen lazily — the hook's internal retry handles it.
            audioReady={true}
            introImageUri={module.introImage?.uri}
            onStart={handleStart}
            unitColors={UNIT_COLORS}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#e0f2fe',
  },
  closeRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingBottom: 4,
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
