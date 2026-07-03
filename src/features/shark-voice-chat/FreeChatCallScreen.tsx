import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Dimensions,
  ImageBackground,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { X } from 'lucide-react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tapHaptic } from '../../utils/haptics';
import { useAuthStore } from '../auth/useAuthStore';
import { UnderwaterBubbles } from './components/UnderwaterBubbles';
import { SharkAvatar } from './components/SharkAvatar';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { CallControls } from './components/CallControls';
import { SharkVoiceProvider } from './SharkVoiceProvider';
import { useSharkVoiceStore } from './useSharkVoiceStore';
import { useElevenLabsConversation } from './hooks/useElevenLabsConversation';
import { buildFreeChatOverride, FREE_CHAT_SECONDS, FREE_CHAT_MAX_SECONDS } from './freeChat';
import { captureEvent } from '../../lib/posthog';
import { captureException } from '../../lib/sentry';

const RTL = { writingDirection: 'rtl' as const };

interface Props {
  /** Fired when the call ends — automatically at the minute mark OR on manual
   *  exit. No report phase: the parent just closes the modal. */
  onComplete: () => void;
}

/**
 * Free-form live Captain Shark voice call from the CHAT tab (Pro-only; Yoav
 * 2026-07-03). Mirrors ModuleComprehensionCallScreen's mechanics 1:1 — mic
 * permission, connect-with-override, sign-off detection, hard backstop —
 * with a 60s budget, no fixed topic and no comprehension report. Kept as its
 * own screen (not a mode of the comprehension screen) so the working summary
 * call stays untouched.
 */
export function FreeChatCallScreen(props: Props): React.ReactElement {
  return (
    <SharkVoiceProvider>
      <CallContent {...props} />
    </SharkVoiceProvider>
  );
}

