import React, { useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';

import { SupercellButton } from '../../components/ui/SupercellButton';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';
import {
  CURRENT_TERMS_VERSION,
  TERMS_UPDATE_SUMMARY_HE,
  TERMS_PUBLIC_URL,
  DELETE_ACCOUNT_URL,
} from '../../lib/legal/termsVersion';
import { useTermsStore } from './useTermsStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface Props {
  /** When false, the modal stays mounted but invisible (no animation flicker on first render). */
  visible: boolean;
  /** Called after the user checks the checkbox and presses 'accept'. */
  onAccepted: () => void;
}

export function TermsUpdateModal({ visible, onAccepted }: Props): React.ReactElement {
  const [checked, setChecked] = useState(false);
  const accept = useTermsStore((s) => s.accept);
  const previousVersion = useTermsStore((s) => s.acceptedVersion);

  const handleOpenFullTerms = useCallback(() => {
    tapHaptic();
    Linking.openURL(TERMS_PUBLIC_URL).catch(() => undefined);
  }, []);

  const handleOpenDeleteAccount = useCallback(() => {
    tapHaptic();
    Linking.openURL(DELETE_ACCOUNT_URL).catch(() => undefined);
  }, []);

  const handleToggleCheck = useCallback(() => {
    tapHaptic();
    setChecked((c) => !c);
  }, []);

  const handleAccept = useCallback(() => {
    if (!checked) return;
    successHaptic();
    accept(CURRENT_TERMS_VERSION);
    track({
      name: 'terms_reaccepted',
      props: {
        from_version: previousVersion,
        to_version: CURRENT_TERMS_VERSION,
      },
    });
    onAccepted();
  }, [checked, accept, onAccepted, previousVersion]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      onRequestClose={() => undefined}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerEmoji} allowFontScaling={false}>📜</Text>
        </View>

        <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
          עדכנו את התנאים
        </Text>
        <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
          הוספנו פיצ'רים חדשים — צריך את ההסכמה שלך כדי להמשיך.
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={[styles.cardTitle, RTL]} allowFontScaling={false}>
              מה השתנה ביולי 2026:
            </Text>
            {TERMS_UPDATE_SUMMARY_HE.map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot} allowFontScaling={false}>•</Text>
                <Text style={[styles.bulletText, RTL]} allowFontScaling={false}>
                  {line}
                </Text>
              </View>
            ))}
          </View>

          <Pressable onPress={handleOpenFullTerms} style={styles.linkBtn} hitSlop={8}>
            <Text style={[styles.linkText, RTL_CENTER]} allowFontScaling={false}>
              קרא/י את התנאים המלאים →
            </Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={handleToggleCheck} style={styles.checkboxRow} hitSlop={12}>
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked ? <Check size={18} color="#ffffff" strokeWidth={3} /> : null}
            </View>
            <Text style={[styles.checkboxText, RTL]} allowFontScaling={false}>
              קראתי ואני מסכים/ה לתנאים המעודכנים
            </Text>
          </Pressable>

          <SupercellButton
            label="אישור והמשך"
            variant="green"
            buttonStyle="duo"
            size="lg"
            disabled={!checked}
            onPress={handleAccept}
          />

          <Pressable onPress={handleOpenDeleteAccount} style={styles.deleteBtn} hitSlop={8}>
            <Text style={[styles.deleteText, RTL_CENTER]} allowFontScaling={false}>
              לא מסכים/ה? מחיקת חשבון
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
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 20,
  },
  headerBadge: {
    alignSelf: 'center',
    marginTop: 12,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  headerEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    shadowColor: '#0891b2',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0369a1',
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    marginBottom: 10,
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0ea5e9',
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    lineHeight: 22,
  },
  linkBtn: {
    marginTop: 14,
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
    gap: 14,
  },
  checkboxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#15803d',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  deleteBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textDecorationLine: 'underline',
  },
});
