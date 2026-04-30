/**
 * InviteRedemptionScreen — landing for `finplay.me/invite/[code]` deep links.
 *
 * Flow when this screen mounts:
 *   1. Pull `code` from URL (Expo Router useLocalSearchParams).
 *   2. Validate format. Bad codes → toast and bounce to feed/onboarding.
 *   3. Save to AsyncStorage under PENDING_REFERRAL_KEY so the post-signup
 *      hook in `_layout.tsx` can redeem after the user finishes onboarding.
 *   4. If user already authenticated + onboarded, redeem immediately
 *      (calls /api/referral/redeem and shows the bonus result).
 *   5. Bounce to (auth)/onboarding (new user) or (tabs) (existing user).
 *
 * Note: the actual coin grant happens server-side. The local economy store
 * doesn't need to be touched here — `useEconomyStore` is the source of truth
 * but coins flow through the user_profiles sync on next refresh, OR we
 * locally addCoins after a successful redeem (immediate feedback).
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FINN_HELLO } from '../retention-loops/finnMascotConfig';
import { useAuthStore } from '../auth/useAuthStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { redeemReferralCode } from '../../db/sync/syncReferral';
import { REFERRAL_SIGNUP_BONUS_COINS, REFERRAL_COPY } from './referralConstants';
import { successHaptic, heavyHaptic } from '../../utils/haptics';

const PENDING_REFERRAL_KEY = 'pending_referral_code_v1';
const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export function InviteRedemptionScreen() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const email = useAuthStore((s) => s.email);
  const addCoins = useEconomyStore((s) => s.addCoins);

  const [status, setStatus] = useState<'loading' | 'invalid' | 'saved' | 'redeemed' | 'already'>('loading');
  const [bonus, setBonus] = useState<number>(0);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
    const code = (rawCode ?? '').toString().trim().toUpperCase();

    if (!code || !CODE_PATTERN.test(code)) {
      setStatus('invalid');
      // Brief delay so the user sees the message, then bounce.
      setTimeout(() => {
        try { router.replace('/(tabs)' as never); } catch { /* ignore */ }
      }, 1200);
      return;
    }

    (async () => {
      // 1. Always save the pending code locally first, so post-signup hook can pick it up.
      try {
        await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code);
      } catch { /* non-fatal */ }

      // 2. If user is already onboarded, attempt immediate redeem.
      if (isAuthenticated && hasCompletedOnboarding && email) {
        const result = await redeemReferralCode(code, email);
        if (result) {
          // Server granted 500 to both. Reflect locally for instant UX.
          try { addCoins(result.bonusGranted); } catch { /* non-fatal */ }
          // Clear pending marker — already redeemed.
          try { await AsyncStorage.removeItem(PENDING_REFERRAL_KEY); } catch { /* ignore */ }
          successHaptic();
          setBonus(result.bonusGranted);
          setStatus('redeemed');
          setTimeout(() => {
            try { router.replace('/(tabs)' as never); } catch { /* ignore */ }
          }, 2200);
          return;
        }
        // Server rejected (already redeemed / unknown / self-referral).
        setStatus('already');
        try { await AsyncStorage.removeItem(PENDING_REFERRAL_KEY); } catch { /* ignore */ }
        setTimeout(() => {
          try { router.replace('/(tabs)' as never); } catch { /* ignore */ }
        }, 1800);
        return;
      }

      // 3. Not yet onboarded. The post-signup hook will redeem after signup.
      heavyHaptic();
      setStatus('saved');
      setTimeout(() => {
        try {
          if (!isAuthenticated) {
            router.replace('/(auth)/onboarding' as never);
          } else {
            router.replace('/(tabs)' as never);
          }
        } catch { /* ignore */ }
      }, 1800);
    })();
  }, [params.code, isAuthenticated, hasCompletedOnboarding, email, addCoins, router]);

  return (
    <LinearGradient colors={['#0c4a6e', '#0369a1', '#075985']} style={styles.root}>
      <ExpoImage source={FINN_HELLO} style={styles.finn} contentFit="contain" accessible={false} />
      {status === 'loading' && (
        <>
          <Text style={styles.title}>רגע, מעבדים את ההזמנה…</Text>
          <ActivityIndicator color="#7dd3fc" size="large" style={{ marginTop: 16 }} />
        </>
      )}
      {status === 'invalid' && (
        <>
          <Text style={styles.title}>הקוד לא תקין</Text>
          <Text style={styles.subtitle}>בודקים שלא חסר תו. בינתיים נכנס לאפליקציה רגיל.</Text>
        </>
      )}
      {status === 'saved' && (
        <>
          <Text style={styles.title}>נהדר! ההזמנה נקלטה 🎉</Text>
          <Text style={styles.subtitle}>{REFERRAL_COPY.signupBonusHeadline}</Text>
          <Text style={styles.body}>סיימו את ההרשמה והבונוס נכנס מיד.</Text>
        </>
      )}
      {status === 'redeemed' && (
        <>
          <Text style={styles.title}>הצטרפתם בהצלחה! 🎁</Text>
          <Text style={styles.subtitle}>+{bonus.toLocaleString()} מטבעות נוספו לחשבון שלכם</Text>
          <Text style={styles.body}>גם החבר ששלח קיבל מתנה. בואו נתחיל ללמוד.</Text>
        </>
      )}
      {status === 'already' && (
        <>
          <Text style={styles.title}>כבר קישרתם הזמנה בעבר</Text>
          <Text style={styles.subtitle}>אפשר רק קישור אחד לחיים — תודה שהצטרפתם!</Text>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  finn: {
    width: 180,
    height: 180,
    marginBottom: 18,
  },
  title: {
    color: '#f0f9ff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: '#bae6fd',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 12,
  },
  body: {
    color: '#cffafe',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 8,
    lineHeight: 20,
  },
});

/** AsyncStorage key — exported so `_layout.tsx` post-signup hook can read it. */
export const PENDING_REFERRAL_STORAGE_KEY = PENDING_REFERRAL_KEY;
