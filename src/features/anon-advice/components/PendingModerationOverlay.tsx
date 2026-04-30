import React from 'react';
import { View, Text, Image, Modal } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, useReducedMotion } from 'react-native-reanimated';
import { DUO } from '../../../constants/theme';
import { A } from '../strings';

interface PendingModerationOverlayProps {
  visible: boolean;
}

export function PendingModerationOverlay({ visible }: PendingModerationOverlayProps): React.ReactElement {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (visible && !reduced) {
      scale.value = withRepeat(withTiming(1.08, { duration: 800 }), -1, true);
    } else {
      scale.value = 1;
    }
  }, [visible, reduced, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View
        entering={FadeIn.duration(220)}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 28,
            alignItems: 'center',
            gap: 16,
            maxWidth: 320,
            width: '100%',
          }}
        >
          <Animated.View style={animStyle}>
            <Image
              source={require('../../../../assets/webp/fin-talking-1.webp')}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
          </Animated.View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: DUO.text,
              writingDirection: 'rtl',
              textAlign: 'center',
            }}
          >
            {A.moderationChecking}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: DUO.textMuted,
              writingDirection: 'rtl',
              textAlign: 'center',
              lineHeight: 19,
            }}
          >
            {A.moderationCheckingSub}
          </Text>
          {/* Loading dots */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: DUO.blue,
                  opacity: 0.3 + i * 0.2,
                }}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}