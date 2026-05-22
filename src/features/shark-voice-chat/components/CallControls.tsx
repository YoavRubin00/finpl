import React from 'react';
import { View, Pressable } from 'react-native';
import { Mic, MicOff, PhoneOff } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import { useSharkVoiceStore } from '../useSharkVoiceStore';

interface CallControlsProps {
  onEndCall: () => void;
  onToggleMute: (muted: boolean) => void;
}

export function CallControls({ onEndCall, onToggleMute }: CallControlsProps): React.ReactElement {
  const isMuted = useSharkVoiceStore((s) => s.isMuted);
  const setMuted = useSharkVoiceStore((s) => s.setMuted);

  const handleMuteToggle = () => {
    tapHaptic();
    const next = !isMuted;
    setMuted(next);
    onToggleMute(next);
  };

  const handleEndCall = () => {
    tapHaptic();
    onEndCall();
  };

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 28,
        paddingVertical: 24,
      }}
    >
      <Pressable
        onPress={handleMuteToggle}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'בטל השתקה' : 'השתק מיקרופון'}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: isMuted ? '#475569' : '#1e293b',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isMuted ? <MicOff size={26} color="#fff" /> : <Mic size={26} color="#fff" />}
      </Pressable>

      <Pressable
        onPress={handleEndCall}
        accessibilityRole="button"
        accessibilityLabel="סיים שיחה"
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PhoneOff size={30} color="#fff" />
      </Pressable>
    </View>
  );
}
