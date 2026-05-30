import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { tapHaptic } from '../../../utils/haptics';
import { BASIC_LIMITS } from '../../subscription/subscriptionConstants';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface Props {
  visible: boolean;
  mode: 'quick' | 'deep';
  onClose: () => void;
}

export function CapExceededAnalystModal({ visible, mode, onClose }: Props): React.ReactElement {
  const isDeep = mode === 'deep';
  const title = isDeep ? 'נגמרה המכסה השבועית של ניתוחי העומק' : 'נגמרה המכסה היומית של הניתוחים המהירים';
  const body = isDeep
    ? `ב‑Free מקבלים ${BASIC_LIMITS['analyst-deep']} ניתוח עומק בשבוע. ב‑PRO ניתוחי עומק ללא הגבלה — כולל follow-up, מצגי תזרים ובדיקות שווי.`
    : `ב‑Free מקבלים ${BASIC_LIMITS['analyst-quick']} ניתוחים מהירים ביום. ב‑PRO ניתוחים ללא הגבלה — כל מניה, כל שאלה.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 380,
            alignItems: 'center',
            gap: 14,
          }}
        >
          <ExpoImage
            source={require('../../../../assets/webp/fin-empathic.webp')}
            style={{ width: 120, height: 120 }}
            contentFit="contain"
          />
          <Text style={[RTL, { color: '#fff', fontSize: 19, fontWeight: '900' }]}>{title}</Text>
          <Text style={[RTL, { color: '#cbd5e1', fontSize: 14, lineHeight: 22 }]}>{body}</Text>

          <View style={{ width: '100%', gap: 8, marginTop: 4 }}>
            <Pressable
              onPress={() => {
                tapHaptic();
                onClose();
                router.push('/pricing' as never);
              }}
              accessibilityRole="button"
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0369a1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>שדרג ל-PRO 👑</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                tapHaptic();
                onClose();
              }}
              accessibilityRole="button"
              style={{ paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '700' }}>חזרה</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
