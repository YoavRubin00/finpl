/**
 * ParentalConsentGate — rendered in place of the upgrade CTA on PricingScreen
 * when the user is a minor (16-17). Three internal sub-states:
 *
 *   1. status === 'none' | 'expired' | 'revoked'
 *      → input field for parent email + "send" button.
 *
 *   2. status === 'pending'
 *      → "we sent an email to a***@gmail.com" + "resend" + "use different email"
 *      → polls server every 30s for auto-refresh.
 *
 *   3. status === 'confirmed'
 *      → green "parent approved, you can subscribe now" banner.
 *        (The actual upgrade button rendering is handled by the parent
 *        component — this panel just signals the unlock.)
 *
 * Design: matches the styles.minorGate look-and-feel from PricingScreen so
 * the swap is seamless. Calm copy, no scary red boxes.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Check, Mail, RotateCcw } from 'lucide-react-native';
import {
  selectHasActiveParentalConsent,
  useParentalConsentStore,
} from './useParentalConsent';

interface Props {
  /** Called when the parent confirms — parent should rerender into Pro upgrade UI. */
  onConsentConfirmed?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ParentalConsentGate({ onConsentConfirmed }: Props): React.ReactElement {
  const status = useParentalConsentStore((s) => s.status);
  const parentEmail = useParentalConsentStore((s) => s.parentEmail);
  const requestedAt = useParentalConsentStore((s) => s.requestedAt);
  const requestConsent = useParentalConsentStore((s) => s.requestConsent);
  const refreshStatus = useParentalConsentStore((s) => s.refreshStatus);
  const hasConsent = useParentalConsentStore(selectHasActiveParentalConsent);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refresh on mount + poll while pending (every 30s; server-side throttle
  // is the same so even with two screens up we don't spam Neon).
  useEffect(() => {
    void refreshStatus({ force: true });
  }, [refreshStatus]);
  useEffect(() => {
    if (status !== 'pending') return;
    const id = setInterval(() => { void refreshStatus(); }, 30_000);
    return () => clearInterval(id);
  }, [status, refreshStatus]);

  // Notify parent when consent flips to confirmed.
  useEffect(() => {
    if (hasConsent) onConsentConfirmed?.();
  }, [hasConsent, onConsentConfirmed]);

  const canSubmit = useMemo(() => EMAIL_RE.test(email.trim()) && !submitting, [email, submitting]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await requestConsent(email.trim().toLowerCase());
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(
        result.error === 'invalid payload' ? 'נא להזין כתובת אימייל תקינה.'
          : result.error === 'unauthorized' ? 'נדרשת התחברות מחדש.'
            : 'לא הצלחנו לשלוח את האימייל. נסה/י שוב בעוד רגע.',
      );
    }
  }, [canSubmit, email, requestConsent]);

  const handleResend = useCallback(async () => {
    setSubmitting(true);
    setErrorMsg(null);
    // requestConsent with the masked email will be rejected server-side;
    // for resend we just re-send to whatever the user typed last. If the
    // store doesn't have a typed email anymore, ask for a fresh one.
    if (!parentEmail) {
      setSubmitting(false);
      setErrorMsg('נא להזין את האימייל של ההורה מחדש.');
      return;
    }
    // Server reuses the existing row's token + email — passing any valid
    // address re-triggers the email send. We pass the masked one knowing
    // the server picks the existing row.
    const result = await requestConsent(parentEmail);
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg('לא הצלחנו לשלוח מחדש. נסה/י שוב בעוד רגע.');
    }
  }, [parentEmail, requestConsent]);

  // ── State 3: Confirmed ──
  if (hasConsent) {
    return (
      <View style={[styles.panel, styles.panelOk]}>
        <View style={styles.iconCircleOk}>
          <Check size={20} color="#16a34a" strokeWidth={3} />
        </View>
        <Text style={styles.titleOk} allowFontScaling={false}>
          ההורה אישר/ה
        </Text>
        <Text style={styles.bodyOk} allowFontScaling={false}>
          תוכל/י להמשיך לרכישת Pro מהכפתור למטה.
        </Text>
      </View>
    );
  }

  // ── State 2: Pending ──
  if (status === 'pending') {
    return (
      <View style={styles.panel}>
        <View style={styles.iconCircle}>
          <Mail size={20} color="#0c4a6e" strokeWidth={2.6} />
        </View>
        <Text style={styles.title} allowFontScaling={false}>
          שלחנו אימייל להורה
        </Text>
        <Text style={styles.body} allowFontScaling={false}>
          {parentEmail
            ? `אימייל אישור נשלח אל ${parentEmail}. ברגע שההורה ילחץ/תלחץ על הקישור — תוכל/י לרכוש Pro.`
            : 'אימייל אישור נשלח. ברגע שההורה יאשר/תאשר — תוכל/י לרכוש Pro.'}
        </Text>
        {requestedAt ? (
          <Text style={styles.meta} allowFontScaling={false}>
            נשלח: {formatRelativeTime(requestedAt)}
          </Text>
        ) : null}

        <Pressable
          onPress={handleResend}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="שליחה מחדש"
          style={({ pressed }) => [
            styles.resendBtn,
            (pressed || submitting) && { opacity: 0.7 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#0c4a6e" />
          ) : (
            <>
              <RotateCcw size={14} color="#0c4a6e" strokeWidth={2.6} />
              <Text style={styles.resendText} allowFontScaling={false}>
                שלח/י שוב
              </Text>
            </>
          )}
        </Pressable>

        {errorMsg ? (
          <Text style={styles.error} allowFontScaling={false}>
            {errorMsg}
          </Text>
        ) : null}
      </View>
    );
  }

  // ── State 1: None / Expired / Revoked ──
  return (
    <View style={styles.panel}>
      <Text style={styles.title} allowFontScaling={false}>
        רכישת Pro דורשת אישור הורה
      </Text>
      <Text style={styles.body} allowFontScaling={false}>
        בני 16–17 צריכים אישור הורה לרכישת מנוי, לפי חוק הכשרות המשפטית.
        הזן/הזיני את האימייל של הורה — נשלח לו/לה קישור לאישור.
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

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="שלח לאישור"
        style={({ pressed }) => [
          styles.submitBtn,
          (!canSubmit || pressed) && { opacity: 0.7 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitText} allowFontScaling={false}>
            שלח לאישור
          </Text>
        )}
      </Pressable>

      {errorMsg ? (
        <Text style={styles.error} allowFontScaling={false}>
          {errorMsg}
        </Text>
      ) : null}

      {status === 'expired' ? (
        <Text style={styles.meta} allowFontScaling={false}>
          הקישור הקודם פג תוקף. ניתן לשלוח חדש.
        </Text>
      ) : status === 'revoked' ? (
        <Text style={styles.meta} allowFontScaling={false}>
          הסכמה קודמת בוטלה. ניתן לבקש מחדש.
        </Text>
      ) : null}
    </View>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'הרגע';
  if (diffSec < 3600) return `לפני ${Math.floor(diffSec / 60)} דקות`;
  if (diffSec < 86400) return `לפני ${Math.floor(diffSec / 3600)} שעות`;
  return `לפני ${Math.floor(diffSec / 86400)} ימים`;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'stretch',
    gap: 10,
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  panelOk: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  iconCircleOk: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  titleOk: {
    fontSize: 16,
    fontWeight: '900',
    color: '#14532d',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 19,
  },
  bodyOk: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14532d',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 19,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  inputWrap: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginTop: 4,
  },
  input: {
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 10,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  submitBtn: {
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
  },
  submitText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  resendBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0c4a6e',
    writingDirection: 'rtl',
  },
  error: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
  },
});
