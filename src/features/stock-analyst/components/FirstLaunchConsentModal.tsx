import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  visible: boolean;
  onAccept: () => void;
}

/**
 * One-time legal disclaimer modal. Persisted via the store flag — once
 * the user acknowledges, this never reappears.
 */
export function FirstLaunchConsentModal({ visible, onAccept }: Props): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { /* mandatory */ }}>
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
          <LinearGradient
            colors={['#0ea5e9', '#0369a1']}
            style={{ padding: 18, alignItems: 'center', gap: 8 }}
          >
            <ExpoImage
              source={require('../../../../assets/webp/fin-tablet-1.webp')}
              style={{ width: 90, height: 90 }}
              contentFit="contain"
            />
            <Text style={[RTL, { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'center' }]}>
              לפני שנצלול לים, חשוב לדעת
            </Text>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 18, gap: 12 }}>
            <Text style={[RTL, { color: '#0f172a', fontSize: 14, fontWeight: '700' }]}>
              ⚠️ זהו תוכן חינוכי בלבד.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              אנליסט המניות של FinPlay נועד ללמד אותך איך מנתחים מניות, סקטור, סנטימנט וקטליסטים — לא לתת לך הוראת קנייה או מכירה.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              • אנחנו <Text style={{ fontWeight: '800' }}>לא יועצי השקעות מורשים</Text> ולא יועצי מס.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              • כל החלטה פיננסית היא <Text style={{ fontWeight: '800' }}>באחריותך בלבד</Text>. לפני פעולה אמיתית — היוועצ/י ביועצ/ת השקעות מורש/ה.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              • ביצועי עבר של נכס פיננסי <Text style={{ fontWeight: '800' }}>אינם מנבאים את העתיד</Text>.
            </Text>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 21 }]}>
              • השקעה בשוק ההון כרוכה בסיכון, כולל אובדן הקרן.
            </Text>
            <Text style={[RTL, { color: '#0c4a6e', fontSize: 12, marginTop: 4 }]}>
              הניתוחים נכתבים על ידי AI על בסיס נתונים פומביים — ייתכנו טעויות והשמטות.
            </Text>
          </ScrollView>

          <View style={{ padding: 18, paddingTop: 8, gap: 8 }}>
            <Pressable
              onPress={() => {
                tapHaptic();
                onAccept();
              }}
              accessibilityRole="button"
              accessibilityLabel="אני מבין/ה, להמשיך"
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#0ea5e9', '#0369a1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
                  הבנתי, להמשיך
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
