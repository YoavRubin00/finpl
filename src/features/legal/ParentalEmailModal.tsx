/**
 * Quick modal shown on the Hybrid flow — when a 16-17 user taps the Pro
 * upgrade CTA. Asks them to enter a parent's email, stores it as a
 * 'pending' parental_consents row (no email sent yet), then fires
 * onEmailSubmitted so the parent screen can immediately launch RevenueCat
 * purchase. After the purchase succeeds, PricingScreen calls
 * useParentalConsentStore.notifyPurchase() which sends the parent the
 * post-purchase notification with a one-click revoke link.
 *
 * NOT the same as ParentalConsentGate.tsx — that's the Hard-gate flow
 * used after a parent revoked, which forces email + parent click BEFORE
 * the purchase can happen.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { useParentalConsentStore } from './useParentalConsent';

interface Props {
  visible: boolean;
  /** Called when the user dismisses without submitting (back-press or X). */
  onCancel: () => void;
  /** Called once the consent row was created on the server. Parent should
   *  now launch the RevenueCat purchase. */
  onEmailSubmitted: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ParentalEmailModal({
  visible,
  onCancel,
  onEmailSubmitted,
}: Props): React.ReactElement {
  const requestConsent = useParentalConsentStore((s) => s.requestConsent);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => EMAIL_RE.test(email.trim()) && !submitting,
    [email, submitting],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await requestConsent(email.trim().toLowerCase(), 'hybrid');
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(
        result.error === 'invalid payload' ? 'נא להזין כתובת אימייל תקינה.'
          : result.error === 'unauthorized' ? 'נדרשת התחברות מחדש.'
            : 'לא הצלחנו לשמור את האימייל. נסה/י שוב.',
      );
      return;
    }
    // Reset form for next time + bubble up to parent so it can launch RC.
    setEmail('');
    onEmailSubmitted();
  }, [canSubmit, email, requestConsent, onEmailSubmitted]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title} allowFontScaling={false}>
            רגע לפני הרכישה
          </Text>
          <Text style={styles.body} allowFontScaling={false}>
            כדי שרכישת המנוי תהיה תקפה משפטית (לפי חוק הכשרות המשפטית),
            ההורה שלך צריך לדעת על הרכישה. נשלח לו/לה אימייל ברגע
            הרכישה, עם אפשרות לבטל בקליק אם לא יסכים/תסכים.
          </Text>

          <Text style={styles.label} allowFontScaling={false}>
            אימייל של הורה
          </Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              style={styles.input}
              accessibilityLabel="אימייל של הורה"
            />
          </View>

          {errorMsg ? (
            <Text style={styles.error} allowFontScaling={false}>
              {errorMsg}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="המשך לרכישה"
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSubmit || pressed) && { opacity: 0.75 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.primaryText} allowFontScaling={false}>
                המשך לרכישה
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="ביטול"
            disabled={submitting}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.55 }]}
          >
            <Text style={styles.cancelText} allowFontScaling={false}>
              לא עכשיו
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 22,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputWrap: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 10,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  error: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  primaryBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#1e3a8a',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginTop: 6,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
});
