import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { X, Check } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import type { Module } from '../../chapter-1-content/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Same blob host used by DuoLearnScreen's PORTRAIT_SUMMARY_URLS. Centralized
// here so adding a new module doesn't require editing two map literals.
const SUMMARY_URL: Record<string, string> = {
  'mod-1-1': 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/mod-1-1/summary-1-1.png',
};

interface InfographicPlayerProps {
  module: Module;
  onComplete: () => void;
  onDismiss: () => void;
}

export function InfographicPlayer({ module, onComplete, onDismiss }: InfographicPlayerProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const uri = SUMMARY_URL[module.id];

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.closeRow}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
        </View>

        <Text style={[styles.title, RTL]} allowFontScaling={false}>
          סיכום: {module.title}
        </Text>

        <View style={styles.imageWrap}>
          {uri ? (
            <ExpoImage
              source={{ uri }}
              style={styles.image}
              contentFit="contain"
              accessible={false}
            />
          ) : (
            <Text style={[styles.placeholder, RTL]} allowFontScaling={false}>
              עוד לא קיים סיכום ויזואלי למודולה זו
            </Text>
          )}
        </View>

        <View style={[styles.ctaRow, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={() => { tapHaptic(); onComplete(); }}
            accessibilityRole="button"
            accessibilityLabel="סיים רכיב"
            style={styles.ctaPrimary}
          >
            <Check size={20} color="#ffffff" strokeWidth={3} />
            <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
              סיימתי לקרוא
            </Text>
          </Pressable>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 12,
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  image: {
    width: '100%',
    height: '100%',
    aspectRatio: 0.75,
  },
  placeholder: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 24,
  },
  ctaRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  ctaPrimary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
});
