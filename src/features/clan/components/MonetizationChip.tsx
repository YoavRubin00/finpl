import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MonetizationChipProps {
  label: string;
  onPress: () => void;
}

export function MonetizationChip({ label, onPress }: MonetizationChipProps): React.ReactElement | null {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 4 }}>
      <LinearGradient
        colors={['#fef3c7', '#fde68a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#d4a017',
          paddingHorizontal: 12,
          paddingVertical: 5,
          gap: 6,
        }}
      >
        <Pressable onPress={onPress} hitSlop={4}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e' }}>{label}</Text>
        </Pressable>
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={8}
          style={{ marginStart: 4 }}
        >
          <Text style={{ fontSize: 12, color: '#b45309', fontWeight: '700' }}>✕</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
