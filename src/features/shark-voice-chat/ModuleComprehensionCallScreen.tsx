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
import { useModuleComprehensionStore } from './useModuleComprehensionStore';
import {
  getModuleComprehension,
  buildComprehensionForModule,
  buildComprehensionOverride,
} from './moduleComprehension';
import { captureEvent } from '../../lib/posthog';
import { captureException } from '../../lib/sentry';

const RTL = { writingDirection: 'rtl' as const };
const CALL_SECONDS = 45;
// Hard ceiling: past the 45s soft target we never cut the user off mid-answer —
// we grace until they stop — but the call always ends by this cap (Yoav:
// "extend up to a minute" if the user is still talking).
const MAX_CALL_SECONDS = 60;

interface Props {
  moduleId: string;
  moduleTitle: string;
  /**
   * Fired when the call ends — automatically at 45s OR on manual exit. By the
   * time this fires the transcript has been attached to the module snapshot and
   * report generation has been kicked off, so the parent should switch to the
   * report view.
   */
  onComplete: () => void;
}

/**
 * Live ~45s Captain Shark comprehension call for a single module. The agent is
 * primed with that module's 2 comprehension questions (via startSession
 * overrides). On end, the spoken transcript flows into the module's
 * comprehension report. The provider wrapper is required by the native SDK.
 */
export function ModuleComprehensionCallScreen(props: Props): React.ReactElement {
  return (
    <SharkVoiceProvider>
      <CallContent {...props} />
    </SharkVoiceProvider>
  );
}

function CallContent({ moduleId, moduleTitle, onComplete }: Props): React.ReactElement {
  const { width: screenW } = useWindowDimensions();
  const trackWidth = Math.max(0, screenW - 40);

  const status = useSharkVoiceStore((s) => s.status);
  const errorMessage = useSharkVoiceStore((s) => s.errorMessage);
  const clearSession = useSharkVoiceStore((s) => s.clearSession);
  const attachTranscript = useModuleComprehensionStore((s) => s.attachTranscript);
  const generateReport = useModuleComprehensionStore((s) => s.generateReport);

  const { connect, disconnect, toggleMute } = useElevenLabsConversation();
  const userName = useAuthStore((s) => s.displayName) ?? '';

  const [secondsLeft, setSecondsLeft] = useState(CALL_SECONDS);
  const progress = useSharedValue(1);

  const endedRef = useRef(false);
  const connectedRef = useRef(false);
  const timerStartedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Connect once, primed with this module's comprehension questions. The live
  // SDK needs the mic but does NOT reliably trigger the OS/browser permission
  // prompt itself — so we request it EXPLICITLY here, before connecting. Without
  // this the call silently fails to open with no mic prompt at all (the reported
  // bug). If permission is permanently denied we surface a guide-to-settings msg.
  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    const comp = getModuleComprehension(moduleId) ?? buildComprehensionForModule(moduleId, moduleTitle);
    const override = buildComprehensionOverride(comp, userName);

    void (async () => {
      try {
        let perm = await getRecordingPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) {
          perm = await requestRecordingPermissionsAsync(); // fires the OS/browser prompt
        }
        // Telemetry: the entire pre-connect path was invisible to analytics — the
        // native "call never starts" bug (0 connect_attempt on iOS/Android) went
        // undiagnosed for weeks because the mic gate failed silently. Now the
        // permission outcome is visible per platform in PostHog.
        try {
          captureEvent('shark_voice_mic_permission', {
            platform: Platform.OS,
            status: perm.granted ? 'granted' : perm.canAskAgain ? 'denied_can_ask' : 'denied_blocked',
          });
        } catch { /* non-fatal */ }
        if (!perm.granted) {
          if (!perm.canAskAgain) {
            // Permanently denied — a static message is a dead end. Open the OS
            // Settings so the user can actually flip the mic toggle, then reopen.
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
        // The permission check itself threw — log it (was silent before) and let
        // the SDK attempt its own prompt as a last resort.
        captureException(e as Error, { feature: 'shark-voice', step: 'mic-permission' });
      }
      await connect(override);
    })();

    return () => {
      void disconnect();
      clearSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // End the call (auto at 0s or manual). Attach transcript → kick report gen →
  // tell the parent to show the report. Idempotent.
  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    void disconnect();
    try {
      const turns = useSharkVoiceStore.getState().turns;
      attachTranscript(moduleId, turns);
      void generateReport(moduleId);
    } catch {
      /* non-fatal — the report screen will retry generation */
    }
    onComplete();
  }, [disconnect, attachTranscript, generateReport, moduleId, onComplete]);

  // Start the countdown once the call is actually live (not while connecting).
  // Soft target = CALL_SECONDS (45s). When it's up, we DON'T cut the user off
  // mid-answer: if they're still speaking we grace until they stop, hard-capped
  // at MAX_CALL_SECONDS (60s). Shark delivers the spoken sign-off itself.
  useEffect(() => {
    const active = status === 'listening' || status === 'thinking' || status === 'speaking';
    if (!active || timerStartedRef.current) return;
    timerStartedRef.current = true;
    progress.value = withTiming(0, { duration: CALL_SECONDS * 1000, easing: Easing.linear });
    tickRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const elapsed = elapsedRef.current;
      const userStillAnswering = useSharkVoiceStore.getState().status === 'listening';
      // End at the 45s target — unless the user is mid-answer, then wait for
      // them to finish — but never run past the 60s hard cap.
      if (elapsed >= MAX_CALL_SECONDS || (elapsed >= CALL_SECONDS && !userStillAnswering)) {
        finish();
        return;
      }
      setSecondsLeft(Math.max(0, CALL_SECONDS - elapsed));
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
              {connecting ? 'מתחבר…' : `0:${String(secondsLeft).padStart(2, '0')}`}
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
          <Text style={[RTL, styles.kicker]}>בדיקת הבנה · קפטן שארק</Text>
          <SharkAvatar size={Math.min(Dimensions.get('window').width * 0.62, 280)} />
          <Text style={[RTL, styles.moduleTitle]} numberOfLines={1}>
            {moduleTitle}
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
  moduleTitle: {
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
