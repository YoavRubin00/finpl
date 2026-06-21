import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

export type CapExceededReason = 'daily-cap' | 'free-trial-over';

interface CapExceededModalProps {
  visible: boolean;
  reason: CapExceededReason;
  onClose: () => void;
  /** Invoked when the user taps the upgrade CTA (only shown for free-trial-over). */
  onUpgrade?: () => void;
}

interface CopyVariant {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
}

const COPY: Record<CapExceededReason, CopyVariant> = {
  'daily-cap': {
    title: 'השארק עייף',
    body: 'הגעת לעשר דקות השיחה היומיות שלך. נדבר שוב מחר!',
    primaryLabel: 'סבבה',
  },
  'free-trial-over': {
    title: 'רוצה להמשיך לדבר עם השארק?',
    body: 'דקת ההתנסות שלך הסתיימה. שדרג לפרו לעוד עשר דקות שיחה ביום + פיצ׳רים מתקדמים.',
    primaryLabel: 'שדרג לפרו',
    secondaryLabel: 'אולי אחר כך',
  },
};

export function CapExceededModal({
  visible,
  reason,
  onClose,
  onUpgrade,
}: CapExceededModalProps): React.ReactElement {
  const copy = COPY[reason];
  const showUpgrade = reason === 'free-trial-over' && !!onUpgrade;

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
            {copy.title}
          </Text>
          <Text style={[RTL, { color: '#cbd5e1', fontSize: 15, lineHeight: 22 }]}>
            {copy.body}
          </Text>
          <Pressable
            onPress={showUpgrade ? onUpgrade : onClose}
            accessibilityRole="button"
            accessibilityLabel={copy.primaryLabel}
            style={{
              marginTop: 4,
              backgroundColor: '#3b82f6',
              paddingHorizontal: 32,
              paddingVertical: 12,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {copy.primaryLabel}
            </Text>
          </Pressable>
          {copy.secondaryLabel ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.secondaryLabel}
              hitSlop={8}
            >
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>
                {copy.secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
