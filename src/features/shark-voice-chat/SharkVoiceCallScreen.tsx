import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StatusBar, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../utils/haptics';
import { UnderwaterBubbles } from './components/UnderwaterBubbles';
import { useIsPro } from '../subscription/useSubscription';
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
// Pro chat-call session cap (10 min). The brought-in screen used a server-backed
// usage store (removed on dev); we cap locally per session instead.
const CHAT_CALL_MAX_SECONDS = 600;

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
  const isPro = useIsPro();
  const showUpgradeModal = useUpgradeModalStore((s) => s.show);

  const status = useSharkVoiceStore((s) => s.status);
  const errorMessage = useSharkVoiceStore((s) => s.errorMessage);
  const clearSession = useSharkVoiceStore((s) => s.clearSession);

  const { connect, disconnect, toggleMute } = useElevenLabsConversation();

  const [capModalVisible, setCapModalVisible] = useState(false);
  const [remaining, setRemaining] = useState<number>(CHAT_CALL_MAX_SECONDS);

  const hasStartedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: gate the screen, then connect.
  useEffect(() => {
    if (!isPro) {
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
      setRemaining((prev) => {
        const left = Math.max(0, prev - TICK_SECONDS);
        if (left <= 0) {
          void disconnect();
          setCapModalVisible(true);
        }
        return left;
      });
    }, TICK_SECONDS * 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [status, disconnect]);

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
    <View style={{ flex: 1, backgroundColor: '#06182f' }}>
      <StatusBar barStyle="light-content" />
      {/* Cinematic underwater backdrop — full-bleed cover (Higgsfield, 2026-06-21).
          The deep-ocean fill underneath catches any letterboxing on extreme
          aspect ratios so the seams never show. */}
      <ImageBackground
        source={require('../../../assets/IMAGES/shark-voice-bg.jpg')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      />
      {/* Soft dark vignette to keep top/bottom UI legible over the scene. */}
      <LinearGradient
        colors={['rgba(2,12,28,0.45)', 'rgba(2,12,28,0)', 'rgba(2,12,28,0.6)']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Ambient bubbles drifting upward — adds life over the scene */}
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

        {/* Centerpiece — the captain sits in the god-ray center of the scene
            and is the visual hero of the live call. */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            paddingBottom: 24,
          }}
        >
          <SharkAvatar size={Math.min(Dimensions.get('window').width * 0.62, 280)} />
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
