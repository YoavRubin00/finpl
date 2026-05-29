import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StatusBar, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../utils/haptics';
import { UnderwaterBubbles } from './components/UnderwaterBubbles';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';
import { useSharkVoiceStore } from './useSharkVoiceStore';
import { useElevenLabsConversation } from './hooks/useElevenLabsConversation';
import { SharkAvatar } from './components/SharkAvatar';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { CallControls } from './components/CallControls';
import { CapExceededModal } from './components/CapExceededModal';
import { SharkVoiceProvider } from './SharkVoiceProvider';

const RTL = { writingDirection: 'rtl' as const };
const TICK_SECONDS = 5;

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SharkVoiceCallScreen(): React.ReactElement {
  // On native the ElevenLabs SDK requires its ConversationProvider to be
  // mounted above any component that calls `useConversation`. The provider
  // is a passthrough on web (see `SharkVoiceProvider.tsx`).
  return (
    <SharkVoiceProvider>
      <SharkVoiceCallContent />
    </SharkVoiceProvider>
  );
}

function SharkVoiceCallContent(): React.ReactElement {
  const canUseSharkVoice = useSubscriptionStore((s) => s.canUseSharkVoice);
  const getRemaining = useSubscriptionStore((s) => s.getSharkVoiceSecondsRemaining);
  const recordUsage = useSubscriptionStore((s) => s.recordSharkVoiceUsage);
  const isPro = useSubscriptionStore((s) => s.isPro());
  const showUpgradeModal = useUpgradeModalStore((s) => s.show);

  const status = useSharkVoiceStore((s) => s.status);
  const errorMessage = useSharkVoiceStore((s) => s.errorMessage);
  const clearSession = useSharkVoiceStore((s) => s.clearSession);

  const { connect, disconnect, toggleMute } = useElevenLabsConversation();

  const [capModalVisible, setCapModalVisible] = useState(false);
  const [remaining, setRemaining] = useState<number>(getRemaining());

  const hasStartedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: gate the screen, then connect.
  useEffect(() => {
    if (!canUseSharkVoice()) {
      setCapModalVisible(true);
      return;
    }
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      void connect();
    }
    return () => {
      disconnect();
      clearSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Usage timer — only counts wall-clock during active session states.
  useEffect(() => {
    const isActive =
      status === 'listening' || status === 'thinking' || status === 'speaking';
    if (!isActive) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      recordUsage(TICK_SECONDS);
      const left = getRemaining();
      setRemaining(left);
      if (left <= 0) {
        disconnect();
        setCapModalVisible(true);
      }
    }, TICK_SECONDS * 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [status, disconnect, getRemaining, recordUsage]);

  // Always return to chat — the call is conceptually a chat session, not a
  // free-floating screen. Using `router.back()` can land on whatever tab the
  // user was on before opening chat (e.g. learning), which feels jarring.
  const handleClose = () => {
    tapHaptic();
    void disconnect();
    router.replace('/(tabs)/chat' as never);
  };

  const handleCapAcknowledge = () => {
    setCapModalVisible(false);
    router.replace('/(tabs)/chat' as never);
  };

  const handleCapUpgrade = () => {
    setCapModalVisible(false);
    router.replace('/(tabs)/chat' as never);
    // Defer so the navigation transition completes before the modal pops in.
    setTimeout(() => showUpgradeModal('shark-voice'), 250);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f6c3b8' }}>
      <StatusBar barStyle="light-content" />
      {/* Studio backdrop — full-bleed cover. The peach-tinted gradient
          underneath catches any letterboxing on extreme aspect ratios so
          the seams never show. */}
      <LinearGradient
        colors={['#fbd7ce', '#f6c3b8', '#e8a89a']}
        locations={[0, 0.55, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ImageBackground
        source={require('../../../assets/IMAGES/shark-voice-stage.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        imageStyle={{ resizeMode: 'contain' }}
        resizeMode="contain"
      />
      {/* Soft dark vignette to keep top/bottom UI legible over the busy image. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Subtle ambient bubbles drifting upward — adds life over the static stage */}
      <UnderwaterBubbles />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Top bar — close X (RTL: visually left) + remaining time */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
            }}
          >
            <Text style={[RTL, { color: '#e2e8f0', fontSize: 13, fontWeight: '600' }]}>
              נותרו {formatRemaining(remaining)}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="סגור שיחה"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Centerpiece — avatar pushed below center so the studio backdrop
            stays the visual hero; the WebP is intentionally smaller now. */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            paddingBottom: 24,
          }}
        >
          <SharkAvatar size={Math.min(Dimensions.get('window').width * 0.5, 220)} />
          <Text
            style={[
              RTL,
              {
                color: '#fff',
                fontSize: 28,
                fontWeight: '800',
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
                letterSpacing: 0.5,
              },
            ]}
          >
            קפטן שארק
          </Text>
          <TranscriptOverlay />
          {errorMessage ? (
            <Text style={[RTL, { color: '#fca5a5', fontSize: 14, paddingHorizontal: 24 }]}>
              {errorMessage}
            </Text>
          ) : null}
        </View>

        <CallControls onEndCall={handleClose} onToggleMute={toggleMute} />
      </SafeAreaView>

      <CapExceededModal
        visible={capModalVisible}
        reason={isPro ? 'daily-cap' : 'free-trial-over'}
        onClose={handleCapAcknowledge}
        onUpgrade={handleCapUpgrade}
      />
    </View>
  );
}
