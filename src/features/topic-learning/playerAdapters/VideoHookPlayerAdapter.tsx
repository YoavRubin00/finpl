import React, { useCallback, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Modal, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { X, Forward } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import type { Module } from '../../chapter-1-content/types';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface VideoHookPlayerAdapterProps {
  module: Module;
  onComplete: () => void;
  onDismiss: () => void;
}

/**
 * Hook video player — plays mod.videoHookAsset to its end then fires
 * onComplete. Re-implements the minimum subset of LessonFlowScreen's
 * inline VideoHookPlayer; the host's analytics + fast-mode toggle are
 * intentionally skipped (the pilot doesn't need them, and PostHog
 * instrumentation is deferred per Yoav's request).
 */
export function VideoHookPlayerAdapter({
  module,
  onComplete,
  onDismiss,
}: VideoHookPlayerAdapterProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);
  const uri = module.videoHookAsset?.uri ?? '';

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  const safeFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => safeFinish());
    return () => sub.remove();
  }, [player, safeFinish]);

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.closeRow, { marginTop: insets.top > 0 ? 0 : 8 }]}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.iconBtn}>
            <X size={22} color="#ffffff" strokeWidth={2.6} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => { tapHaptic(); safeFinish(); }} hitSlop={12} style={styles.iconBtn}>
            <Forward size={20} color="#ffffff" strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.videoWrap}>
          <VideoView player={player} style={styles.video} contentFit="contain" />
        </View>

        <Text style={[styles.hookText, RTL_CENTER]} allowFontScaling={false}>
          {module.videoHook}
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#020617',
  },
  closeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  hookText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fcd34d',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
});
