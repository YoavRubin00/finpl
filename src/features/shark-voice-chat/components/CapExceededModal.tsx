import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface CapExceededModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CapExceededModal({ visible, onClose }: CapExceededModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 360,
            alignItems: 'center',
            gap: 16,
          }}
        >
          <ExpoImage
            source={require('../../../../assets/webp/fin-tablet-1.webp')}
            style={{ width: 120, height: 120 }}
            contentFit="contain"
          />
          <Text style={[RTL, { color: '#fff', fontSize: 20, fontWeight: '700' }]}>
            השארק עייף 🦈
          </Text>
          <Text style={[RTL, { color: '#cbd5e1', fontSize: 15, lineHeight: 22 }]}>
            הגעת לעשר דקות השיחה היומיות שלך. נדבר שוב מחר!
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={{
              marginTop: 4,
              backgroundColor: '#3b82f6',
              paddingHorizontal: 32,
              paddingVertical: 12,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>סבבה</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
