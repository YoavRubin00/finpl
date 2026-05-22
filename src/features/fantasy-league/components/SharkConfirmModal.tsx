import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY } from '../../../constants/theme';
import { FINN_TABLET } from '../../retention-loops/finnMascotConfig';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'gold' | 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE: Record<'gold' | 'danger' | 'primary', {
  g: readonly [string, string];
  border: string;
  text: string;
  shadow: string;
}> = {
  gold: {
    g: ['#facc15', '#f59e0b'],
    border: '#92400e',
    text: '#451a03',
    shadow: 'rgba(245,158,11,0.4)',
  },
  primary: {
    g: ['#005bb1', '#0077d6'],
    border: '#1e3a8a',
    text: '#ffffff',
    shadow: 'rgba(0,91,177,0.35)',
  },
  danger: {
    g: ['#dc2626', '#ef4444'],
    border: '#7f1d1d',
    text: '#ffffff',
    shadow: 'rgba(220,38,38,0.35)',
  },
};

export function SharkConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  tone = 'gold',
  onConfirm,
  onCancel,
}: Props): React.ReactElement {
  const t = TONE[tone];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: FANTASY.surfaceCard,
              borderRadius: 22,
              paddingHorizontal: 20,
              paddingTop: 60,
              paddingBottom: 18,
              shadowColor: '#0f172a',
              shadowOpacity: 0.25,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 24,
              elevation: 12,
              alignItems: 'center',
            }}
          >
            {/* Captain Shark — floats above the card */}
            <View
              style={{
                position: 'absolute',
                top: -48,
                alignSelf: 'center',
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: FANTASY.bg,
                borderWidth: 3,
                borderColor: '#7dd3fc',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#facc15',
                shadowOpacity: 0.5,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              }}
            >
              <ExpoImage
                source={FINN_TABLET}
                style={{ width: 84, height: 84 }}
                contentFit="contain"
                accessible={false}
              />
            </View>

            {/* Eyebrow */}
            <Text
              style={{
                fontSize: 10,
                fontWeight: '900',
                color: FANTASY.gold,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              קפטן שארק
            </Text>

            {/* Title */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: FANTASY.ink,
                textAlign: 'center',
                writingDirection: 'rtl',
                marginBottom: 8,
              }}
            >
              {title}
            </Text>

            {/* Message */}
            <Text
              style={{
                fontSize: 13,
                color: FANTASY.inkMuted,
                textAlign: 'center',
                writingDirection: 'rtl',
                lineHeight: 19,
                marginBottom: 18,
              }}
            >
              {message}
            </Text>

            {/* Buttons */}
            <View style={{ flexDirection: 'row-reverse', gap: 8, width: '100%' }}>
              <Pressable
                onPress={onConfirm}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                style={({ pressed }) => ({
                  flex: 1.4,
                  borderRadius: 12,
                  overflow: 'hidden',
                  opacity: pressed ? 0.9 : 1,
                  shadowColor: t.shadow,
                  shadowOpacity: 0.7,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                })}
              >
                <LinearGradient
                  colors={t.g}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderBottomWidth: 3,
                    borderBottomColor: t.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '900', color: t.text, letterSpacing: 0.3 }}>
                    {confirmLabel}
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: pressed ? FANTASY.surfaceMuted : FANTASY.surfaceLow,
                  borderWidth: 1.5,
                  borderColor: FANTASY.borderStrong,
                  borderBottomWidth: 3,
                  borderBottomColor: FANTASY.silver,
                  paddingVertical: 12,
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '900', color: FANTASY.inkMuted }}>
                  {cancelLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
