import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface GoldRibbonProps {
  label?: string;
}

export function GoldRibbon({ label = 'מומן! 🏆' }: GoldRibbonProps): React.ReactElement {
  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        backgroundColor: 'rgba(212, 160, 23, 0.18)',
        borderWidth: 1.5,
        borderColor: '#d4a017',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <View
        style={{
          backgroundColor: '#d4a017',
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 20,
        }}
      >
        <Text
          style={{
            color: '#0a1628',
            fontWeight: '900',
            fontSize: 14,
            writingDirection: 'rtl',
          }}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}
