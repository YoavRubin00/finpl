import React from 'react';
import { View, Text } from 'react-native';
import { useSharkVoiceStore } from '../useSharkVoiceStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

export function TranscriptOverlay(): React.ReactElement {
  const userTranscript = useSharkVoiceStore((s) => s.userTranscript);
  const sharkText = useSharkVoiceStore((s) => s.sharkText);
  const status = useSharkVoiceStore((s) => s.status);

  const statusLine = (() => {
    switch (status) {
      case 'connecting':
        return 'מתחבר…';
      case 'listening':
        return 'אני מקשיב';
      case 'thinking':
        return 'חושב…';
      case 'speaking':
        return null;
      case 'error':
        return 'משהו השתבש';
      default:
        return 'מוכן לשיחה';
    }
  })();

  return (
    <View
      style={{
        paddingHorizontal: 24,
        gap: 10,
        minHeight: 96,
        justifyContent: 'center',
      }}
    >
      {userTranscript ? (
        <Text
          numberOfLines={2}
          style={[
            RTL,
            { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
          ]}
        >
          {'⁧' + userTranscript + '⁩'}
        </Text>
      ) : null}

      {sharkText ? (
        <Text
          numberOfLines={3}
          style={[
            RTL,
            { color: '#ffffff', fontSize: 18, fontWeight: '600', lineHeight: 26 },
          ]}
        >
          {'⁧' + sharkText + '⁩'}
        </Text>
      ) : statusLine ? (
        <Text
          style={[
            RTL,
            { color: '#cbd5e1', fontSize: 16, fontWeight: '500' },
          ]}
        >
          {statusLine}
        </Text>
      ) : null}
    </View>
  );
}