function CallContent({ onComplete }: Props): React.ReactElement {
  const { width: screenW } = useWindowDimensions();
  const trackWidth = Math.max(0, screenW - 40);

  const status = useSharkVoiceStore((s) => s.status);
  const errorMessage = useSharkVoiceStore((s) => s.errorMessage);
  const clearSession = useSharkVoiceStore((s) => s.clearSession);

  const { connect, disconnect, toggleMute } = useElevenLabsConversation();
  const userName = useAuthStore((s) => s.displayName) ?? '';

  const [secondsLeft, setSecondsLeft] = useState(FREE_CHAT_SECONDS);
  const progress = useSharedValue(1);

  const endedRef = useRef(false);
  const connectedRef = useRef(false);
  const timerStartedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  // Flips true once Captain Shark is actually VOICING his goodbye — the call
  // then ends the moment he finishes it (never mid-sentence, never mid-answer).
  const signoffRef = useRef(false);

  // Connect once. Mic permission is requested EXPLICITLY before connecting —
  // the live SDK does not reliably trigger the OS prompt itself (same fix as
  // the comprehension call).
  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    const override = buildFreeChatOverride(userName);

    void (async () => {
      try {
        let perm = await getRecordingPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) {
          perm = await requestRecordingPermissionsAsync();
        }
        try {
          captureEvent('shark_voice_mic_permission', {
            platform: Platform.OS,
            status: perm.granted ? 'granted' : perm.canAskAgain ? 'denied_can_ask' : 'denied_blocked',
          });
        } catch { /* non-fatal */ }
        if (!perm.granted) {
          if (!perm.canAskAgain) {
            useSharkVoiceStore
              .getState()
              .setError('כדי לדבר עם שארק צריך הרשאת מיקרופון. פותחים את ההגדרות, מאשרים מיקרופון, וחוזרים לשיחה.');
            try { Linking.openSettings(); } catch { /* non-fatal */ }
          } else {
            useSharkVoiceStore
              .getState()
              .setError('כדי לדבר עם שארק צריך לאשר גישה למיקרופון ולנסות שוב.');
          }
          return;
        }
      } catch (e) {
        captureException(e as Error, { feature: 'shark-voice', step: 'mic-permission-free-chat' });
      }
      await connect(override);
    })();

    return () => {
      void disconnect();
      clearSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // End the call (auto at the minute mark or manual). Idempotent; no report.
  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    void disconnect();
    try {
      if (elapsedRef.current > 0) {
        const turns = useSharkVoiceStore.getState().turns;
        captureEvent('shark_voice_call_completed', {
          platform: Platform.OS,
          module_id: 'free_chat',
          duration_sec: elapsedRef.current,
          turns: turns.length,
        });
      }
    } catch { /* non-fatal */ }
    onComplete();
  }, [disconnect, onComplete]);

  // Start the countdown once the call is actually live. FREE_CHAT_SECONDS is
  // the SOFT target the agent wraps up by (drives the visual countdown);
  // the call really ends when the shark finishes his spoken "נתראה" goodbye,
  // with FREE_CHAT_MAX_SECONDS as the hard backstop.
  useEffect(() => {
    const active = status === 'listening' || status === 'thinking' || status === 'speaking';
    if (!active || timerStartedRef.current) return;
    timerStartedRef.current = true;
    progress.value = withTiming(0, { duration: FREE_CHAT_SECONDS * 1000, easing: Easing.linear });
    tickRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const elapsed = elapsedRef.current;
      const state = useSharkVoiceStore.getState();
      if (
        !signoffRef.current
        && state.status === 'speaking'
        && state.sharkText.includes('נתראה')
      ) {
        signoffRef.current = true;
      }
      if (elapsed >= FREE_CHAT_MAX_SECONDS) { finish(); return; }
      if (signoffRef.current && state.status !== 'speaking') { finish(); return; }
      setSecondsLeft(Math.max(0, FREE_CHAT_SECONDS - elapsed));
    }, 1000);
  }, [status, finish, progress]);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  const barStyle = useAnimatedStyle(() => ({ width: progress.value * trackWidth }));

  const handleClose = () => {
    tapHaptic();
    finish();
  };

  const connecting = status === 'connecting' || status === 'idle';

  return (
    <View style={{ flex: 1, backgroundColor: '#06182f' }}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../../../assets/IMAGES/shark-voice-bg.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(2,12,28,0.5)', 'rgba(2,12,28,0)', 'rgba(2,12,28,0.65)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <UnderwaterBubbles />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Top bar — countdown + close */}
        <View style={styles.topBar}>
          <View style={styles.timePill}>
            <Text style={[RTL, styles.timeText]}>
              {connecting ? 'מתחבר…' : secondsLeft > 0 ? `0:${String(secondsLeft).padStart(2, '0')}` : 'מסיימים…'}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="סיום השיחה"
            style={styles.closeBtn}
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Centerpiece */}
        <View style={styles.center}>
          <Text style={[RTL, styles.kicker]}>שיחה חיה · קפטן שארק</Text>
          <SharkAvatar size={Math.min(Dimensions.get('window').width * 0.62, 280)} />
          <Text style={[RTL, styles.title]} numberOfLines={1}>
            דקה עם שארק
          </Text>
          <TranscriptOverlay />
          {errorMessage ? (
            <Text style={[RTL, styles.error]}>{errorMessage}</Text>
          ) : null}
        </View>

        {/* Countdown bar */}
        <View style={styles.trackWrap}>
          <View style={[styles.track, { width: trackWidth }]}>
            <Animated.View style={[styles.fill, barStyle]} />
          </View>
        </View>

        <CallControls onEndCall={handleClose} onToggleMute={toggleMute} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  timePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timeText: { color: '#e2e8f0', fontSize: 13, fontWeight: '700' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 12 },
  kicker: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  error: { color: '#fca5a5', fontSize: 14, paddingHorizontal: 24, textAlign: 'center' },
  trackWrap: { alignItems: 'center', paddingBottom: 10 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#38bdf8' },
});
