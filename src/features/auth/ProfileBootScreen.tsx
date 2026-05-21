// src/features/auth/ProfileBootScreen.tsx
// Shown during the sign-in prefetch window (lifecycle signInWithProfile).
// After 8s a retry button appears so network errors don't leave users stuck.
import { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';

interface ProfileBootScreenProps {
  loading: boolean;
  onRetry?: () => void;
}

export function ProfileBootScreen({ loading, onRetry }: ProfileBootScreenProps) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowRetry(false);
      return;
    }
    const t = setTimeout(() => setShowRetry(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Image
        source={require('../../../assets/webp/daisy/daisy-standard.webp')}
        style={{ width: 140, height: 140 }}
        resizeMode="contain"
      />
      <ActivityIndicator className="mt-6" />
      <Text className="mt-3 text-foreground font-medium">טוען את הפרופיל שלך…</Text>
      {showRetry && onRetry && (
        <Pressable
          className="mt-6 px-5 py-3 rounded-full bg-accent"
          onPress={onRetry}
        >
          <Text className="text-accent-foreground font-semibold">תקלת רשת — נסו שוב</Text>
        </Pressable>
      )}
    </View>
  );
}
