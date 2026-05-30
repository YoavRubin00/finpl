// Full-screen blocking overlay shown when the user's bundle version is below
// the remotely-configured minSupportedVersion. No dismiss, no "Remind me
// later" — the only path forward is tapping the CTA to the App Store / Play
// Store. Copy lives in the remote config (AppConfig) so the message can be
// updated without a fresh OTA, which matters during urgent rollouts.

import React, { useEffect } from 'react';
import { Modal, Pressable, Text, View, StyleSheet, Linking, Platform, BackHandler } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { captureEvent } from '../../lib/posthog';
import { tapHaptic } from '../../utils/haptics';
import type { AppConfig } from '../../lib/appConfig';

const RTL_STYLE = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface ForceUpdateScreenProps {
  config: AppConfig;
  currentVersion: string;
}

export function ForceUpdateScreen({ config, currentVersion }: ForceUpdateScreenProps): React.JSX.Element {
  useEffect(() => {
    try {
      captureEvent('force_update_shown', {
        current_version: currentVersion,
        min_supported_version: config.minSupportedVersion,
      });
    } catch { /* non-fatal */ }
  }, [currentVersion, config.minSupportedVersion]);

  // Block Android hardware back. The whole point of this gate is that the
  // user can't get past it without updating — letting back collapse the
  // overlay would defeat that. iOS swipe-back doesn't trigger on a Modal.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const handleUpdate = () => {
    tapHaptic();
    const url = Platform.OS === 'ios' ? config.iosStoreUrl : config.androidStoreUrl;
    try {
      captureEvent('force_update_cta_tapped', {
        current_version: currentVersion,
        target_store: Platform.OS === 'ios' ? 'app_store' : 'play_store',
      });
    } catch { /* non-fatal */ }
    Linking.openURL(url).catch(() => {
      // Some Android devices don't resolve `market://` URLs (no Play Store).
      // Fall back to the web URL. iOS itms-apps:// is universally supported.
      if (Platform.OS === 'android') {
        Linking.openURL('https://play.google.com/store/apps/details?id=com.finplay.app').catch(() => {
          // Last resort — nothing we can do, user has no working store.
        });
      }
    });
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => { /* no-op: blocked */ }}>
      <View style={styles.root}>
        <View style={styles.card}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={styles.finn} contentFit="contain" />
          <Text style={[styles.title, RTL_STYLE]}>{config.title}</Text>
          <Text style={[styles.message, RTL_STYLE]}>{config.message}</Text>
          <Pressable
            onPress={handleUpdate}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
            accessibilityRole="button"
            accessibilityLabel={config.ctaLabel}
          >
            <Text style={styles.ctaText}>{config.ctaLabel}</Text>
          </Pressable>
          <Text style={[styles.versionFootnote, RTL_STYLE]}>
            {`גרסה נוכחית: ${currentVersion} • נדרשת: ${config.minSupportedVersion}`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c4a6e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#e0f2fe',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.35)',
  },
  finn: {
    width: 110,
    height: 110,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 24,
    marginBottom: 24,
  },
  cta: {
    width: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  versionFootnote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 14,
  },
});
