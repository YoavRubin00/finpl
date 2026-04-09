import { View } from 'react-native';

const ZERO_SHADOW_OFFSET = { width: 0, height: 0 } as const;

/**
 * Static gold coin icon — consistent currency visual across the app.
 * Pure gold circle with shine highlights, no text symbol.
 */
export function GoldCoinIcon({ size = 22 }: { size?: number }) {
  const r = size / 2;
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: r,
      backgroundColor: '#f5c842',
      borderWidth: size > 16 ? 2 : 1.5,
      borderColor: '#c8960a',
      shadowColor: '#f5c842',
      shadowOpacity: 0.7,
      shadowRadius: 5,
      shadowOffset: ZERO_SHADOW_OFFSET,
      elevation: 4,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* Inner highlight ring */}
      <View style={{
        width: size - 6,
        height: size - 6,
        borderRadius: (size - 6) / 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        backgroundColor: 'transparent',
        position: 'absolute',
      }} />
      {/* Top shine */}
      <View style={{
        position: 'absolute',
        top: 1,
        left: 3,
        right: 3,
        height: size * 0.35,
        borderRadius: size,
        backgroundColor: 'rgba(255,255,255,0.35)',
      }} />
    </View>
  );
}
