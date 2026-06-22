import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * One-time privacy consent shown before the user's FIRST live voice call with
 * Captain Shark. The call streams the user's microphone audio to a third-party
 * voice partner (ElevenLabs) + the AI for processing, so we disclose that and
 * get explicit approval — mirrors the stock-analyst FirstLaunchConsentModal.
 * Persisted via useTutorialStore.hasAcceptedSharkVoicePrivacy → shown once.
 */
export function SharkVoicePrivacyConsentModal({ visible, onAccept, onDecline }: Props): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 22,
            width: '100%',
            maxWidth: 380,
            maxHeight: '90%',
            overflow: 'hidden',
          }}
        >
          <LinearGradient colors={['#0ea5e9', '#0369a1']} style={{ padding: 18, alignItems: 'center', gap: 8 }}>
            <ExpoImage
              source={require('../../../../assets/webp/shark-call-talking-1.webp')}
              style={{ width: 90, height: 90 }}
              contentFit="contain"
            />
            <Text style={[RTL, { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'center' }]}>
              רגע לפני שמדברים עם שארק
            </Text>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 18, gap: 12 }}>
            <Text style={[RTL, { color: '#0f172a', fontSize: 14, fontWeight: '700' }]}>
              🎙️ השיחה משתמשת במיקרופון שלכם.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              כדי ששארק יבין אתכם ויענה בקול, מה שאתם אומרים{' '}
              <Text style={{ fontWeight: '800' }}>נשלח לעיבוד אצל שותף הקול שלנו (ElevenLabs) ומנוע ה‑AI</Text>.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              • ההקלטה והתמלול משמשים <Text style={{ fontWeight: '800' }}>רק</Text> כדי לנהל את השיחה ולהפיק לכם את
              דוח‑הסיכום — לא לפרסום ולא לשום שימוש אחר.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              • אפשר לעצור את השיחה <Text style={{ fontWeight: '800' }}>בכל רגע</Text>.
            </Text>
            <Pressable onPress={() => Linking.openURL('https://finplay.me/privacy-policy')} accessibilityRole="link">
              <Text style={[RTL, { color: '#0284c7', fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }]}>
                למדיניות הפרטיות המלאה
              </Text>
            </Pressable>
          </ScrollView>

          <View style={{ padding: 18, paddingTop: 8, gap: 10 }}>
            <Pressable
              onPress={() => {
                tapHaptic();
                onAccept();
              }}
              accessibilityRole="button"
              accessibilityLabel="אני מאשר/ת, מתחילים"
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0369a1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>הבנתי, מתחילים</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                tapHaptic();
                onDecline();
              }}
              accessibilityRole="button"
              style={{ paddingVertical: 6, alignItems: 'center' }}
            >
              <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 13 }}>לא עכשיו</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
