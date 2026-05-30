import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { tapHaptic } from '../../../utils/haptics';
import { BASIC_LIMITS, PRO_LIMITS } from '../../subscription/subscriptionConstants';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface Props {
  visible: boolean;
  mode: 'quick' | 'deep';
  isPro: boolean;
  onClose: () => void;
}

export function CapExceededAnalystModal({ visible, mode, isPro, onClose }: Props): React.ReactElement {
  const isDeep = mode === 'deep';
  // Pro users can also hit a cap on deep analyses (PRO_LIMITS["analyst-deep"]
  // = 5/week) because each deep call fans out several AI requests. When a
  // Pro user hits the cap, the upgrade CTA makes no sense — replace with a
  // "resets next week" message and a close button only.
  const isProDeepCap = isPro && isDeep;

  const title = isProDeepCap
    ? `הגעת ל-${PRO_LIMITS['analyst-deep']} ניתוחי עומק השבוע`
    : isDeep
      ? 'נגמרה המכסה השבועית של ניתוחי העומק'
      : 'נגמרה המכסה היומית של הניתוחים המהירים';

  const body = isProDeepCap
    ? `ניתוחי עומק דורשים עבודת AI כבדה, אז אנחנו שומרים על ${PRO_LIMITS['analyst-deep']} בשבוע גם ל-PRO. המכסה מתאפסת בתחילת השבוע הבא — בינתיים תשתמש בניתוחים מהירים, הם ללא הגבלה.`
    : isDeep
      ? `ב‑Free מקבלים ${BASIC_LIMITS['analyst-deep']} ניתוח עומק בשבוע. ב‑PRO מקבלים ${PRO_LIMITS['analyst-deep']} בשבוע — כולל follow-up, מצגי תזרים ובדיקות שווי.`
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
            {/* Upgrade CTA only when the user can actually upgrade (Free
                hitting any cap). Pro users hitting the deep-analyst cap
                see "close" only — upgrading to a higher tier doesn't exist
                yet, and a fake upgrade prompt would be a dark pattern. */}
            {!isProDeepCap ? (
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
            ) : null}
            <Pressable
              onPress={() => {
                tapHaptic();
                onClose();
              }}
              accessibilityRole="button"
              style={{ paddingVertical: isProDeepCap ? 14 : 10, alignItems: 'center' }}
            >
              <Text style={{ color: isProDeepCap ? '#fff' : '#94a3b8', fontSize: isProDeepCap ? 15 : 13, fontWeight: '700' }}>
                {isProDeepCap ? 'הבנתי' : 'חזרה'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
