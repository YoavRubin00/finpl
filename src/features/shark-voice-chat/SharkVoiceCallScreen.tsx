import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { tapHaptic } from '../../utils/haptics';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useSharkVoiceStore } from './useSharkVoiceStore';
import { useElevenLabsConversation } from './hooks/useElevenLabsConversation';
import { SharkAvatar } from './components/SharkAvatar';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { CallControls } from './components/CallControls';
import { CapExceededModal } from './components/CapExceededModal';

const RTL = { writingDirection: 'rtl' as const };
const TICK_SECONDS = 5;

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SharkVoiceCallScreen(): React.ReactElement {
  if (typeof console !== 'undefined') {
    console.log('[SharkVoice] screen mounting');
  }
  const canUseSharkVoice = useSubscriptionStore((s) => s.canUseSharkVoice);
  const getRemaining = useSubscriptionStore((s) => s.getSharkVoiceSecondsRemaining);
  const recordUsage = useSubscriptionStore((s) => s.recordSharkVoiceUsage);

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

  const handleClose = () => {
    tapHaptic();
    disconnect();
    router.back();
  };

  const handleCapAcknowledge = () => {
    setCapModalVisible(false);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e3a8a']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
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

        {/* Centerpiece */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <SharkAvatar size={260} />
          <Text style={[RTL, { color: '#fff', fontSize: 22, fontWeight: '700' }]}>
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

      <CapExceededModal visible={capModalVisible} onClose={handleCapAcknowledge} />
    </View>
  );
}
